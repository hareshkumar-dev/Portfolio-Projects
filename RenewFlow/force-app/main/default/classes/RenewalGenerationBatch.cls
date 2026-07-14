/**
 * RenewalGenerationBatch — ASYNC layer. Nightly sweep over active
 * subscriptions that:
 *   1) generates a renewal for anything expiring within the lead time
 *      (auto-renew on, not already generated), and
 *   2) flags anything past its grace period as churned.
 *
 * Uses the services for the rules and the Unit of Work for the commit.
 * Stateful for a summary log.
 */
public with sharing class RenewalGenerationBatch
    implements Database.Batchable<SObject>, Database.Stateful {

    private Integer renewalsCreated = 0;
    private Integer churned = 0;

    public Database.QueryLocator start(Database.BatchableContext bc) {
        return SubscriptionSelector.locatorActive();
    }

    public void execute(Database.BatchableContext bc, List<Subscription__c> scope) {
        RenewalSettingService.Settings cfg = RenewalSettingService.get();
        Date dueCutoff = Date.today().addDays(cfg.leadTimeDays);

        // 1) Subscriptions due for renewal
        List<Subscription__c> due = new List<Subscription__c>();
        for (Subscription__c s : scope) {
            Boolean withinLeadTime = s.End_Date__c != null && s.End_Date__c <= dueCutoff;
            if (withinLeadTime && s.Auto_Renew__c && !s.Renewal_Generated__c) {
                due.add(s);
            }
        }
        List<Subscription__c> renewals = RenewalService.buildRenewals(due); // marks originals

        // 2) Subscriptions that have churned
        List<Subscription__c> churnedSubs = ChurnService.flagChurned(scope);

        // Commit: originals (dirty) + new renewals, in one Unit of Work
        UnitOfWork uow = new UnitOfWork();
        uow.registerDirty(due);
        uow.registerDirty(churnedSubs);
        uow.registerNew(renewals);
        try {
            uow.commitWork();
            renewalsCreated += renewals.size();
            churned += churnedSubs.size();
        } catch (Exception e) {
            Logger.error('RenewalGenerationBatch.execute', e);
        }
    }

    public void finish(Database.BatchableContext bc) {
        Logger.info('RenewalGenerationBatch.finish',
            'Renewals created: ' + renewalsCreated + ' | Churned: ' + churned);
        Logger.flush();
    }
}
