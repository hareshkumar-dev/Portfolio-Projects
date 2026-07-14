/**
 * Tests the UI controller: seeding, summary, applications, submit, and
 * the audit read.
 */
@IsTest
private class LoanConsoleControllerTest {

    @IsTest
    static void seedsAndSummarises() {
        LoanTestData.installConfig();

        Test.startTest();
        Integer created = LoanConsoleController.seedSampleData();
        Integer again = LoanConsoleController.seedSampleData();
        Test.stopTest();

        System.assertEquals(4, created, 'Seed creates the demo spread');
        System.assertEquals(0, again, 'Second seed is a no-op');

        LoanConsoleController.Summary s = LoanConsoleController.getSummary();
        System.assertEquals(4, s.total, 'All demo apps counted');
        System.assert(s.approved >= 1, 'At least one auto-approval');
        System.assert(s.declined >= 1, 'At least one decline');
        System.assert(s.referred >= 1, 'At least one referral');

        System.assertEquals(4, LoanConsoleController.getApplications().size());
    }

    @IsTest
    static void submitAndReadAudit() {
        LoanTestData.installConfig();
        Loan_Application__c app = LoanTestData.strongApplicant();
        insert app;

        Test.startTest();
        LoanConsoleController.submit(app.Id);
        Test.stopTest();

        List<Decision_Audit__c> audits = LoanConsoleController.getAudits(app.Id);
        System.assertEquals(1, audits.size(), 'Audit visible via the controller');
        System.assertEquals('Auto-Approved', audits[0].Decision__c);
    }
}
