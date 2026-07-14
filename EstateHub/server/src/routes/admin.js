/**
 * Admin routes — agent console.
 *
 * All routes require an authenticated session; `req.sf` is the agent's
 * own Salesforce connection, attached by requireAuth. Agents manage
 * the property catalog and review inbound inquiries (Web leads).
 */
import { Router } from 'express';
import { soqlString } from '../salesforce.js';

const router = Router();

/** GET /api/admin/properties — full catalog, including sold listings */
router.get('/properties', async (req, res) => {
  try {
    const result = await req.sf.query(`
      SELECT Id, Name, City__c, Price__c, Bedrooms__c, Bathrooms__c, Area_SqFt__c,
             Property_Type__c, Listing_Status__c, Image_URL__c, Featured__c, CreatedDate
      FROM Property__c
      ORDER BY CreatedDate DESC
      LIMIT 500
    `);
    res.json(result.records.map((p) => ({
      id: p.Id,
      title: p.Name,
      city: p.City__c,
      price: p.Price__c || 0,
      bedrooms: p.Bedrooms__c || 0,
      bathrooms: p.Bathrooms__c || 0,
      area: p.Area_SqFt__c || 0,
      type: p.Property_Type__c,
      status: p.Listing_Status__c,
      imageUrl: p.Image_URL__c,
      featured: p.Featured__c,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Shared field mapping for create/update */
function toRecord(body) {
  const record = {};
  if (body.title !== undefined) record.Name = body.title;
  if (body.city !== undefined) record.City__c = body.city;
  if (body.address !== undefined) record.Address__c = body.address;
  if (body.price !== undefined) record.Price__c = Number(body.price) || 0;
  if (body.bedrooms !== undefined) record.Bedrooms__c = Number(body.bedrooms) || 0;
  if (body.bathrooms !== undefined) record.Bathrooms__c = Number(body.bathrooms) || 0;
  if (body.area !== undefined) record.Area_SqFt__c = Number(body.area) || 0;
  if (body.type !== undefined) record.Property_Type__c = body.type;
  if (body.status !== undefined) record.Listing_Status__c = body.status;
  if (body.description !== undefined) record.Description__c = body.description;
  if (body.imageUrl !== undefined) record.Image_URL__c = body.imageUrl;
  if (body.featured !== undefined) record.Featured__c = Boolean(body.featured);
  return record;
}

/** POST /api/admin/properties — list a new property */
router.post('/properties', async (req, res) => {
  if (!req.body.title) {
    return res.status(400).json({ error: 'Property title is required.' });
  }
  try {
    const result = await req.sf.sobject('Property__c').create({
      Listing_Status__c: 'Available',
      Property_Type__c: 'Apartment',
      ...toRecord(req.body),
    });
    console.log(`Created Property ${result.id}`);
    res.status(201).json({ id: result.id, success: result.success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/admin/properties/:id — update a property */
router.patch('/properties/:id', async (req, res) => {
  try {
    await req.sf.sobject('Property__c').update({ Id: req.params.id, ...toRecord(req.body) });
    console.log(`Updated Property ${req.params.id}`);
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/admin/properties/:id — remove a property */
router.delete('/properties/:id', async (req, res) => {
  try {
    await req.sf.sobject('Property__c').destroy(req.params.id);
    console.log(`Deleted Property ${req.params.id}`);
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/admin/inquiries — web leads raised from listings */
router.get('/inquiries', async (req, res) => {
  try {
    const result = await req.sf.query(`
      SELECT Id, Name, Email, Phone, Property_Interest__c, Description, Status, CreatedDate
      FROM Lead
      WHERE LeadSource = 'Web' AND Property_Interest__c != null AND IsConverted = false
      ORDER BY CreatedDate DESC
      LIMIT 200
    `);
    res.json(result.records.map((l) => ({
      id: l.Id,
      name: l.Name,
      email: l.Email,
      phone: l.Phone,
      property: l.Property_Interest__c,
      message: l.Description,
      status: l.Status,
      createdAt: l.CreatedDate,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
