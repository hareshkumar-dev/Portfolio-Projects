/**
 * Admin routes — recruiter console.
 *
 * All routes require an authenticated session; `req.sf` is the
 * recruiter's own Salesforce connection, attached by requireAuth.
 *
 * Note: advancing an application to "Hired" beyond a job's openings is
 * rejected by the Apex trigger in Salesforce — this API surfaces that
 * error to the client rather than enforcing the rule itself.
 */
import { Router } from 'express';
import { soqlString, isRecordId } from '../salesforce.js';

const router = Router();

const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];

/** GET /api/admin/jobs — all jobs with applicant + hired counts */
router.get('/jobs', async (req, res) => {
  try {
    const [jobs, byStage] = await Promise.all([
      req.sf.query(`
        SELECT Id, Name, Department__c, Location__c, Openings__c, Status__c, Description__c,
               (SELECT Id FROM Applications__r)
        FROM Job__c
        ORDER BY CreatedDate DESC
        LIMIT 200
      `),
      req.sf.query(`
        SELECT Job__c jobId, COUNT(Id) cnt
        FROM Application__c
        WHERE Stage__c = 'Hired'
        GROUP BY Job__c
      `),
    ]);

    const hiredMap = Object.fromEntries(byStage.records.map((r) => [r.jobId, r.cnt]));

    res.json(jobs.records.map((j) => ({
      id: j.Id,
      title: j.Name,
      department: j.Department__c,
      location: j.Location__c,
      openings: j.Openings__c || 0,
      status: j.Status__c,
      description: j.Description__c,
      applicants: j.Applications__r?.totalSize || 0,
      hired: hiredMap[j.Id] || 0,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/admin/jobs — create a job opening */
router.post('/jobs', async (req, res) => {
  const { title, department, location, openings, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Job title is required.' });
  }

  try {
    const result = await req.sf.sobject('Job__c').create({
      Name: title,
      Department__c: department || '',
      Location__c: location || '',
      Openings__c: Number(openings) || 1,
      Status__c: 'Open',
      Description__c: description || '',
    });
    console.log(`Created Job ${result.id}`);
    res.status(201).json({ id: result.id, success: result.success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/admin/jobs/:id — update a job */
router.patch('/jobs/:id', async (req, res) => {
  const { title, department, location, openings, status, description } = req.body;

  const updates = { Id: req.params.id };
  if (title !== undefined) updates.Name = title;
  if (department !== undefined) updates.Department__c = department;
  if (location !== undefined) updates.Location__c = location;
  if (openings !== undefined) updates.Openings__c = Number(openings) || 0;
  if (status !== undefined) updates.Status__c = status;
  if (description !== undefined) updates.Description__c = description;

  try {
    await req.sf.sobject('Job__c').update(updates);
    console.log(`Updated Job ${req.params.id}`);
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/admin/jobs/:id — delete a job (cascades to applications) */
router.delete('/jobs/:id', async (req, res) => {
  try {
    await req.sf.sobject('Job__c').destroy(req.params.id);
    console.log(`Deleted Job ${req.params.id}`);
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/admin/jobs/:id/applications — the applicant pipeline */
router.get('/jobs/:id/applications', async (req, res) => {
  if (!isRecordId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid job ID.' });
  }

  try {
    const result = await req.sf.query(`
      SELECT Id, Name, Candidate_Name__c, Email__c, Phone__c, Stage__c,
             Stage_Changed_Date__c, Cover_Note__c, CreatedDate
      FROM Application__c
      WHERE Job__c = '${soqlString(req.params.id)}'
      ORDER BY CreatedDate ASC
      LIMIT 500
    `);
    res.json(result.records.map((a) => ({
      id: a.Id,
      number: a.Name,
      name: a.Candidate_Name__c,
      email: a.Email__c,
      phone: a.Phone__c,
      stage: a.Stage__c,
      stageChangedOn: a.Stage_Changed_Date__c,
      coverNote: a.Cover_Note__c,
      appliedOn: a.CreatedDate,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/admin/applications/:id — move an application to a new stage.
 * The Apex trigger may reject a move to "Hired" if the job is full; that
 * error is passed straight back to the client.
 */
router.patch('/applications/:id', async (req, res) => {
  const { stage } = req.body;
  if (!STAGES.includes(stage)) {
    return res.status(400).json({ error: 'Invalid stage.' });
  }

  try {
    await req.sf.sobject('Application__c').update({ Id: req.params.id, Stage__c: stage });
    console.log(`Application ${req.params.id} -> ${stage}`);
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    // Trigger errors (e.g. over-hiring) arrive here as a 400-worthy message
    const message = err.message || 'Could not update the application.';
    const isTriggerBlock = /Cannot hire|FIELD_CUSTOM_VALIDATION|openings/i.test(message);
    res.status(isTriggerBlock ? 409 : 500).json({ error: cleanError(message) });
  }
});

/** DELETE /api/admin/applications/:id — remove an application */
router.delete('/applications/:id', async (req, res) => {
  try {
    await req.sf.sobject('Application__c').destroy(req.params.id);
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Strip Salesforce's error-code prefixes for a cleaner client message */
function cleanError(message) {
  return message.replace(/^[A-Z_]+:\s*/, '').replace(/:\s*\[\]$/, '').trim();
}

export default router;
