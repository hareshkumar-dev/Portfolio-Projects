/**
 * SlaEscalationBatch — ASYNC layer.
 *
 * Sweeps every open case and, through SlaService.evaluateBreaches,
 * flags response/resolution breaches, escalates and re-prioritises.
 * Stateful so it can report a tally and log a summary at the end.
 *
 * Schedule with SlaEscalationScheduler, or run on demand from the
 * console. Uses the selector for its query and the service for its
 * rules — the batch itself only orchestrates.
 */
public with sharing class SlaEscalationBatch
    implements Database.Batchable<SObject>, Database.Stateful {

    private Integer breachedCount = 0;

    public Database.QueryLocator start(Database.BatchableContext bc) {
        return CaseSelector.locatorOpen();
    }

    public void execute(Database.BatchableContext bc, List<Case> scope) {
        List<Case> changed = SlaService.evaluateBreaches(scope);
        if (changed.isEmpty()) return;

        try {
            update changed;
            breachedCount += changed.size();
        } catch (Exception e) {
            Logger.error('SlaEscalationBatch.execute', e);
        }
    }

    public void finish(Database.BatchableContext bc) {
        Logger.info('SlaEscalationBatch.finish',
            'SLA sweep complete. Cases updated: ' + breachedCount);
        Logger.flush();
    }
}
