/**
 * StageAgingBatch — ASYNC layer. Flags open claims that have sat in
 * their current stage longer than the stall threshold, so nothing gets
 * silently stuck. Stateful for a summary log.
 */
public with sharing class StageAgingBatch
    implements Database.Batchable<SObject>, Database.Stateful {

    // Days a claim may sit in one stage before it's flagged as stalled.
    @TestVisible
    private static Integer STALL_DAYS = 5;

    private Integer stalledCount = 0;

    public Database.QueryLocator start(Database.BatchableContext bc) {
        return ClaimSelector.locatorOpen();
    }

    public void execute(Database.BatchableContext bc, List<Claim__c> scope) {
        Datetime cutoff = Datetime.now().addDays(-STALL_DAYS);
        List<Claim__c> toFlag = new List<Claim__c>();

        for (Claim__c c : scope) {
            Boolean stalled = c.Stage_Changed_At__c != null && c.Stage_Changed_At__c < cutoff;
            if (stalled && !c.Is_Stalled__c) {
                c.Is_Stalled__c = true;
                toFlag.add(c);
            }
        }

        if (toFlag.isEmpty()) return;
        try {
            update toFlag;
            stalledCount += toFlag.size();
        } catch (Exception e) {
            Logger.error('StageAgingBatch.execute', e);
        }
    }

    public void finish(Database.BatchableContext bc) {
        Logger.info('StageAgingBatch.finish', 'Flagged ' + stalledCount + ' stalled claim(s).');
        Logger.flush();
    }
}
