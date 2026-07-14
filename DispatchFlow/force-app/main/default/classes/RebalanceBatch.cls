/**
 * RebalanceBatch — ASYNC layer. Works the backlog of Unassigned work
 * orders (e.g. ones with no eligible technician at creation time) and
 * dispatches them now that capacity or availability may have changed.
 *
 * Reuses DispatchService for the matching and AssignmentLogService for
 * the audit — the same rules as insert-time dispatch. Stateful for a
 * summary log.
 */
public with sharing class RebalanceBatch
    implements Database.Batchable<SObject>, Database.Stateful {

    private Integer assigned = 0;

    public Database.QueryLocator start(Database.BatchableContext bc) {
        return WorkOrderSelector.locatorUnassigned();
    }

    public void execute(Database.BatchableContext bc, List<Work_Order__c> scope) {
        Map<Integer, MatchingService.Result> picks = DispatchService.autoDispatch(scope);
        if (picks.isEmpty()) return;

        UnitOfWork uow = new UnitOfWork();
        uow.registerDirty(scope);                                    // persist the assignments
        uow.registerNew(AssignmentLogService.build(picks, scope));   // audit
        try {
            uow.commitWork();
            assigned += picks.size();
        } catch (Exception e) {
            Logger.error('RebalanceBatch.execute', e);
        }
    }

    public void finish(Database.BatchableContext bc) {
        Logger.info('RebalanceBatch.finish', 'Backlog assigned: ' + assigned);
        Logger.flush();
    }
}
