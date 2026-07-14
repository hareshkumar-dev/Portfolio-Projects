/**
 * Ticket routes.
 *
 * Tickets are backed by the standard Salesforce Case object. All routes
 * require authentication; `req.sf` is the caller's Salesforce connection,
 * attached by the requireAuth middleware.
 */
import { Router } from 'express';

const router = Router();

/** GET /api/tickets — list tickets, newest first */
router.get('/', async (req, res) => {
  try {
    const result = await req.sf.query(`
      SELECT Id, CaseNumber, Subject, Description, Status, Priority, CreatedDate
      FROM Case
      ORDER BY CreatedDate DESC
      LIMIT 100
    `);
    res.json(result.records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/tickets — create a ticket */
router.post('/', async (req, res) => {
  const { subject, description, priority } = req.body;

  if (!subject) {
    return res.status(400).json({ error: 'Subject is required.' });
  }

  try {
    const result = await req.sf.sobject('Case').create({
      Subject: subject,
      Description: description || '',
      Priority: priority || 'Medium',
      Status: 'New',
      Origin: 'Web',
    });
    console.log(`Created Case ${result.id}`);
    res.status(201).json({ id: result.id, success: result.success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/tickets/:id — partial update */
router.patch('/:id', async (req, res) => {
  const { subject, description, priority, status } = req.body;

  // Only fields present in the request body are sent to Salesforce
  const updates = { Id: req.params.id };
  if (subject !== undefined) updates.Subject = subject;
  if (description !== undefined) updates.Description = description;
  if (priority !== undefined) updates.Priority = priority;
  if (status !== undefined) updates.Status = status;

  try {
    await req.sf.sobject('Case').update(updates);
    console.log(`Updated Case ${req.params.id}`);
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/tickets/:id — delete a ticket */
router.delete('/:id', async (req, res) => {
  try {
    await req.sf.sobject('Case').destroy(req.params.id);
    console.log(`Deleted Case ${req.params.id}`);
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
