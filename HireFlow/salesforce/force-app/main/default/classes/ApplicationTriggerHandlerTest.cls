/**
 * Tests for ApplicationTriggerHandler.
 *
 * Covers the date-stamping rule and both sides of the openings rule
 * (a hire within capacity succeeds; a hire beyond capacity is blocked),
 * including the bulk case. Salesforce requires test coverage to deploy
 * Apex to production; these tests exercise every branch of the handler.
 */
@isTest
private class ApplicationTriggerHandlerTest {

    private static Job__c makeJob(Integer openings) {
        Job__c job = new Job__c(
            Name = 'Senior React Developer',
            Openings__c = openings,
            Status__c = 'Open'
        );
        insert job;
        return job;
    }

    private static Application__c makeApp(Id jobId, String name, String stage) {
        return new Application__c(
            Job__c = jobId,
            Candidate_Name__c = name,
            Email__c = name.deleteWhitespace() + '@example.com',
            Stage__c = stage
        );
    }

    @isTest
    static void stampsDateOnInsertAndStageChange() {
        Job__c job = makeJob(2);
        Application__c app = makeApp(job.Id, 'Priya Sharma', 'Applied');

        insert app;
        app = [SELECT Stage__c, Stage_Changed_Date__c FROM Application__c WHERE Id = :app.Id];
        System.assertEquals(Date.today(), app.Stage_Changed_Date__c,
            'Stage date should be stamped on insert');

        app.Stage__c = 'Interview';
        update app;
        app = [SELECT Stage_Changed_Date__c FROM Application__c WHERE Id = :app.Id];
        System.assertEquals(Date.today(), app.Stage_Changed_Date__c,
            'Stage date should be re-stamped when the stage changes');
    }

    @isTest
    static void allowsHireWithinOpenings() {
        Job__c job = makeJob(1);
        Application__c app = makeApp(job.Id, 'Arjun Rao', 'Applied');
        insert app;

        app.Stage__c = 'Hired';
        Test.startTest();
        update app;
        Test.stopTest();

        app = [SELECT Stage__c FROM Application__c WHERE Id = :app.Id];
        System.assertEquals('Hired', app.Stage__c, 'A hire within openings should succeed');
    }

    @isTest
    static void blocksHireBeyondOpenings() {
        Job__c job = makeJob(1);
        insert makeApp(job.Id, 'First Candidate', 'Hired'); // fills the single opening

        Application__c second = makeApp(job.Id, 'Second Candidate', 'Applied');
        insert second;
        second.Stage__c = 'Hired';

        Test.startTest();
        Boolean blocked = false;
        try {
            update second;
        } catch (DmlException e) {
            blocked = true;
            System.assert(e.getMessage().contains('Cannot hire'),
                'Error should explain the openings limit');
        }
        Test.stopTest();

        System.assert(blocked, 'Hiring beyond openings must be blocked');
    }

    @isTest
    static void blocksOverHiringInBulk() {
        Job__c job = makeJob(2);
        List<Application__c> apps = new List<Application__c>();
        for (Integer i = 0; i < 5; i++) {
            apps.add(makeApp(job.Id, 'Candidate ' + i, 'Applied'));
        }
        insert apps;

        // Attempt to hire all five into a 2-opening role in one transaction
        for (Application__c a : apps) a.Stage__c = 'Hired';

        Test.startTest();
        Database.SaveResult[] results = Database.update(apps, false); // allOrNone = false
        Test.stopTest();

        Integer succeeded = 0, failed = 0;
        for (Database.SaveResult r : results) {
            if (r.isSuccess()) succeeded++; else failed++;
        }
        System.assert(failed > 0, 'At least some hires beyond capacity should fail');
    }
}
