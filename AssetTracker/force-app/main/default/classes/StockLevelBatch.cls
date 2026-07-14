/**
 * StockLevelBatch
 *
 * Nightly stock-level scan. Walks every Stock_Item__c in batches and
 * classifies each one against its reorder point:
 *
 *   quantity <= 0                 -> Out of Stock
 *   quantity <= reorder point     -> Low Stock
 *   otherwise                     -> In Stock
 *
 * It stamps Stock_Status__c, Needs_Reorder__c and Last_Checked__c, and
 * on completion emails a reorder summary to whoever ran the job.
 *
 * Implemented as Database.Batchable so it scales to any catalog size,
 * and Database.Stateful so the counts survive across execute() chunks
 * for the finish() summary.
 */
public with sharing class StockLevelBatch implements Database.Batchable<SObject>, Database.Stateful {

    private Integer lowCount = 0;
    private Integer outCount = 0;
    private List<String> reorderLines = new List<String>();

    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator([
            SELECT Id, Name, SKU__c, Quantity_On_Hand__c, Reorder_Point__c,
                   Stock_Status__c, Needs_Reorder__c
            FROM Stock_Item__c
        ]);
    }

    public void execute(Database.BatchableContext bc, List<Stock_Item__c> scope) {
        for (Stock_Item__c item : scope) {
            Decimal qty = item.Quantity_On_Hand__c == null ? 0 : item.Quantity_On_Hand__c;
            Decimal reorder = item.Reorder_Point__c == null ? 0 : item.Reorder_Point__c;

            String status;
            if (qty <= 0) {
                status = 'Out of Stock';
                outCount++;
            } else if (qty <= reorder) {
                status = 'Low Stock';
                lowCount++;
            } else {
                status = 'In Stock';
            }

            item.Stock_Status__c = status;
            item.Needs_Reorder__c = (status != 'In Stock');
            item.Last_Checked__c = System.now();

            if (item.Needs_Reorder__c) {
                reorderLines.add(item.Name + ' (' + item.SKU__c + '): ' + qty + ' on hand');
            }
        }
        update scope;
    }

    public void finish(Database.BatchableContext bc) {
        if (reorderLines.isEmpty()) return;

        // Email a reorder summary to the user who ran the batch.
        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setTargetObjectId(UserInfo.getUserId());
        mail.setSaveAsActivity(false);
        mail.setSubject(
            'Stock alert: ' + reorderLines.size() + ' item(s) need reordering'
        );
        mail.setPlainTextBody(
            'The nightly stock scan found items at or below their reorder point:\n\n' +
            String.join(reorderLines, '\n') +
            '\n\nLow stock: ' + lowCount + '  |  Out of stock: ' + outCount
        );

        try {
            Messaging.sendEmail(new List<Messaging.SingleEmailMessage>{ mail });
        } catch (Exception e) {
            // Email failures (e.g. deliverability off in a scratch org) shouldn't fail the job
            System.debug('Reorder email not sent: ' + e.getMessage());
        }
    }
}
