/**
 * Tests the ASYNC layer: the escalation batch flags overdue cases, and
 * the scheduler enqueues it.
 */
@IsTest
private class SlaEscalationBatchTest {

    @IsTest
    static void batchEscalatesOverdueCases() {
        SlaTestData.installPolicies();
        Case c = new Case(Subject = 'Overdue', Service_Tier__c = 'Platinum', Status = 'New');
        insert c;

        // Push the resolution target into the past so the sweep catches it.
        c.Resolution_Target__c = Datetime.now().addHours(-2);
        update c;

        Test.startTest();
        Database.executeBatch(new SlaEscalationBatch(), 200);
        Test.stopTest();

        c = [SELECT SLA_Status__c, Is_Escalated__c, Priority FROM Case WHERE Id = :c.Id];
        System.assertEquals('Resolution Breached', c.SLA_Status__c, 'Sweep flags the breach');
        System.assertEquals(true, c.Is_Escalated__c, 'Sweep escalates the case');
        System.assertEquals('High', c.Priority, 'Sweep raises priority');
    }

    @IsTest
    static void schedulerEnqueuesBatch() {
        SlaTestData.installPolicies();
        Test.startTest();
        String jobId = System.schedule('SLA Sweep Test', '0 0 1 * * ?', new SlaEscalationScheduler());
        Test.stopTest();

        System.assertNotEquals(null,
            [SELECT Id FROM CronTrigger WHERE Id = :jobId], 'Scheduler registered a job');
    }
}
