/**
 * MrrRollupService — keeps Customer__c.Total_MRR__c and
 * Active_Subscriptions__c in sync with the sum/count of *active*
 * subscriptions (SERVICE layer). Bulk-safe: one aggregate query and one
 * update for the whole affected customer set.
 */
public with sharing class MrrRollupService {

    public static void recalculate(Set<Id> customerIds) {
        customerIds.remove(null);
        if (customerIds.isEmpty()) return;

        Map<Id, Decimal> mrrByCustomer = new Map<Id, Decimal>();
        Map<Id, Integer> countByCustomer = new Map<Id, Integer>();

        for (AggregateResult ar : [
            SELECT Customer__c cid, SUM(MRR__c) mrr, COUNT(Id) cnt
            FROM Subscription__c
            WHERE Customer__c IN :customerIds AND Status__c = 'Active'
            GROUP BY Customer__c
        ]) {
            Id cid = (Id) ar.get('cid');
            mrrByCustomer.put(cid, (Decimal) ar.get('mrr'));
            countByCustomer.put(cid, (Integer) ar.get('cnt'));
        }

        List<Customer__c> updates = new List<Customer__c>();
        for (Id cid : customerIds) {
            updates.add(new Customer__c(
                Id = cid,
                Total_MRR__c = mrrByCustomer.containsKey(cid) ? mrrByCustomer.get(cid) : 0,
                Active_Subscriptions__c = countByCustomer.containsKey(cid) ? countByCustomer.get(cid) : 0
            ));
        }
        update updates;
    }
}
