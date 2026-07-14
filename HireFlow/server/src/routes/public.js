/**
 * Public routes — no candidate login.
 *
 * Served through the integration-user connection: the open jobs list
 * and the application form. Submitting an application inserts an
 * Application__c — at which point the Apex trigger in Salesforce
 * stamps the stage date automatically.
 */
import { Router } from 'express';
import { withServiceConnection, soqlString, isRecordId } from '../salesforce.js';

const router = Router();

/** GET /api/public/jobs — open roles that still have seats, with a live application count */
router.get('/jobs', async (_req, res) => {
  try {
    const jobs = await withServiceConnection(async (conn) => {
      const result = await conn.query(`
        SELECT Id, Name, Department__c, Location__c, Openings__c, Description__c,
               (SELECT Id, Stage__c FROM Applications__r)
        FROM Job__c
        WHERE Status__c = 'Open'
        ORDER BY CreatedDate DESC
        LIMIT 100
      `);
      return result.records
        .map((j) => {
          const applications = j.Applications__r?.records || [];
          const openings = j.Openings__c || 0;
          const hired = applications.filter((a) => a.Stage__c === 'Hired').length;
          return {
            id: j.Id,
            title: j.Name,
            department: j.Department__c,
            location: j.Location__c,
            openings,
            hired,
            description: j.Description__c,
            applicants: applications.length,
          };
        })
        // Hide roles whose seats are all filled — once hired >= openings the
        // role drops off the public careers page (recruiters still see it).
        .filter((j) => !(j.openings > 0 && j.hired >= j.openings));
    });
    res.json(jobs);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/public/jobs/:id/apply
 * Body: { name, email, phone, coverNote }
 */
router.post('/jobs/:id/apply', async (req, res) => {
  const jobId = req.params.id;
  const { name, email, phone, coverNote } = req.body;

  if (!isRecordId(jobId)) {
    return res.status(400).json({ error: 'Invalid job ID.' });
  }
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  try {
    const outcome = await withServiceConnection(async (conn) => {
      // Confirm the role is still open before accepting an application
      const jobResult = await conn.query(`
        SELECT Id, Name, Status__c FROM Job__c WHERE Id = '${soqlString(jobId)}' LIMIT 1
      `);
      const job = jobResult.records[0];
      if (!job) return { status: 404, error: 'Job not found.' };
      if (job.Status__c !== 'Open') {
        return { status: 409, error: 'This role is no longer accepting applications.' };
      }

      // Reject a duplicate application from the same email
      const dup = await conn.query(`
        SELECT Id FROM Application__c
        WHERE Job__c = '${soqlString(jobId)}' AND Email__c = '${soqlString(email)}'
        LIMIT 1
      `);
      if (dup.records.length > 0) {
        return { status: 409, error: 'You have already applied for this role.' };
      }

      const created = await conn.sobject('Application__c').create({
        Job__c: jobId,
        Candidate_Name__c: name,
        Email__c: email,
        Phone__c: phone || '',
        Cover_Note__c: coverNote || '',
        Stage__c: 'Applied',
      });
      console.log(`Application from "${name}" for ${job.Name} (${created.id})`);
      return { status: 201, body: { id: created.id, success: true } };
    });

    if (outcome.error) return res.status(outcome.status).json({ error: outcome.error });
    res.status(outcome.status).json(outcome.body);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
