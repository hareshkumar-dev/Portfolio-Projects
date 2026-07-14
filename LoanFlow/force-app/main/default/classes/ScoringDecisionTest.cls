/**
 * Unit tests for the SERVICE layer — scoring and decisioning, pure and
 * DML-free (config is injected).
 */
@IsTest
private class ScoringDecisionTest {

    @IsTest
    static void strongApplicantScoresHigh() {
        LoanTestData.installConfig();
        Decimal score = ScoringService.score(LoanTestData.strongApplicant());
        System.assert(score >= 70, 'Strong applicant should score in the auto-approve band, got ' + score);
    }

    @IsTest
    static void weakApplicantScoresLow() {
        LoanTestData.installConfig();
        Decimal score = ScoringService.score(LoanTestData.weakApplicant());
        System.assert(score < 40, 'Weak applicant should score in the decline band, got ' + score);
    }

    @IsTest
    static void dtiHandlesZeroIncome() {
        Loan_Application__c a = new Loan_Application__c(Annual_Income__c = 0, Monthly_Debt__c = 500);
        System.assertEquals(1, ScoringService.dti(a), 'Unknown income is treated as worst-case DTI');
    }

    @IsTest
    static void decideAutoApproves() {
        LoanTestData.installConfig();
        DecisionService.Outcome o = DecisionService.decide(85, 200000);
        System.assertEquals('Auto-Approved', o.decision);
        System.assertEquals('Approved', o.status);
        System.assertEquals(false, o.requiresUnderwriter);
    }

    @IsTest
    static void decideDeclines() {
        LoanTestData.installConfig();
        DecisionService.Outcome o = DecisionService.decide(25, 100000);
        System.assertEquals('Declined', o.decision);
    }

    @IsTest
    static void decideRefersMidBand() {
        LoanTestData.installConfig();
        DecisionService.Outcome o = DecisionService.decide(55, 100000);
        System.assertEquals('Referred', o.decision);
        System.assertEquals(true, o.requiresUnderwriter);
    }

    @IsTest
    static void largeAmountAlwaysRefers() {
        LoanTestData.installConfig();
        DecisionService.Outcome o = DecisionService.decide(95, 600000); // high score, big loan
        System.assertEquals('Referred', o.decision, 'Amount override forces referral');
    }
}
