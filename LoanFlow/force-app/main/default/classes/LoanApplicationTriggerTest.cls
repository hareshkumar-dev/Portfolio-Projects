/**
 * Integration test: submitting an application drives scoring, the
 * decision, and the Decision_Audit__c trail — end to end through the
 * trigger framework and Unit of Work.
 */
@IsTest
private class LoanApplicationTriggerTest {

    @IsTest
    static void submittingStrongApplicantAutoApproves() {
        LoanTestData.installConfig();
        Loan_Application__c app = LoanTestData.strongApplicant();
        insert app; // Draft

        Test.startTest();
        app.Status__c = 'Submitted';
        update app;
        Test.stopTest();

        app = [SELECT Status__c, Decision__c, Risk_Score__c FROM Loan_Application__c WHERE Id = :app.Id];
        System.assertEquals('Auto-Approved', app.Decision__c, 'Strong applicant auto-approved');
        System.assertEquals('Approved', app.Status__c);
        System.assert(app.Risk_Score__c >= 70, 'Score persisted');

        Integer audits = [SELECT COUNT() FROM Decision_Audit__c WHERE Loan_Application__c = :app.Id];
        System.assertEquals(1, audits, 'A decision audit was recorded');
    }

    @IsTest
    static void submittingWeakApplicantDeclines() {
        LoanTestData.installConfig();
        Loan_Application__c app = LoanTestData.weakApplicant();
        insert app;

        Test.startTest();
        app.Status__c = 'Submitted';
        update app;
        Test.stopTest();

        app = [SELECT Decision__c, Status__c FROM Loan_Application__c WHERE Id = :app.Id];
        System.assertEquals('Declined', app.Decision__c, 'Weak applicant declined');
        System.assertEquals('Declined', app.Status__c);
    }

    @IsTest
    static void largeLoanIsReferred() {
        LoanTestData.installConfig();
        Loan_Application__c app = LoanTestData.strongApplicant();
        app.Loan_Amount__c = 750000; // over the manual-review threshold
        insert app;

        Test.startTest();
        app.Status__c = 'Submitted';
        update app;
        Test.stopTest();

        app = [SELECT Decision__c, Requires_Underwriter__c FROM Loan_Application__c WHERE Id = :app.Id];
        System.assertEquals('Referred', app.Decision__c, 'Large loan referred regardless of score');
        System.assertEquals(true, app.Requires_Underwriter__c);
    }

    @IsTest
    static void insertDefaultsStatusAndDecision() {
        LoanTestData.installConfig();
        Loan_Application__c app = new Loan_Application__c(Applicant_Name__c = 'Defaults', Loan_Amount__c = 100000);
        insert app;
        app = [SELECT Status__c, Decision__c FROM Loan_Application__c WHERE Id = :app.Id];
        System.assertEquals('Draft', app.Status__c);
        System.assertEquals('Pending', app.Decision__c);
    }
}
