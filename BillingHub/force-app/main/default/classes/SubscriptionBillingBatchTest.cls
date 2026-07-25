@isTest
private class SubscriptionBillingBatchTest {

    @TestSetup
    static void setup() {
        insert new Subscription__c(
            Customer_Name__c = 'Northwind Traders',
            Plan_Name__c = 'Growth',
            Monthly_Amount__c = 299,
            Status__c = 'Active',
            Start_Date__c = Date.today().addMonths(-3),
            Next_Billing_Date__c = Date.today()
        );
    }

    @isTest
    static void testBillingRunCreatesInvoiceAndAdvancesDate() {
        Subscription__c sub = [SELECT Id, Next_Billing_Date__c FROM Subscription__c LIMIT 1];
        Date originalNextBilling = sub.Next_Billing_Date__c;

        Test.startTest();
        Database.executeBatch(new SubscriptionBillingBatch(), 200);
        Test.stopTest();

        List<Invoice__c> invoices = [SELECT Id, Amount__c, Status__c FROM Invoice__c WHERE Subscription__c = :sub.Id];
        System.assertEquals(1, invoices.size());
        System.assertEquals(299, invoices[0].Amount__c);
        System.assertEquals('Pending', invoices[0].Status__c);

        Subscription__c updated = [SELECT Next_Billing_Date__c FROM Subscription__c WHERE Id = :sub.Id];
        System.assertEquals(originalNextBilling.addMonths(1), updated.Next_Billing_Date__c);
    }

    @isTest
    static void testSubscriptionNotDueIsSkipped() {
        Subscription__c futureSub = new Subscription__c(
            Customer_Name__c = 'Future Corp',
            Plan_Name__c = 'Starter',
            Monthly_Amount__c = 99,
            Status__c = 'Active',
            Start_Date__c = Date.today(),
            Next_Billing_Date__c = Date.today().addDays(10)
        );
        insert futureSub;

        Test.startTest();
        Database.executeBatch(new SubscriptionBillingBatch(), 200);
        Test.stopTest();

        System.assertEquals(0, [SELECT COUNT() FROM Invoice__c WHERE Subscription__c = :futureSub.Id]);
    }
}
