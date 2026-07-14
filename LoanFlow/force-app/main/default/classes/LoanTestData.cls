/**
 * Test utility: injects scoring weights and the decision policy so tests
 * don't depend on Custom Metadata rows (which can't be inserted).
 */
@IsTest
public class LoanTestData {

    public static void installConfig() {
        ScoringConfigService.setTestWeights(new List<ScoringConfigService.Weight>{
            new ScoringConfigService.Weight('Credit_Score', 40),
            new ScoringConfigService.Weight('DTI_Ratio', 25),
            new ScoringConfigService.Weight('Income', 20),
            new ScoringConfigService.Weight('Employment_Years', 15)
        });

        DecisionPolicyService.Policy p = new DecisionPolicyService.Policy();
        p.autoApproveScore = 70;
        p.autoDeclineScore = 40;
        p.manualReviewAmount = 500000;
        DecisionPolicyService.setTestPolicy(p);
    }

    public static Loan_Application__c strongApplicant() {
        return new Loan_Application__c(
            Applicant_Name__c = 'Strong', Loan_Amount__c = 250000, Term_Months__c = 60,
            Annual_Income__c = 180000, Credit_Score__c = 800, Monthly_Debt__c = 1000, Employment_Years__c = 8);
    }

    public static Loan_Application__c weakApplicant() {
        return new Loan_Application__c(
            Applicant_Name__c = 'Weak', Loan_Amount__c = 120000, Term_Months__c = 36,
            Annual_Income__c = 40000, Credit_Score__c = 560, Monthly_Debt__c = 2000, Employment_Years__c = 1);
    }
}
