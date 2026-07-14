/**
 * Tests the UI layer controller: seeding, summary, open-case list, and
 * the on-demand escalation.
 */
@IsTest
private class SlaConsoleControllerTest {

    @IsTest
    static void seedsAndSummarises() {
        SlaTestData.installPolicies();

        Test.startTest();
        Integer created = SlaConsoleController.seedSampleData();
        Integer again = SlaConsoleController.seedSampleData();
        Test.stopTest();

        System.assertEquals(6, created, 'Seed creates the demo case mix');
        System.assertEquals(0, again, 'Second seed is a no-op');

        SlaConsoleController.Summary s = SlaConsoleController.getSummary();
        System.assertEquals(6, s.open, 'All demo cases are open');
        System.assert(SlaConsoleController.getOpenCases().size() == 6, 'Console lists open cases');
    }

    @IsTest
    static void runEscalationFlagsSeededBreaches() {
        SlaTestData.installPolicies();
        SlaConsoleController.seedSampleData(); // includes cases pushed past target

        Test.startTest();
        Id jobId = SlaConsoleController.runEscalationNow();
        Test.stopTest();

        System.assertNotEquals(null, jobId, 'Escalation batch enqueued');

        Integer breached = [SELECT COUNT() FROM Case WHERE SLA_Status__c = 'Resolution Breached'];
        System.assert(breached >= 1, 'The sweep flags the seeded overdue cases');
    }
}
