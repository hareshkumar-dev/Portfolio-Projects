@isTest
private class DunningRetryQueueableTest {

    @isTest
    static void testRetryStampsLastRetryOnFailedInvoice() {
        Subscription__c sub = new Subscription__c(
            Customer_Name__c = 'Acme Co',
            Plan_Name__c = 'Starter',
            Monthly_Amount__c = 49,
            Status__c = 'Active',
            Start_Date__c = Date.today(),
            Next_Billing_Date__c = Date.today().addMonths(1)
        );
        insert sub;

        Invoice__c inv = new Invoice__c(
            Subscription__c = sub.Id,
            Amount__c = 49,
            Status__c = 'Failed',
            Due_Date__c = Date.today(),
            Attempt_Count__c = 1
        );
        insert inv;

        Test.startTest();
        DunningRetryQueueable.enqueueRetry(inv.Id, 0);
        Test.stopTest();

        Invoice__c after = [SELECT Last_Retry_At__c FROM Invoice__c WHERE Id = :inv.Id];
        System.assertNotEquals(null, after.Last_Retry_At__c);
    }

    @isTest
    static void testRetrySkipsAlreadyResolvedInvoice() {
        Subscription__c sub = new Subscription__c(
            Customer_Name__c = 'Beta Co',
            Plan_Name__c = 'Starter',
            Monthly_Amount__c = 49,
            Status__c = 'Active',
            Start_Date__c = Date.today(),
            Next_Billing_Date__c = Date.today().addMonths(1)
        );
        insert sub;

        Invoice__c inv = new Invoice__c(
            Subscription__c = sub.Id,
            Amount__c = 49,
            Status__c = 'Paid',
            Due_Date__c = Date.today(),
            Paid_Date__c = Date.today(),
            Attempt_Count__c = 0
        );
        insert inv;

        Test.startTest();
        DunningRetryQueueable.enqueueRetry(inv.Id, 0);
        Test.stopTest();

        Invoice__c after = [SELECT Last_Retry_At__c FROM Invoice__c WHERE Id = :inv.Id];
        System.assertEquals(null, after.Last_Retry_At__c);
    }
}
