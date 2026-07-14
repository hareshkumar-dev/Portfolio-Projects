/**
 * LoanApplicationTriggerHandler — DOMAIN orchestration.
 *
 * Underwriting fires when an application transitions to Submitted:
 *   - beforeUpdate: score + decide in place (no extra DML on the app),
 *     and remember which apps were decided.
 *   - afterUpdate: write the immutable Decision_Audit__c trail through
 *     the Unit of Work (Ids exist, and audit is a separate object).
 */
public with sharing class LoanApplicationTriggerHandler extends TriggerHandler {

    // Passed between the before- and after-phases of the same trigger run.
    private static Set<Id> justDecided = new Set<Id>();

    protected override void beforeInsert(List<SObject> newList) {
        for (Loan_Application__c app : (List<Loan_Application__c>) newList) {
            if (String.isBlank(app.Status__c)) app.Status__c = 'Draft';
            if (String.isBlank(app.Decision__c)) app.Decision__c = 'Pending';
        }
    }

    protected override void beforeUpdate(List<SObject> newList, Map<Id, SObject> oldMap) {
        List<Loan_Application__c> toUnderwrite = new List<Loan_Application__c>();
        for (Loan_Application__c app : (List<Loan_Application__c>) newList) {
            Loan_Application__c prior = (Loan_Application__c) oldMap.get(app.Id);
            if (app.Status__c == 'Submitted' && prior.Status__c != 'Submitted') {
                toUnderwrite.add(app);
            }
        }
        if (toUnderwrite.isEmpty()) return;

        UnderwritingService.underwrite(toUnderwrite);
        for (Loan_Application__c app : toUnderwrite) {
            justDecided.add(app.Id);
        }
    }

    protected override void afterUpdate(List<SObject> newList, Map<Id, SObject> oldMap) {
        if (justDecided.isEmpty()) return;

        List<Loan_Application__c> decided = new List<Loan_Application__c>();
        for (Loan_Application__c app : (List<Loan_Application__c>) newList) {
            if (justDecided.contains(app.Id)) decided.add(app);
        }
        justDecided = new Set<Id>(); // reset the guard

        if (decided.isEmpty()) return;

        UnitOfWork uow = new UnitOfWork();
        uow.registerNew(UnderwritingService.buildAudits(decided));
        try {
            uow.commitWork();
            Logger.info('LoanApplicationTriggerHandler', 'Underwrote ' + decided.size() + ' application(s).');
        } catch (Exception e) {
            Logger.error('LoanApplicationTriggerHandler.afterUpdate', e);
        }
        Logger.flush();
    }
}
