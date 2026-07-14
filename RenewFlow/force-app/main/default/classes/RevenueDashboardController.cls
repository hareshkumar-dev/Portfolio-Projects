/**
 * RevenueDashboardController — UI layer for the revenueDashboard LWC.
 */
public with sharing class RevenueDashboardController {

    @AuraEnabled(cacheable=true)
    public static MrrService.Metrics getMetrics() {
        return MrrService.portfolio();
    }

    @AuraEnabled(cacheable=true)
    public static List<Subscription__c> getSubscriptions() {
        return SubscriptionSelector.selectAll();
    }

    /** Activate a Pending Renewal — retires the prior subscription via the trigger. */
    @AuraEnabled
    public static void activateRenewal(Id subscriptionId) {
        update new Subscription__c(Id = subscriptionId, Status__c = 'Active');
    }

    /** Run the renewal/churn sweep now. */
    @AuraEnabled
    public static Id runRenewalSweep() {
        return Database.executeBatch(new RenewalGenerationBatch(), 200);
    }

}
