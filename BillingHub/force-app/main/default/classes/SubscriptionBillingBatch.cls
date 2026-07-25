/**
 * SubscriptionBillingBatch — the recurring billing run. For every Active
 * subscription due today, it creates a Pending invoice and advances the
 * subscription's next billing date by one month. Payment collection itself
 * happens asynchronously via PaymentWebhookService, mirroring how a real
 * payment processor (Stripe-style) confirms charges out of band.
 */
global with sharing class SubscriptionBillingBatch implements Database.Batchable<SObject> {

    global Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator([
            SELECT Id, Monthly_Amount__c, Next_Billing_Date__c
            FROM Subscription__c
            WHERE Status__c = 'Active' AND Next_Billing_Date__c <= :Date.today()
        ]);
    }

    global void execute(Database.BatchableContext bc, List<Subscription__c> scope) {
        List<Invoice__c> invoices = new List<Invoice__c>();
        List<Subscription__c> toUpdate = new List<Subscription__c>();

        for (Subscription__c sub : scope) {
            invoices.add(new Invoice__c(
                Subscription__c = sub.Id,
                Amount__c = sub.Monthly_Amount__c,
                Status__c = 'Pending',
                Due_Date__c = Date.today(),
                Attempt_Count__c = 0
            ));
            toUpdate.add(new Subscription__c(
                Id = sub.Id,
                Next_Billing_Date__c = sub.Next_Billing_Date__c.addMonths(1)
            ));
        }

        if (!invoices.isEmpty()) {
            insert invoices;
        }
        if (!toUpdate.isEmpty()) {
            update toUpdate;
        }
    }

    global void finish(Database.BatchableContext bc) {
    }
}
