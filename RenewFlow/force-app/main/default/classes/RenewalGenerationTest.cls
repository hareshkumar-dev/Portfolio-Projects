/**
 * Tests renewal generation + churn (service + batch) and the scheduler.
 */
@IsTest
private class RenewalGenerationTest {

    @IsTest
    static void batchGeneratesRenewalForDueSub() {
        RenewTestData.installSettings();
        Customer__c cust = RenewTestData.customer('Acme');
        // Expires in 30 days -> within the 60-day lead window
        insert RenewTestData.subscription(cust.Id, 1000, Date.today().addDays(30), true);

        Test.startTest();
        Database.executeBatch(new RenewalGenerationBatch(), 200);
        Test.stopTest();

        List<Subscription__c> renewals = [SELECT Id, Status__c, Renewal_Of__c FROM Subscription__c WHERE Status__c = 'Pending Renewal'];
        System.assertEquals(1, renewals.size(), 'A renewal was generated');
        System.assertNotEquals(null, renewals[0].Renewal_Of__c, 'Renewal points at the original');

        System.assertEquals(true,
            [SELECT Renewal_Generated__c FROM Subscription__c WHERE Id = :renewals[0].Renewal_Of__c].Renewal_Generated__c,
            'Original marked as generated');
    }

    @IsTest
    static void batchChurnsExpiredSub() {
        RenewTestData.installSettings();
        Customer__c cust = RenewTestData.customer('Globex');
        // Expired 40 days ago, no auto-renew -> churn
        insert RenewTestData.subscription(cust.Id, 1200, Date.today().addDays(-40), false);

        Test.startTest();
        Database.executeBatch(new RenewalGenerationBatch(), 200);
        Test.stopTest();

        System.assertEquals(1, [SELECT COUNT() FROM Subscription__c WHERE Status__c = 'Churned'],
            'Expired non-renewing sub churned');
    }

    @IsTest
    static void healthySubUntouched() {
        RenewTestData.installSettings();
        Customer__c cust = RenewTestData.customer('Initech');
        insert RenewTestData.subscription(cust.Id, 800, Date.today().addMonths(10), true);

        Test.startTest();
        Database.executeBatch(new RenewalGenerationBatch(), 200);
        Test.stopTest();

        System.assertEquals(0, [SELECT COUNT() FROM Subscription__c WHERE Status__c = 'Pending Renewal']);
        System.assertEquals(1, [SELECT COUNT() FROM Subscription__c WHERE Status__c = 'Active']);
    }

    @IsTest
    static void schedulerEnqueues() {
        RenewTestData.installSettings();
        Test.startTest();
        String jobId = System.schedule('Renewal Test', '0 0 4 * * ?', new RenewalGenerationScheduler());
        Test.stopTest();
        System.assertNotEquals(null, [SELECT Id FROM CronTrigger WHERE Id = :jobId]);
    }
}
