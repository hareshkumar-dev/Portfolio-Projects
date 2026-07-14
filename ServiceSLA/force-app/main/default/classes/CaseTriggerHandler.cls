/**
 * CaseTriggerHandler — orchestration for Case (DOMAIN layer).
 *
 * Thin: it casts the generic trigger collections and delegates to the
 * SlaService. Ends by flushing any buffered logs.
 */
public with sharing class CaseTriggerHandler extends TriggerHandler {

    protected override void beforeInsert(List<SObject> newList) {
        SlaService.applyTargets((List<Case>) newList);
        Logger.flush();
    }

    protected override void beforeUpdate(List<SObject> newList, Map<Id, SObject> oldMap) {
        SlaService.handleUpdates((List<Case>) newList, (Map<Id, Case>) oldMap);
        Logger.flush();
    }
}
