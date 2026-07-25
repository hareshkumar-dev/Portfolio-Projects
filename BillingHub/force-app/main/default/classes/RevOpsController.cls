/**
 * RevOpsController — UI layer for the revOpsConsole LWC: KPI summary,
 * recent invoices (the live board, refreshed on each CDC event), pending
 * refund requests with an approve/reject action, and canceled
 * subscriptions awaiting a churn-risk analysis. Refund approval is
 * gated here in Apex rather than a native declarative Approval Process,
 * keeping this portfolio build's scope tight while still demonstrating
 * authorization-gated exception handling above a dollar threshold.
 */
public with sharing class RevOpsController {

    private static final Decimal AUTO_APPROVE_THRESHOLD = 100;

    public class Summary {
        @AuraEnabled public Decimal mrr;
        @AuraEnabled public Integer failedPaymentsToday;
        @AuraEnabled public Integer activeDunning;
        @AuraEnabled public Integer pendingRefunds;
    }

    @AuraEnabled(cacheable=true)
    public static Summary getSummary() {
        Datetime startOfToday = Datetime.newInstance(Date.today(), Time.newInstance(0, 0, 0, 0));

        Summary s = new Summary();
        Decimal totalMrr = 0;
        for (AggregateResult ar : [
            SELECT SUM(Monthly_Amount__c) total
            FROM Subscription__c
            WHERE Status__c = 'Active'
        ]) {
            totalMrr = (Decimal) ar.get('total');
        }
        s.mrr = totalMrr == null ? 0 : totalMrr;
        s.failedPaymentsToday = [SELECT COUNT() FROM Payment_Event_Log__c WHERE Outcome__c = 'Failed' AND Logged_At__c >= :startOfToday];
        s.activeDunning = [SELECT COUNT() FROM Invoice__c WHERE Status__c = 'Failed'];
        s.pendingRefunds = [SELECT COUNT() FROM Refund_Request__c WHERE Approval_Status__c = 'Pending'];
        return s;
    }

    @AuraEnabled(cacheable=true)
    public static List<Invoice__c> getRecentInvoices() {
        return [
            SELECT Id, Name, Amount__c, Status__c, Attempt_Count__c, Due_Date__c, Subscription__r.Customer_Name__c
            FROM Invoice__c
            WITH SECURITY_ENFORCED
            ORDER BY CreatedDate DESC
            LIMIT 25
        ];
    }

    @AuraEnabled
    public static Invoice__c getInvoiceSnapshot(Id invoiceId) {
        List<Invoice__c> matches = [
            SELECT Id, Name, Amount__c, Status__c, Attempt_Count__c, Due_Date__c, Subscription__r.Customer_Name__c
            FROM Invoice__c
            WHERE Id = :invoiceId
            WITH SECURITY_ENFORCED
            LIMIT 1
        ];
        return matches.isEmpty() ? null : matches[0];
    }

    @AuraEnabled(cacheable=true)
    public static List<Refund_Request__c> getPendingRefunds() {
        return [
            SELECT Id, Name, Amount__c, Reason__c, Approval_Status__c, Invoice__r.Name
            FROM Refund_Request__c
            WHERE Approval_Status__c = 'Pending'
            WITH SECURITY_ENFORCED
            ORDER BY CreatedDate ASC
            LIMIT 25
        ];
    }

    @AuraEnabled
    public static Id submitRefundRequest(Id invoiceId, Decimal amount, String reason) {
        Refund_Request__c req = new Refund_Request__c(
            Invoice__c = invoiceId,
            Amount__c = amount,
            Reason__c = reason,
            Approval_Status__c = amount <= AUTO_APPROVE_THRESHOLD ? 'Approved' : 'Pending'
        );
        insert req;

        if (req.Approval_Status__c == 'Approved') {
            update new Invoice__c(Id = invoiceId, Status__c = 'Refunded');
        }
        return req.Id;
    }

    @AuraEnabled
    public static void decideRefund(Id refundRequestId, Boolean approve, String notes) {
        Refund_Request__c refund = [
            SELECT Id, Invoice__c, Approval_Status__c
            FROM Refund_Request__c
            WHERE Id = :refundRequestId
            WITH SECURITY_ENFORCED
            LIMIT 1
        ];
        if (refund.Approval_Status__c != 'Pending') {
            return;
        }

        update new Refund_Request__c(
            Id = refundRequestId,
            Approval_Status__c = approve ? 'Approved' : 'Rejected',
            Decision_Notes__c = notes
        );

        if (approve && refund.Invoice__c != null) {
            update new Invoice__c(Id = refund.Invoice__c, Status__c = 'Refunded');
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Subscription__c> getCanceledSubscriptions() {
        return [
            SELECT Id, Name, Customer_Name__c, Plan_Name__c, Cancel_Reason__c
            FROM Subscription__c
            WHERE Status__c = 'Canceled'
            WITH SECURITY_ENFORCED
            ORDER BY CreatedDate DESC
            LIMIT 25
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Churn_Insight__c> getChurnInsights() {
        return [
            SELECT Id, Subscription__c, Risk_Level__c, Analysis__c, Recommended_Action__c
            FROM Churn_Insight__c
            WITH SECURITY_ENFORCED
            ORDER BY CreatedDate DESC
            LIMIT 25
        ];
    }

    @AuraEnabled
    public static Churn_Insight__c analyzeChurn(Id subscriptionId) {
        try {
            return ChurnInsightService.analyze(subscriptionId);
        } catch (Exception e) {
            AuraHandledException ex = new AuraHandledException(e.getMessage());
            ex.setMessage(e.getMessage());
            throw ex;
        }
    }
}
