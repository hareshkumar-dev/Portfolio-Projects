@isTest
private class RevOpsControllerTest {

    private static Id createInvoice(Decimal subAmount, String invoiceStatus) {
        Subscription__c sub = new Subscription__c(
            Customer_Name__c = 'Test Co',
            Plan_Name__c = 'Growth',
            Monthly_Amount__c = subAmount,
            Status__c = 'Active',
            Start_Date__c = Date.today().addMonths(-4),
            Next_Billing_Date__c = Date.today().addMonths(1)
        );
        insert sub;

        Invoice__c inv = new Invoice__c(
            Subscription__c = sub.Id,
            Amount__c = subAmount,
            Status__c = invoiceStatus,
            Due_Date__c = Date.today()
        );
        insert inv;
        return inv.Id;
    }

    @isTest
    static void testGetSummary() {
        createInvoice(299, 'Failed');
        insert new Payment_Event_Log__c(External_Payment_Id__c = 'PAY-1', Outcome__c = 'Failed', Message__c = 'card declined', Logged_At__c = Datetime.now());

        Test.startTest();
        RevOpsController.Summary s = RevOpsController.getSummary();
        Test.stopTest();

        System.assertEquals(299, s.mrr);
        System.assertEquals(1, s.activeDunning);
        System.assertEquals(1, s.failedPaymentsToday);
    }

    @isTest
    static void testGetRecentInvoicesAndSnapshot() {
        Id invId = createInvoice(149, 'Pending');

        Test.startTest();
        List<Invoice__c> invoices = RevOpsController.getRecentInvoices();
        Invoice__c snapshot = RevOpsController.getInvoiceSnapshot(invId);
        Test.stopTest();

        System.assertEquals(1, invoices.size());
        System.assertEquals(149, snapshot.Amount__c);
    }

    @isTest
    static void testSmallRefundAutoApproves() {
        Id invId = createInvoice(80, 'Paid');

        Test.startTest();
        Id refundId = RevOpsController.submitRefundRequest(invId, 50, 'Customer changed their mind.');
        Test.stopTest();

        Refund_Request__c refund = [SELECT Approval_Status__c FROM Refund_Request__c WHERE Id = :refundId];
        System.assertEquals('Approved', refund.Approval_Status__c);
        Invoice__c inv = [SELECT Status__c FROM Invoice__c WHERE Id = :invId];
        System.assertEquals('Refunded', inv.Status__c);
    }

    @isTest
    static void testLargeRefundRequiresApproval() {
        Id invId = createInvoice(500, 'Paid');

        Test.startTest();
        Id refundId = RevOpsController.submitRefundRequest(invId, 500, 'Service outage — full refund requested.');
        Test.stopTest();

        Refund_Request__c refund = [SELECT Approval_Status__c FROM Refund_Request__c WHERE Id = :refundId];
        System.assertEquals('Pending', refund.Approval_Status__c);
        System.assertEquals(1, RevOpsController.getPendingRefunds().size());
    }

    @isTest
    static void testDecideRefundApprove() {
        Id invId = createInvoice(500, 'Paid');
        Id refundId = RevOpsController.submitRefundRequest(invId, 500, 'Full refund requested.');

        Test.startTest();
        RevOpsController.decideRefund(refundId, true, 'Approved per policy exception.');
        Test.stopTest();

        Refund_Request__c refund = [SELECT Approval_Status__c FROM Refund_Request__c WHERE Id = :refundId];
        System.assertEquals('Approved', refund.Approval_Status__c);
        Invoice__c inv = [SELECT Status__c FROM Invoice__c WHERE Id = :invId];
        System.assertEquals('Refunded', inv.Status__c);
    }

    @isTest
    static void testDecideRefundReject() {
        Id invId = createInvoice(500, 'Paid');
        Id refundId = RevOpsController.submitRefundRequest(invId, 500, 'Full refund requested.');

        Test.startTest();
        RevOpsController.decideRefund(refundId, false, 'Outside refund window.');
        Test.stopTest();

        Refund_Request__c refund = [SELECT Approval_Status__c FROM Refund_Request__c WHERE Id = :refundId];
        System.assertEquals('Rejected', refund.Approval_Status__c);
        Invoice__c inv = [SELECT Status__c FROM Invoice__c WHERE Id = :invId];
        System.assertEquals('Paid', inv.Status__c);
    }

    @isTest
    static void testCanceledSubscriptionsAndChurnInsights() {
        Subscription__c sub = new Subscription__c(
            Customer_Name__c = 'Churned Co',
            Plan_Name__c = 'Starter',
            Monthly_Amount__c = 49,
            Status__c = 'Canceled',
            Start_Date__c = Date.today().addMonths(-2),
            Next_Billing_Date__c = Date.today(),
            Cancel_Reason__c = 'Switching to a competitor.'
        );
        insert sub;
        insert new Churn_Insight__c(Subscription__c = sub.Id, Risk_Level__c = 'High', Analysis__c = 'Price sensitive.', Recommended_Action__c = 'Offer discount.');

        Test.startTest();
        List<Subscription__c> canceled = RevOpsController.getCanceledSubscriptions();
        List<Churn_Insight__c> insights = RevOpsController.getChurnInsights();
        Test.stopTest();

        System.assertEquals(1, canceled.size());
        System.assertEquals(1, insights.size());
    }

    @isTest
    static void testAnalyzeChurnSurfacesRealErrorAndSavesNothing() {
        Subscription__c sub = new Subscription__c(
            Customer_Name__c = 'Test Churn Co',
            Plan_Name__c = 'Starter',
            Monthly_Amount__c = 49,
            Status__c = 'Canceled',
            Start_Date__c = Date.today().addMonths(-1),
            Next_Billing_Date__c = Date.today(),
            Cancel_Reason__c = 'No longer needed.'
        );
        insert sub;

        GeminiCalloutService.simulateMissingKeyForTest = true;

        Test.startTest();
        try {
            RevOpsController.analyzeChurn(sub.Id);
            System.assert(false, 'Expected an AuraHandledException.');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('not configured'));
        }
        Test.stopTest();

        System.assertEquals(0, [SELECT COUNT() FROM Churn_Insight__c WHERE Subscription__c = :sub.Id]);
    }
}
