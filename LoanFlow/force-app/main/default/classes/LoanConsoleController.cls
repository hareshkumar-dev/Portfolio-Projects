/**
 * LoanConsoleController — UI layer for the loanConsole LWC.
 * Reads via the selector; submitting an application drives the
 * underwriting pipeline through the trigger.
 */
public with sharing class LoanConsoleController {

    public class Summary {
        @AuraEnabled public Integer total;
        @AuraEnabled public Integer approved;
        @AuraEnabled public Integer referred;
        @AuraEnabled public Integer declined;
    }

    @AuraEnabled(cacheable=true)
    public static List<Loan_Application__c> getApplications() {
        return LoanApplicationSelector.selectAll();
    }

    @AuraEnabled(cacheable=true)
    public static Summary getSummary() {
        Summary s = new Summary();
        s.total = 0; s.approved = 0; s.referred = 0; s.declined = 0;
        for (Loan_Application__c a : LoanApplicationSelector.selectAll()) {
            s.total++;
            if (a.Decision__c == 'Auto-Approved') s.approved++;
            else if (a.Decision__c == 'Referred') s.referred++;
            else if (a.Decision__c == 'Declined') s.declined++;
        }
        return s;
    }

    // Not cacheable: the audit trail is fetched on demand when the modal opens,
    // and must always reflect the latest decisions (a cached result would go
    // stale after a new submit until a full page reload).
    @AuraEnabled
    public static List<Decision_Audit__c> getAudits(Id applicationId) {
        return LoanApplicationSelector.selectAuditsFor(applicationId);
    }

    /** Submit an application — this drives scoring + decisioning via the trigger. */
    @AuraEnabled
    public static void submit(Id applicationId) {
        update new Loan_Application__c(Id = applicationId, Status__c = 'Submitted');
    }

    /** Seed a spread of demo applications and run them through underwriting. */
    @AuraEnabled
    public static Integer seedSampleData() {
        if (!LoanApplicationSelector.selectDemo().isEmpty()) return 0;

        List<Loan_Application__c> apps = new List<Loan_Application__c>{
            // Strong -> auto-approve
            new Loan_Application__c(Applicant_Name__c = '[Demo] Asha Menon', Loan_Amount__c = 250000, Term_Months__c = 60,
                Annual_Income__c = 180000, Credit_Score__c = 800, Monthly_Debt__c = 1000, Employment_Years__c = 8),
            // Weak -> decline
            new Loan_Application__c(Applicant_Name__c = '[Demo] Ravi Kumar', Loan_Amount__c = 120000, Term_Months__c = 36,
                Annual_Income__c = 40000, Credit_Score__c = 560, Monthly_Debt__c = 2000, Employment_Years__c = 1),
            // Mid -> refer
            new Loan_Application__c(Applicant_Name__c = '[Demo] Meera Nair', Loan_Amount__c = 300000, Term_Months__c = 48,
                Annual_Income__c = 90000, Credit_Score__c = 680, Monthly_Debt__c = 1500, Employment_Years__c = 3),
            // Strong but large amount -> refer (amount override)
            new Loan_Application__c(Applicant_Name__c = '[Demo] Sanjay Rao', Loan_Amount__c = 750000, Term_Months__c = 120,
                Annual_Income__c = 220000, Credit_Score__c = 790, Monthly_Debt__c = 1200, Employment_Years__c = 10)
        };
        insert apps; // created as Draft

        for (Loan_Application__c a : apps) a.Status__c = 'Submitted';
        update apps; // triggers underwriting + audit

        return apps.size();
    }
}
