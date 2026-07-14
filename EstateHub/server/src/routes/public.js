/**
 * Public routes — no visitor login.
 *
 * The property search is the centerpiece: filter values from the query
 * string are turned into a SOQL WHERE clause, safely. Text is escaped,
 * numbers are validated, and picklist values are checked against an
 * allow-list — so no user input is ever trusted in the query.
 *
 * An inquiry creates a standard Salesforce Lead, tying the custom
 * listing data back into Sales Cloud for agents to follow up.
 */
import { Router } from 'express';
import { withServiceConnection, soqlString, isRecordId } from '../salesforce.js';

const router = Router();

const PROPERTY_TYPES = ['Apartment', 'Villa', 'Independent House', 'Plot'];

const PROPERTY_FIELDS = `
  Id, Name, City__c, Address__c, Price__c, Bedrooms__c, Bathrooms__c,
  Area_SqFt__c, Property_Type__c, Listing_Status__c, Description__c,
  Image_URL__c, Featured__c
`;

/** Map a Salesforce Property__c record to the API shape */
function shapeProperty(p) {
  return {
    id: p.Id,
    title: p.Name,
    city: p.City__c,
    address: p.Address__c,
    price: p.Price__c || 0,
    bedrooms: p.Bedrooms__c || 0,
    bathrooms: p.Bathrooms__c || 0,
    area: p.Area_SqFt__c || 0,
    type: p.Property_Type__c,
    status: p.Listing_Status__c,
    description: p.Description__c,
    imageUrl: p.Image_URL__c,
    featured: p.Featured__c,
  };
}

/**
 * Build a parameterized-ish WHERE clause from filter inputs.
 * Every value is validated or escaped; unknown inputs are ignored.
 */
function buildWhere(query) {
  const clauses = ["Listing_Status__c != 'Sold'"];

  if (query.city) {
    clauses.push(`City__c LIKE '%${soqlString(query.city)}%'`);
  }
  if (query.type && PROPERTY_TYPES.includes(query.type)) {
    clauses.push(`Property_Type__c = '${soqlString(query.type)}'`);
  }
  const minPrice = Number(query.minPrice);
  if (Number.isFinite(minPrice) && minPrice > 0) {
    clauses.push(`Price__c >= ${Math.floor(minPrice)}`);
  }
  const maxPrice = Number(query.maxPrice);
  if (Number.isFinite(maxPrice) && maxPrice > 0) {
    clauses.push(`Price__c <= ${Math.floor(maxPrice)}`);
  }
  const minBeds = Number(query.bedrooms);
  if (Number.isFinite(minBeds) && minBeds > 0) {
    clauses.push(`Bedrooms__c >= ${Math.floor(minBeds)}`);
  }

  return clauses.join(' AND ');
}

/**
 * GET /api/public/properties
 * Query: city, type, minPrice, maxPrice, bedrooms, sort
 */
router.get('/properties', async (req, res) => {
  const sortMap = {
    priceAsc: 'Price__c ASC',
    priceDesc: 'Price__c DESC',
    newest: 'CreatedDate DESC',
  };
  const orderBy = sortMap[req.query.sort] || 'Featured__c DESC, CreatedDate DESC';

  try {
    const properties = await withServiceConnection(async (conn) => {
      const where = buildWhere(req.query);
      const result = await conn.query(`
        SELECT ${PROPERTY_FIELDS}
        FROM Property__c
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT 200
      `);
      return result.records.map(shapeProperty);
    });
    res.json(properties);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** GET /api/public/properties/cities — distinct cities for the filter dropdown */
router.get('/properties/cities', async (_req, res) => {
  try {
    const cities = await withServiceConnection(async (conn) => {
      const result = await conn.query(`
        SELECT City__c city, COUNT(Id) cnt
        FROM Property__c
        WHERE City__c != null AND Listing_Status__c != 'Sold'
        GROUP BY City__c
        ORDER BY City__c ASC
      `);
      return result.records.map((r) => r.city).filter(Boolean);
    });
    res.json(cities);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** GET /api/public/properties/:id — a single listing */
router.get('/properties/:id', async (req, res) => {
  if (!isRecordId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid property ID.' });
  }
  try {
    const property = await withServiceConnection(async (conn) => {
      const result = await conn.query(`
        SELECT ${PROPERTY_FIELDS} FROM Property__c
        WHERE Id = '${soqlString(req.params.id)}' LIMIT 1
      `);
      return result.records[0] ? shapeProperty(result.records[0]) : null;
    });
    if (!property) return res.status(404).json({ error: 'Property not found.' });
    res.json(property);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/public/properties/:id/inquire
 * Body: { name, email, phone, message }
 *
 * Creates a standard Salesforce Lead for the agent to follow up.
 */
router.post('/properties/:id/inquire', async (req, res) => {
  const propertyId = req.params.id;
  const { name, email, phone, message } = req.body;

  if (!isRecordId(propertyId)) {
    return res.status(400).json({ error: 'Invalid property ID.' });
  }
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  try {
    const outcome = await withServiceConnection(async (conn) => {
      const propResult = await conn.query(`
        SELECT Id, Name, City__c FROM Property__c
        WHERE Id = '${soqlString(propertyId)}' LIMIT 1
      `);
      const property = propResult.records[0];
      if (!property) return { status: 404, error: 'Property not found.' };

      // Salesforce Lead requires a Company; use the buyer's name for
      // an individual enquiry, mirroring common real-estate practice.
      const [firstName, ...rest] = name.trim().split(/\s+/);
      const lastName = rest.length ? rest.join(' ') : firstName;

      const created = await conn.sobject('Lead').create({
        FirstName: rest.length ? firstName : '',
        LastName: lastName,
        Company: `${name} (Individual Buyer)`,
        Email: email,
        Phone: phone || '',
        LeadSource: 'Web',
        Property_Interest__c: `${property.Name}${property.City__c ? ' — ' + property.City__c : ''}`,
        Description: message || `Enquiry about ${property.Name}.`,
      });
      console.log(`Inquiry from "${name}" for ${property.Name} -> Lead ${created.id}`);
      return { status: 201, body: { id: created.id, success: true } };
    });

    if (outcome.error) return res.status(outcome.status).json({ error: outcome.error });
    res.status(outcome.status).json(outcome.body);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
