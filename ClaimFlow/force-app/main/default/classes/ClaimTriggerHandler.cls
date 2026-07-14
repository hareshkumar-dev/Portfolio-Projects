/**
 * ClaimTriggerHandler — DOMAIN orchestration.
 *
 *  before insert: default the stage to FNOL, assign a team, set the
 *                 reserve, stamp the stage-entry time.
 *  before update: GUARD the transition against the state machine,
 *                 recompute the reserve, re-stamp on stage change.
 *  after  insert/update: write the Claim_History__c audit trail via
 *                 the Unit of Work (only for successful transitions).
 */
public with sharing class ClaimTriggerHandler extends TriggerHandler {

    protected override void beforeInsert(List<SObject> newList) {
        List<Claim__c> claims = (List<Claim__c>) newList;
        for (Claim__c c : claims) {
            if (String.isBlank(c.Stage__c)) c.Stage__c = 'FNOL';
        }
        AssignmentService.assign(claims);
        ReserveService.setReserves(claims);
        ClaimLifecycleService.stampStageChange(claims, null);
    }

    protected override void beforeUpdate(List<SObject> newList, Map<Id, SObject> oldMap) {
        List<Claim__c> claims = (List<Claim__c>) newList;
        Map<Id, Claim__c> priorById = (Map<Id, Claim__c>) oldMap;

        ClaimLifecycleService.validateTransitions(claims, priorById);
        ReserveService.setReserves(claims);
        ClaimLifecycleService.stampStageChange(claims, priorById);
    }

    protected override void afterInsert(List<SObject> newList, Map<Id, SObject> newMap) {
        writeHistory((List<Claim__c>) newList, null);
    }

    protected override void afterUpdate(List<SObject> newList, Map<Id, SObject> oldMap) {
        writeHistory((List<Claim__c>) newList, (Map<Id, Claim__c>) oldMap);
    }

    private void writeHistory(List<Claim__c> claims, Map<Id, Claim__c> oldMap) {
        List<Claim_History__c> history = ClaimLifecycleService.buildHistory(claims, oldMap);
        if (history.isEmpty()) return;

        UnitOfWork uow = new UnitOfWork();
        uow.registerNew(history);
        try {
            uow.commitWork();
        } catch (Exception e) {
            Logger.error('ClaimTriggerHandler.writeHistory', e);
        }
        Logger.flush();
    }
}
