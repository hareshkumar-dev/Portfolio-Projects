/**
 * PaymentWebhookService — inbound integration endpoint for a payment
 * processor. External_Payment_Id__c is the idempotency key: a retried or
 * duplicated webhook delivery is detected and safely ignored rather than
 * double-processing a payment. A successful payment marks the invoice
 * Paid; a failed payment increments the attempt count and either kicks off
 * a dunning retry or, after 3 attempts, suspends the subscription. Every
 * call — success, duplicate, or error — is logged to Payment_Event_Log__c.
 */
@RestResource(urlMapping='/billing/payments/*')
global with sharing class PaymentWebhookService {

    private static final Integer MAX_ATTEMPTS = 3;
    private static final Integer RETRY_DELAY_MINUTES = 1;

    @HttpPost
    global static void receivePayment() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        try {
            Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(req.requestBody.toString());
            String externalPaymentId = (String) body.get('externalPaymentId');
            String invoiceId = (String) body.get('invoiceId');
            String outcome = (String) body.get('outcome');
            Object amountRaw = body.get('amount');

            if (String.isBlank(externalPaymentId) || String.isBlank(invoiceId) || String.isBlank(outcome)) {
                logEvent(null, null, 'Error', 400, 'Missing required field: externalPaymentId, invoiceId, or outcome');
                respond(res, 400, new Map<String, Object>{ 'status' => 'error', 'message' => 'Missing required field: externalPaymentId, invoiceId, or outcome' });
                return;
            }

            List<Payment_Event_Log__c> existing = [
                SELECT Id
                FROM Payment_Event_Log__c
                WHERE External_Payment_Id__c = :externalPaymentId
                WITH SECURITY_ENFORCED
                LIMIT 1
            ];
            if (!existing.isEmpty()) {
                // Note: External_Payment_Id__c is unique, so the duplicate's own log entry
                // must use a derived key — reusing the original would violate that constraint.
                logEvent(externalPaymentId + '-dup-' + Datetime.now().getTime(), invoiceId, 'Duplicate', 200, 'Payment event already processed (original id ' + externalPaymentId + '); request ignored (idempotent).');
                respond(res, 200, new Map<String, Object>{ 'status' => 'duplicate', 'externalPaymentId' => externalPaymentId });
                return;
            }

            List<Invoice__c> invoices = [
                SELECT Id, Status__c, Attempt_Count__c, Subscription__c
                FROM Invoice__c
                WHERE Id = :invoiceId
                WITH SECURITY_ENFORCED
                LIMIT 1
            ];
            if (invoices.isEmpty()) {
                // invoiceId doesn't reference a real record — don't attach it to the log's lookup field.
                logEvent(externalPaymentId, null, 'Error', 404, 'Invoice not found: ' + invoiceId);
                respond(res, 404, new Map<String, Object>{ 'status' => 'error', 'message' => 'Invoice not found: ' + invoiceId });
                return;
            }

            Decimal amount = amountRaw != null ? Decimal.valueOf(String.valueOf(amountRaw)) : 0;
            Invoice__c invoice = invoices[0];

            if (outcome == 'succeeded') {
                update new Invoice__c(Id = invoice.Id, Status__c = 'Paid', Paid_Date__c = Date.today());
                logEvent(externalPaymentId, invoiceId, 'Succeeded', 200, 'Payment succeeded; invoice marked Paid.');
                respond(res, 200, new Map<String, Object>{ 'status' => 'succeeded', 'externalPaymentId' => externalPaymentId });
                return;
            }

            Integer attempts = (invoice.Attempt_Count__c == null ? 0 : Integer.valueOf(invoice.Attempt_Count__c)) + 1;
            if (attempts >= MAX_ATTEMPTS) {
                update new Invoice__c(Id = invoice.Id, Status__c = 'Failed', Attempt_Count__c = attempts);
                if (invoice.Subscription__c != null) {
                    update new Subscription__c(Id = invoice.Subscription__c, Status__c = 'Suspended');
                }
                logEvent(externalPaymentId, invoiceId, 'Failed', 200, 'Payment failed on final attempt (' + attempts + '); subscription suspended.');
            } else {
                update new Invoice__c(Id = invoice.Id, Status__c = 'Failed', Attempt_Count__c = attempts);
                DunningRetryQueueable.enqueueRetry(invoice.Id, RETRY_DELAY_MINUTES);
                logEvent(externalPaymentId, invoiceId, 'Failed', 200, 'Payment failed (attempt ' + attempts + ' of ' + MAX_ATTEMPTS + '); dunning retry scheduled.');
            }
            respond(res, 200, new Map<String, Object>{ 'status' => 'failed', 'externalPaymentId' => externalPaymentId, 'attempt' => attempts });

        } catch (Exception e) {
            logEvent(null, null, 'Error', 500, e.getMessage());
            respond(res, 500, new Map<String, Object>{ 'status' => 'error', 'message' => e.getMessage() });
        }
    }

    private static void respond(RestResponse res, Integer statusCode, Map<String, Object> body) {
        res.statusCode = statusCode;
        res.responseBody = Blob.valueOf(JSON.serialize(body));
    }

    private static void logEvent(String externalPaymentId, String invoiceId, String outcome, Integer statusCode, String message) {
        insert new Payment_Event_Log__c(
            External_Payment_Id__c = String.isNotBlank(externalPaymentId) ? externalPaymentId : ('AUTO-' + Datetime.now().getTime()),
            Invoice__c = safeId(invoiceId),
            Outcome__c = outcome,
            Message__c = message,
            Logged_At__c = Datetime.now()
        );
    }

    private static Id safeId(String rawId) {
        if (String.isBlank(rawId)) {
            return null;
        }
        try {
            return (Id) rawId;
        } catch (Exception e) {
            return null;
        }
    }
}
