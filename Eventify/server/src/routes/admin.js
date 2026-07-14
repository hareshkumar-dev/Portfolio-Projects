/**
 * Admin routes — event and attendee management.
 *
 * All routes require an authenticated session; `req.sf` is the
 * admin's own Salesforce connection, attached by requireAuth.
 */
import { Router } from 'express';
import { soqlString, isRecordId } from '../salesforce.js';

const router = Router();

/** GET /api/admin/events — all events with registration/check-in counts */
router.get('/events', async (req, res) => {
  try {
    const [events, counts, checkins] = await Promise.all([
      req.sf.query(`
        SELECT Id, Name, Event_Date__c, Location__c, Capacity__c, Description__c
        FROM Event__c
        ORDER BY Event_Date__c DESC NULLS LAST
        LIMIT 200
      `),
      req.sf.query(`
        SELECT Event__c eventId, COUNT(Id) cnt
        FROM Registration__c
        GROUP BY Event__c
      `),
      req.sf.query(`
        SELECT Event__c eventId, COUNT(Id) cnt
        FROM Registration__c
        WHERE Checked_In__c = true
        GROUP BY Event__c
      `),
    ]);

    const countMap = Object.fromEntries(counts.records.map((r) => [r.eventId, r.cnt]));
    const checkinMap = Object.fromEntries(checkins.records.map((r) => [r.eventId, r.cnt]));

    res.json(
      events.records.map((e) => ({
        id: e.Id,
        name: e.Name,
        date: e.Event_Date__c,
        location: e.Location__c,
        capacity: e.Capacity__c || 0,
        description: e.Description__c,
        registered: countMap[e.Id] || 0,
        checkedIn: checkinMap[e.Id] || 0,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/admin/events — create an event */
router.post('/events', async (req, res) => {
  const { name, date, location, capacity, description } = req.body;

  if (!name || !date) {
    return res.status(400).json({ error: 'Event name and date are required.' });
  }

  try {
    const result = await req.sf.sobject('Event__c').create({
      Name: name,
      Event_Date__c: date,
      Location__c: location || '',
      Capacity__c: Number(capacity) || 0,
      Description__c: description || '',
    });
    console.log(`Created Event ${result.id}`);
    res.status(201).json({ id: result.id, success: result.success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/admin/events/:id — update an event */
router.patch('/events/:id', async (req, res) => {
  const { name, date, location, capacity, description } = req.body;

  const updates = { Id: req.params.id };
  if (name !== undefined) updates.Name = name;
  if (date !== undefined) updates.Event_Date__c = date;
  if (location !== undefined) updates.Location__c = location;
  if (capacity !== undefined) updates.Capacity__c = Number(capacity) || 0;
  if (description !== undefined) updates.Description__c = description;

  try {
    await req.sf.sobject('Event__c').update(updates);
    console.log(`Updated Event ${req.params.id}`);
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/admin/events/:id — delete an event.
 * Registrations are removed automatically by the master-detail
 * cascade delete.
 */
router.delete('/events/:id', async (req, res) => {
  try {
    await req.sf.sobject('Event__c').destroy(req.params.id);
    console.log(`Deleted Event ${req.params.id}`);
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/admin/events/:id/registrations — attendee list */
router.get('/events/:id/registrations', async (req, res) => {
  if (!isRecordId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid event ID.' });
  }

  try {
    const result = await req.sf.query(`
      SELECT Id, Name, Attendee_Name__c, Email__c, Checked_In__c, CreatedDate
      FROM Registration__c
      WHERE Event__c = '${soqlString(req.params.id)}'
      ORDER BY CreatedDate ASC
      LIMIT 500
    `);
    res.json(
      result.records.map((r) => ({
        id: r.Id,
        number: r.Name,
        name: r.Attendee_Name__c,
        email: r.Email__c,
        checkedIn: r.Checked_In__c,
        createdAt: r.CreatedDate,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/admin/registrations/:id — toggle check-in */
router.patch('/registrations/:id', async (req, res) => {
  try {
    await req.sf.sobject('Registration__c').update({
      Id: req.params.id,
      Checked_In__c: Boolean(req.body.checkedIn),
    });
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/admin/registrations/:id — remove an attendee */
router.delete('/registrations/:id', async (req, res) => {
  try {
    await req.sf.sobject('Registration__c').destroy(req.params.id);
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
