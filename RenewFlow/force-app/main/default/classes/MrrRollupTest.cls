/**
 * Tests the financial roll-up: Customer MRR/count track active
 * subscriptions across insert, status change, and delete.
 */
@IsTest
private class MrrRollupTest {

    @IsTest
    static void rollsUpOnInsert() {
        RenewTestData.installSettings();
        Customer__c cust = RenewTestData.customer('Acme');

        Test.startTest();
        insert new List<Subscription__c>{
            RenewTestData.subscription(cust.Id, 1000, Date.today().addMonths(6), true),
            RenewTestData.subscription(cust.Id, 500, Date.today().addMonths(6), true)
        };
        Test.stopTest();

        cust = [SELECT Total_MRR__c, Active_Subscriptions__c FROM Customer__c WHERE Id = :cust.Id];
        System.assertEquals(1500, cust.Total_MRR__c, 'MRR summed from active subs');
        System.assertEquals(2, cust.Active_Subscriptions__c);
    }

    @IsTest
    static void churnedSubDropsOutOfRollup() {
        RenewTestData.installSettings();
        Customer__c cust = RenewTestData.customer('Globex');
        Subscription__c s = RenewTestData.subscription(cust.Id, 2000, Date.today().addMonths(6), true);
        insert s;
        System.assertEquals(2000, [SELECT Total_MRR__c FROM Customer__c WHERE Id = :cust.Id].Total_MRR__c);

        Test.startTest();
        s.Status__c = 'Churned';
        update s;
        Test.stopTest();

        cust = [SELECT Total_MRR__c, Active_Subscriptions__c FROM Customer__c WHERE Id = :cust.Id];
        System.assertEquals(0, cust.Total_MRR__c, 'Churned MRR removed');
        System.assertEquals(0, cust.Active_Subscriptions__c);
    }

    @IsTest
    static void deleteRecalculates() {
        RenewTestData.installSettings();
        Customer__c cust = RenewTestData.customer('Initech');
        Subscription__c s = RenewTestData.subscription(cust.Id, 900, Date.today().addMonths(6), true);
        insert s;

        Test.startTest();
        delete s;
        Test.stopTest();

        System.assertEquals(0, [SELECT Total_MRR__c FROM Customer__c WHERE Id = :cust.Id].Total_MRR__c,
            'Roll-up recalculated after delete');
    }
}
