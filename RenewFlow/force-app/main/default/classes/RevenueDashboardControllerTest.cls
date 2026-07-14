/**
 * Tests the UI controller: seed, metrics, renewal activation cascade,
 * and the sweep.
 */
@IsTest
private class RevenueDashboardControllerTest {

    @IsTest
    static void reportsMetrics() {
        RenewTestData.installSettings();
        Customer__c cust = RenewTestData.customer('Acme');

        Test.startTest();
        insert new List<Subscription__c>{
            RenewTestData.subscription(cust.Id, 5000, Date.today().addDays(300), true), // healthy
            RenewTestData.subscription(cust.Id, 1500, Date.today().addDays(30), true),  // due
            RenewTestData.subscription(cust.Id, 800,  Date.today().addDays(45), true),  // due
            RenewTestData.subscription(cust.Id, 1200, Date.today().addDays(200), true)  // healthy
        };
        Test.stopTest();

        MrrService.Metrics m = RevenueDashboardController.getMetrics();
        System.assert(m.totalMrr > 0, 'MRR reported');
        System.assertEquals(m.totalMrr * 12, m.arr, 'ARR is 12x MRR');
        System.assert(m.renewalsDue >= 2, 'Two subs are within the lead window');
        System.assertEquals(4, RevenueDashboardController.getSubscriptions().size());
    }

    @IsTest
    static void activatingRenewalRetiresParent() {
        RenewTestData.installSettings();
        Customer__c cust = RenewTestData.customer('Acme');
        Subscription__c original = RenewTestData.subscription(cust.Id, 1000, Date.today().addDays(30), true);
        insert original;

        // Create a pending renewal pointing at the original
        Subscription__c renewal = RenewTestData.subscription(cust.Id, 1000, Date.today().addMonths(13), true);
        renewal.Status__c = 'Pending Renewal';
        renewal.Renewal_Of__c = original.Id;
        insert renewal;

        Test.startTest();
        RevenueDashboardController.activateRenewal(renewal.Id);
        Test.stopTest();

        System.assertEquals('Active', [SELECT Status__c FROM Subscription__c WHERE Id = :renewal.Id].Status__c);
        System.assertEquals('Renewed', [SELECT Status__c FROM Subscription__c WHERE Id = :original.Id].Status__c,
            'Activating the renewal retires the original');
    }

    @IsTest
    static void runSweepReturnsJobId() {
        RenewTestData.installSettings();
        Customer__c cust = RenewTestData.customer('Acme');
        insert RenewTestData.subscription(cust.Id, 1500, Date.today().addDays(30), true);
        Test.startTest();
        Id jobId = RevenueDashboardController.runRenewalSweep();
        Test.stopTest();
        System.assertNotEquals(null, jobId);
    }
}
