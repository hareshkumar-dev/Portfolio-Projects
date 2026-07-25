/**
 * DunningRetryQueueable — re-attempts collection on a failed invoice.
 * A real payment gateway integration would issue a new charge here; since
 * this portfolio build has no live gateway, the retry simply marks that a
 * new attempt was initiated (Last_Retry_At__c) and waits — the processor's
 * async result arrives the same way the first attempt did, via a new
 * PaymentWebhookService call carrying a fresh External_Payment_Id__c.
 * Chained with System.enqueueJob's delay parameter so retries are spaced
 * out rather than hammering the (simulated) gateway immediately.
 */
public with sharing class DunningRetryQueueable implements Queueable {

    private final Id invoiceId;

    public DunningRetryQueueable(Id invoiceId) {
        this.invoiceId = invoiceId;
    }

    public void execute(QueueableContext context) {
        List<Invoice__c> matches = [
            SELECT Id, Status__c
            FROM Invoice__c
            WHERE Id = :invoiceId
            LIMIT 1
        ];
        if (matches.isEmpty() || matches[0].Status__c != 'Failed') {
            return;
        }

        update new Invoice__c(
            Id = invoiceId,
            Last_Retry_At__c = Datetime.now()
        );
    }

    public static void enqueueRetry(Id invoiceId, Integer delayMinutes) {
        System.enqueueJob(new DunningRetryQueueable(invoiceId), delayMinutes);
    }
}
