/**
 * The single trigger on Loan_Application__c. No logic — delegates to
 * LoanApplicationTriggerHandler through the framework.
 */
trigger LoanApplicationTrigger on Loan_Application__c (
    before insert, before update, after insert, after update
) {
    new LoanApplicationTriggerHandler().run();
}
