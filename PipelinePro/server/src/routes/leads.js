/**
 * Lead routes.
 *
 * Leads are captured from the web form and worked until they are
 * converted. Conversion uses the Salesforce SOAP convertLead call,
 * which creates the Account, Contact and (optionally) Opportunity
 * in a single transaction — the standard Sales Cloud flow.
 */
import { Router } from 'express';

const router = Router();

/** GET /api/leads — unconverted leads, newest first */
router.get('/', async (req, res) => {
  try {
    const result = await req.sf.query(`
      SELECT Id, FirstName, LastName, Company, Email, Phone, Status, CreatedDate
      FROM Lead
      WHERE IsConverted = false
      ORDER BY CreatedDate DESC
      LIMIT 200
    `);
    res.json(result.records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/leads — capture a new lead */
router.post('/', async (req, res) => {
  const { firstName, lastName, company, email, phone } = req.body;

  if (!lastName || !company) {
    return res.status(400).json({ error: 'Last name and company are required.' });
  }

  try {
    const result = await req.sf.sobject('Lead').create({
      FirstName: firstName || '',
      LastName: lastName,
      Company: company,
      Email: email || '',
      Phone: phone || '',
      LeadSource: 'Web',
    });
    console.log(`Created Lead ${result.id}`);
    res.status(201).json({ id: result.id, success: result.success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/leads/:id — update lead status */
router.patch('/:id', async (req, res) => {
  const { status } = req.body;

  try {
    await req.sf.sobject('Lead').update({ Id: req.params.id, Status: status });
    console.log(`Updated Lead ${req.params.id}`);
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/leads/:id — remove a lead */
router.delete('/:id', async (req, res) => {
  try {
    await req.sf.sobject('Lead').destroy(req.params.id);
    console.log(`Deleted Lead ${req.params.id}`);
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/leads/:id/convert — convert a lead
 *
 * Creates an Account + Contact and an Opportunity named after the
 * lead's company, mirroring the native "Convert" action in Salesforce.
 */
router.post('/:id/convert', async (req, res) => {
  try {
    // The org defines which status marks a converted lead
    const statusResult = await req.sf.query(
      'SELECT MasterLabel FROM LeadStatus WHERE IsConverted = true LIMIT 1'
    );
    const convertedStatus = statusResult.records[0]?.MasterLabel;

    const result = await req.sf.soap.convertLead({
      leadId: req.params.id,
      convertedStatus,
    });

    if (!result.success) {
      const message = result.errors?.[0]?.message || 'Lead conversion failed.';
      return res.status(400).json({ error: message });
    }

    console.log(`Converted Lead ${req.params.id} -> Opportunity ${result.opportunityId}`);
    res.json({
      success: true,
      accountId: result.accountId,
      contactId: result.contactId,
      opportunityId: result.opportunityId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
