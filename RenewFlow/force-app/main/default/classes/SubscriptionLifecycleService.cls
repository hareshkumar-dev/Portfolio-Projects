/**
 * SubscriptionLifecycleService — when a renewal is activated, retires
 * the subscription it renews (SERVICE layer). Returns the parent
 * records to mark 'Renewed'; the caller commits.
 */
public with sharing class SubscriptionLifecycleService {

    public static List<Subscription__c> parentsToRetire(
        List<Subscription__c> newSubs, Map<Id, Subscription__c> oldMap
    ) {
        Set<Id> parentIds = new Set<Id>();
        for (Subscription__c s : newSubs) {
            Subscription__c prior = oldMap.get(s.Id);
            Boolean nowActive = s.Status__c == 'Active' && prior.Status__c != 'Active';
            if (s.Renewal_Of__c != null && nowActive) {
                parentIds.add(s.Renewal_Of__c);
            }
        }

        List<Subscription__c> parents = new List<Subscription__c>();
        for (Id pid : parentIds) {
            parents.add(new Subscription__c(Id = pid, Status__c = 'Renewed'));
        }
        return parents;
    }
}
