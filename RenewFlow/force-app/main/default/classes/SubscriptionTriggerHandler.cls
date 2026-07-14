/**
 * SubscriptionTriggerHandler — DOMAIN orchestration.
 *
 *  after insert/update/delete: recompute the customer MRR roll-up.
 *  after update: when a renewal is activated, retire the subscription
 *                it renews (Status → Renewed). That parent update
 *                re-fires this trigger once, which simply recomputes the
 *                roll-up — a bounded, terminal cascade.
 */
public with sharing class SubscriptionTriggerHandler extends TriggerHandler {

    protected override void afterInsert(List<SObject> newList, Map<Id, SObject> newMap) {
        rollup((List<Subscription__c>) newList, null);
    }

    protected override void afterUpdate(List<SObject> newList, Map<Id, SObject> oldMap) {
        List<Subscription__c> subs = (List<Subscription__c>) newList;
        Map<Id, Subscription__c> priorById = (Map<Id, Subscription__c>) oldMap;

        List<Subscription__c> retire = SubscriptionLifecycleService.parentsToRetire(subs, priorById);
        if (!retire.isEmpty()) {
            UnitOfWork uow = new UnitOfWork();
            uow.registerDirty(retire);
            try {
                uow.commitWork();
            } catch (Exception e) {
                Logger.error('SubscriptionTriggerHandler.afterUpdate', e);
                Logger.flush();
            }
        }

        rollup(subs, priorById);
    }

    protected override void afterDelete(List<SObject> oldList, Map<Id, SObject> oldMap) {
        rollup((List<Subscription__c>) oldList, null);
    }

    /** Collect every affected customer (old + new) and recompute. */
    private void rollup(List<Subscription__c> subs, Map<Id, Subscription__c> oldMap) {
        Set<Id> customerIds = new Set<Id>();
        for (Subscription__c s : subs) {
            customerIds.add(s.Customer__c);
            if (oldMap != null) {
                Subscription__c prior = oldMap.get(s.Id);
                if (prior != null) customerIds.add(prior.Customer__c);
            }
        }
        MrrRollupService.recalculate(customerIds);
    }
}
