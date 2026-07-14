/**
 * Public routes — no shopper login.
 *
 * Served through the integration-user connection. This is where the
 * commerce data model comes together:
 *
 *   Product2 ── PricebookEntry ──┐
 *                                 ├─► Order ──< OrderItem
 *   Account ──────────────────────┘
 *
 * Placing an order is a multi-object transaction: one Order header
 * plus one OrderItem per cart line, validated and priced server-side.
 */
import { Router } from 'express';
import {
  withServiceConnection, soqlString, isRecordId,
  getStandardPricebookId, getStorefrontAccountId,
} from '../salesforce.js';

const router = Router();

/**
 * GET /api/public/catalog
 * The product catalog is the set of active PricebookEntry rows on the
 * standard price book, joined to their Product2.
 */
router.get('/catalog', async (_req, res) => {
  try {
    const products = await withServiceConnection(async (conn) => {
      const pricebookId = await getStandardPricebookId(conn);
      const result = await conn.query(`
        SELECT Id, UnitPrice, Product2Id, Product2.Name,
               Product2.Description, Product2.ProductCode, Product2.Family
        FROM PricebookEntry
        WHERE Pricebook2Id = '${soqlString(pricebookId)}'
          AND IsActive = true
          AND Product2.IsActive = true
        ORDER BY Product2.Name ASC
        LIMIT 200
      `);
      return result.records.map((e) => ({
        pricebookEntryId: e.Id,
        productId: e.Product2Id,
        name: e.Product2?.Name,
        description: e.Product2?.Description,
        code: e.Product2?.ProductCode,
        family: e.Product2?.Family,
        price: e.UnitPrice,
      }));
    });
    res.json(products);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/public/orders
 * Body: { customer: { name, email }, items: [{ pricebookEntryId, quantity }] }
 *
 * Creates an Order and its OrderItems in one server-side transaction.
 * Prices are re-read from Salesforce — the client never sets them.
 */
router.post('/orders', async (req, res) => {
  const { customer, items } = req.body;

  if (!customer?.name || !customer?.email) {
    return res.status(400).json({ error: 'Customer name and email are required.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }
  for (const item of items) {
    if (!isRecordId(item.pricebookEntryId) || !(item.quantity > 0)) {
      return res.status(400).json({ error: 'Invalid cart item.' });
    }
  }

  try {
    const result = await withServiceConnection(async (conn) => {
      const pricebookId = await getStandardPricebookId(conn);
      const accountId = await getStorefrontAccountId(conn);

      // Re-price from Salesforce so the client can't tamper with prices
      const ids = items.map((i) => `'${soqlString(i.pricebookEntryId)}'`).join(',');
      const priced = await conn.query(`
        SELECT Id, UnitPrice, Product2.Name
        FROM PricebookEntry
        WHERE Id IN (${ids}) AND Pricebook2Id = '${soqlString(pricebookId)}'
      `);
      const priceMap = Object.fromEntries(
        priced.records.map((p) => [p.Id, { price: p.UnitPrice, name: p.Product2?.Name }])
      );

      // Every requested entry must exist on the standard price book
      const missing = items.find((i) => !priceMap[i.pricebookEntryId]);
      if (missing) return { status: 400, error: 'A product in your cart is no longer available.' };

      // 1) Order header (Draft; storefront stage tracked on the custom field)
      const today = new Date().toISOString().slice(0, 10);
      const order = await conn.sobject('Order').create({
        AccountId: accountId,
        Pricebook2Id: pricebookId,
        EffectiveDate: today,
        Status: 'Draft',
        Fulfillment_Status__c: 'Placed',
        Customer_Name__c: customer.name,
        Customer_Email__c: customer.email,
      });
      if (!order.success) throw new Error('Failed to create order.');

      // 2) One OrderItem per cart line, inserted together
      const lineItems = items.map((i) => ({
        OrderId: order.id,
        PricebookEntryId: i.pricebookEntryId,
        Quantity: i.quantity,
        UnitPrice: priceMap[i.pricebookEntryId].price,
      }));
      const itemResults = await conn.sobject('OrderItem').create(lineItems);
      const failed = [].concat(itemResults).find((r) => !r.success);
      if (failed) {
        // Roll back the header so we don't leave an empty order behind
        await conn.sobject('Order').destroy(order.id);
        throw new Error('Failed to add items to the order.');
      }

      const total = items.reduce(
        (sum, i) => sum + priceMap[i.pricebookEntryId].price * i.quantity, 0
      );
      console.log(`Placed order ${order.id} (${items.length} lines, $${total})`);
      return { status: 201, body: { id: order.id, total, success: true } };
    });

    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(result.status).json(result.body);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /api/public/orders?email=...
 * A shopper's own order history, looked up by the email they checked
 * out with (stored on Order.Customer_Email__c).
 */
router.get('/orders', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const orders = await withServiceConnection(async (conn) => {
      const result = await conn.query(`
        SELECT Id, OrderNumber, TotalAmount, Fulfillment_Status__c,
               Customer_Name__c, EffectiveDate, CreatedDate,
               (SELECT Id, Quantity, UnitPrice, PricebookEntry.Product2.Name
                FROM OrderItems)
        FROM Order
        WHERE Customer_Email__c = '${soqlString(email)}'
        ORDER BY CreatedDate DESC
        LIMIT 50
      `);
      return result.records.map(shapeOrder);
    });
    res.json(orders);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** Map a Salesforce Order (with OrderItems subquery) to the API shape */
export function shapeOrder(o) {
  return {
    id: o.Id,
    number: o.OrderNumber,
    total: o.TotalAmount || 0,
    status: o.Fulfillment_Status__c,
    customerName: o.Customer_Name__c,
    customerEmail: o.Customer_Email__c,
    placedOn: o.CreatedDate,
    items: (o.OrderItems?.records || []).map((li) => ({
      id: li.Id,
      name: li.PricebookEntry?.Product2?.Name,
      quantity: li.Quantity,
      unitPrice: li.UnitPrice,
    })),
  };
}

export default router;
