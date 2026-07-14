/**
 * WorkOrderTriggerHandler — DOMAIN orchestration.
 *
 *  before insert / before update: auto-dispatch unassigned orders (the
 *      matching engine assigns the best technician in place).
 *  after insert / after update:   write the assignment audit for what was
 *      just dispatched, and recompute technician load roll-ups.
 *  after delete:                  recompute load for freed technicians.
 *
 * `pending` carries the dispatch picks from the before- to the after-
 * phase of the same trigger run so the audit can reference record Ids.
 */
public with sharing class WorkOrderTriggerHandler extends TriggerHandler {

    private static Map<Integer, MatchingService.Result> pending;

    protected override void beforeInsert(List<SObject> newList) {
        pending = DispatchService.autoDispatch((List<Work_Order__c>) newList);
    }

    protected override void beforeUpdate(List<SObject> newList, Map<Id, SObject> oldMap) {
        pending = DispatchService.autoDispatch((List<Work_Order__c>) newList);
    }

    protected override void afterInsert(List<SObject> newList, Map<Id, SObject> newMap) {
        finishDispatch((List<Work_Order__c>) newList, null);
    }

    protected override void afterUpdate(List<SObject> newList, Map<Id, SObject> oldMap) {
        finishDispatch((List<Work_Order__c>) newList, (Map<Id, SObject>) oldMap);
    }

    protected override void afterDelete(List<SObject> oldList, Map<Id, SObject> oldMap) {
        Set<Id> techIds = new Set<Id>();
        for (Work_Order__c wo : (List<Work_Order__c>) oldList) {
            techIds.add(wo.Assigned_Technician__c);
        }
        TechnicianLoadService.recalculate(techIds);
    }

    private void finishDispatch(List<Work_Order__c> workOrders, Map<Id, SObject> oldMap) {
        // 1) Write the audit for whatever the before-phase dispatched.
        if (pending != null && !pending.isEmpty()) {
            UnitOfWork uow = new UnitOfWork();
            uow.registerNew(AssignmentLogService.build(pending, workOrders));
            try {
                uow.commitWork();
            } catch (Exception e) {
                Logger.error('WorkOrderTriggerHandler.finishDispatch', e);
                Logger.flush();
            }
        }
        pending = null;

        // 2) Recompute load for every technician touched (old + new).
        Set<Id> techIds = new Set<Id>();
        for (Work_Order__c wo : workOrders) {
            techIds.add(wo.Assigned_Technician__c);
            if (oldMap != null) {
                Work_Order__c prior = (Work_Order__c) oldMap.get(wo.Id);
                if (prior != null) techIds.add(prior.Assigned_Technician__c);
            }
        }
        TechnicianLoadService.recalculate(techIds);
    }
}
