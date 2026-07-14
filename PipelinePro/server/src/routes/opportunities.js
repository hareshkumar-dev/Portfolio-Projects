/**
 * Opportunity (deal) routes.
 *
 * Deals are backed by the standard Salesforce Opportunity object.
 * All routes require authentication; `req.sf` is the caller's
 * Salesforce connection, attached by the requireAuth middleware.
 */
import { Router } from 'express';

const router = Router();

/** GET /api/opportunities — all deals, soonest close date first */
router.get('/', async (req, res) => {
  try {
    const result = await req.sf.query(`
      SELECT Id, Name, Amount, StageName, CloseDate, Probability,
             Account.Name, CreatedDate
      FROM Opportunity
      ORDER BY CloseDate ASC
      LIMIT 200
    `);
    res.json(result.records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/opportunities — create a deal */
router.post('/', async (req, res) => {
  const { name, amount, stage, closeDate } = req.body;

  if (!name || !closeDate) {
    return res.status(400).json({ error: 'Deal name and close date are required.' });
  }

  try {
    const result = await req.sf.sobject('Opportunity').create({
      Name: name,
      Amount: amount || 0,
      StageName: stage || 'Prospecting',
      CloseDate: closeDate,
    });
    console.log(`Created Opportunity ${result.id}`);
    res.status(201).json({ id: result.id, success: result.success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/opportunities/:id — partial update (stage moves, edits) */
router.patch('/:id', async (req, res) => {
  const { name, amount, stage, closeDate } = req.body;

  // Only fields present in the request body are sent to Salesforce
  const updates = { Id: req.params.id };
  if (name !== undefined) updates.Name = name;
  if (amount !== undefined) updates.Amount = amount;
  if (stage !== undefined) updates.StageName = stage;
  if (closeDate !== undefined) updates.CloseDate = closeDate;

  try {
    await req.sf.sobject('Opportunity').update(updates);
    console.log(`Updated Opportunity ${req.params.id}`);
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/opportunities/:id — delete a deal */
router.delete('/:id', async (req, res) => {
  try {
    await req.sf.sobject('Opportunity').destroy(req.params.id);
    console.log(`Deleted Opportunity ${req.params.id}`);
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
