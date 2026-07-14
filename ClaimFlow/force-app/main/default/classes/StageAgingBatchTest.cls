/**
 * Tests the ASYNC layer: the aging batch flags stalled claims, and the
 * scheduler enqueues it.
 */
@IsTest
private class StageAgingBatchTest {

    @IsTest
    static void flagsStalledClaims() {
        ClaimTestData.installConfig();
        Claim__c c = ClaimTestData.claim('Auto', 'Medium', 100000);
        insert c;

        // Back-date the stage entry beyond the stall threshold.
        update new Claim__c(Id = c.Id, Stage_Changed_At__c = Datetime.now().addDays(-10));

        Test.startTest();
        Database.executeBatch(new StageAgingBatch(), 200);
        Test.stopTest();

        System.assertEquals(true, [SELECT Is_Stalled__c FROM Claim__c WHERE Id = :c.Id].Is_Stalled__c,
            'Old claim flagged as stalled');
    }

    @IsTest
    static void freshClaimNotFlagged() {
        ClaimTestData.installConfig();
        Claim__c c = ClaimTestData.claim('Auto', 'Medium', 100000);
        insert c; // Stage entry stamped as now

        Test.startTest();
        Database.executeBatch(new StageAgingBatch(), 200);
        Test.stopTest();

        System.assertEquals(false, [SELECT Is_Stalled__c FROM Claim__c WHERE Id = :c.Id].Is_Stalled__c,
            'A fresh claim is not stalled');
    }

    @IsTest
    static void schedulerEnqueues() {
        ClaimTestData.installConfig();
        Test.startTest();
        String jobId = System.schedule('Claim Aging Test', '0 0 3 * * ?', new StageAgingScheduler());
        Test.stopTest();
        System.assertNotEquals(null, [SELECT Id FROM CronTrigger WHERE Id = :jobId]);
    }
}
