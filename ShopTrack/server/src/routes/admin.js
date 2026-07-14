/**
 * Admin routes — store operator console.
 *
 * All routes require an authenticated session; `req.sf` is the
 * operator's own Salesforce connection, attached by requireAuth.
 */
import { Router } from 'express';
import { soqlString, getStandardPricebookId } from '../salesforce.js';
import { shapeOrder } from './public.js';

const router = Router();

const FULFILLMENT_STAGES = ['Placed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];

/** GET /api/admin/orders — every storefront order, newest first */
router.get('/orders', async (req, res) => {
  try {
    const result = await req.sf.query(`
      SELECT Id, OrderNumber, TotalAmount, Fulfillment_Status__c,
             Customer_Name__c, Customer_Email__c, CreatedDate,
             (SELECT Id, Quantity, UnitPrice, PricebookEntry.Product2.Name
              FROM OrderItems)
      FROM Order
      WHERE Customer_Email__c != null
      ORDER BY CreatedDate DESC
      LIMIT 200
    `);
    res.json(result.records.map(shapeOrder));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/admin/orders/:id — advance fulfillment status */
router.patch('/orders/:id', async (req, res) => {
  const { status } = req.body;
  if (!FULFILLMENT_STAGES.includes(status)) {
    return res.status(400).json({ error: 'Invalid fulfillment status.' });
  }
  try {
    await req.sf.sobject('Order').update({
      Id: req.params.id,
      Fulfillment_Status__c: status,
    });
    console.log(`Order ${req.params.id} -> ${status}`);
    res.json({ id: req.params.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/admin/products — catalog management view */
router.get('/products', async (req, res) => {
  try {
    const pricebookId = await getStandardPricebookId(req.sf);
    const result = await req.sf.query(`
      SELECT Id, UnitPrice, Product2.Name, Product2.ProductCode, Product2.Family
      FROM PricebookEntry
      WHERE Pricebook2Id = '${soqlString(pricebookId)}' AND IsActive = true
      ORDER BY Product2.Name ASC
    `);
    res.json(result.records.map((e) => ({
      pricebookEntryId: e.Id,
      name: e.Product2?.Name,
      code: e.Product2?.ProductCode,
      family: e.Product2?.Family,
      price: e.UnitPrice,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
