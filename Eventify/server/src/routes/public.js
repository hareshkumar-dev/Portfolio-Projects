/**
 * Public routes — no visitor login.
 *
 * Served through the integration-user connection. Business rules
 * (capacity limits, duplicate registrations) are enforced here so
 * they hold no matter what the client sends.
 */
import { Router } from 'express';
import { withServiceConnection, soqlString, isRecordId } from '../salesforce.js';

const router = Router();

/** Registration counts per event, in one aggregate query */
async function registrationCounts(conn, eventIds) {
  if (eventIds.length === 0) return {};
  const idList = eventIds.map((id) => `'${soqlString(id)}'`).join(',');
  const result = await conn.query(`
    SELECT Event__c eventId, COUNT(Id) cnt
    FROM Registration__c
    WHERE Event__c IN (${idList})
    GROUP BY Event__c
  `);
  return Object.fromEntries(result.records.map((r) => [r.eventId, r.cnt]));
}

/** GET /api/public/events — upcoming events with seat availability */
router.get('/events', async (_req, res) => {
  try {
    const events = await withServiceConnection(async (conn) => {
      const result = await conn.query(`
        SELECT Id, Name, Event_Date__c, Location__c, Capacity__c, Description__c
        FROM Event__c
        WHERE Event_Date__c >= TODAY
        ORDER BY Event_Date__c ASC
        LIMIT 100
      `);
      const counts = await registrationCounts(conn, result.records.map((e) => e.Id));

      return result.records.map((e) => ({
        id: e.Id,
        name: e.Name,
        date: e.Event_Date__c,
        location: e.Location__c,
        capacity: e.Capacity__c || 0,
        description: e.Description__c,
        registered: counts[e.Id] || 0,
      }));
    });
    res.json(events);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/public/events/:id/register
 * Body: { name, email }
 *
 * Validates capacity and duplicate email server-side before creating
 * the Registration__c record.
 */
router.post('/events/:id/register', async (req, res) => {
  const eventId = req.params.id;
  const { name, email } = req.body;

  if (!isRecordId(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID.' });
  }
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  try {
    const outcome = await withServiceConnection(async (conn) => {
      const eventResult = await conn.query(`
        SELECT Id, Name, Capacity__c
        FROM Event__c
        WHERE Id = '${soqlString(eventId)}'
        LIMIT 1
      `);
      const event = eventResult.records[0];
      if (!event) return { status: 404, error: 'Event not found.' };

      const counts = await registrationCounts(conn, [eventId]);
      const registered = counts[eventId] || 0;

      if (event.Capacity__c && registered >= event.Capacity__c) {
        return { status: 409, error: 'This event is sold out.' };
      }

      const duplicate = await conn.query(`
        SELECT Id FROM Registration__c
        WHERE Event__c = '${soqlString(eventId)}'
          AND Email__c = '${soqlString(email)}'
        LIMIT 1
      `);
      if (duplicate.records.length > 0) {
        return { status: 409, error: 'This email is already registered for this event.' };
      }

      const created = await conn.sobject('Registration__c').create({
        Event__c: eventId,
        Attendee_Name__c: name,
        Email__c: email,
      });
      console.log(`Registered "${name}" for ${event.Name} (${created.id})`);
      return { status: 201, body: { id: created.id, success: true } };
    });

    if (outcome.error) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.status(outcome.status).json(outcome.body);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
