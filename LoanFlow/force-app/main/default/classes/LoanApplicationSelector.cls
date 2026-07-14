/**
 * LoanApplicationSelector — SELECTOR layer. All Loan_Application__c and
 * Decision_Audit__c SOQL lives here.
 */
public with sharing class LoanApplicationSelector {

    public static List<Loan_Application__c> selectAll() {
        return [
            SELECT Id, Name, Applicant_Name__c, Loan_Amount__c, Term_Months__c,
                   Annual_Income__c, Credit_Score__c, Monthly_Debt__c, Employment_Years__c,
                   Status__c, Risk_Score__c, Decision__c, Decision_Reason__c, Requires_Underwriter__c
            FROM Loan_Application__c
            ORDER BY CreatedDate DESC
            LIMIT 500
        ];
    }

    public static List<Decision_Audit__c> selectAuditsFor(Id applicationId) {
        return [
            SELECT Id, Name, Risk_Score__c, Decision__c, Reason__c, Decided_By__c, Decided_At__c
            FROM Decision_Audit__c
            WHERE Loan_Application__c = :applicationId
            ORDER BY Decided_At__c DESC, CreatedDate DESC
        ];
    }

    public static List<Loan_Application__c> selectDemo() {
        return [
            SELECT Id FROM Loan_Application__c WHERE Applicant_Name__c LIKE '[Demo]%'
        ];
    }
}
