/**
 * MrrService — portfolio revenue metrics for the dashboard (SERVICE
 * layer). Computed with aggregate SOQL so no raw records cross the wire.
 */
public with sharing class MrrService {

    public class Metrics {
        @AuraEnabled public Decimal totalMrr;
        @AuraEnabled public Decimal arr;
        @AuraEnabled public Integer activeCount;
        @AuraEnabled public Integer renewalsDue;
        @AuraEnabled public Integer pendingRenewals;
        @AuraEnabled public Integer churned;
    }

    public static Metrics portfolio() {
        Metrics m = new Metrics();
        m.totalMrr = 0; m.arr = 0; m.activeCount = 0;
        m.renewalsDue = 0; m.pendingRenewals = 0; m.churned = 0;

        // Active MRR + count
        for (AggregateResult ar : [
            SELECT SUM(MRR__c) mrr, COUNT(Id) cnt
            FROM Subscription__c WHERE Status__c = 'Active'
        ]) {
            m.totalMrr = ar.get('mrr') == null ? 0 : (Decimal) ar.get('mrr');
            m.activeCount = (Integer) ar.get('cnt');
        }
        m.arr = m.totalMrr * 12;

        RenewalSettingService.Settings cfg = RenewalSettingService.get();
        Date dueCutoff = Date.today().addDays(cfg.leadTimeDays);

        m.renewalsDue = [
            SELECT COUNT() FROM Subscription__c
            WHERE Status__c = 'Active' AND Renewal_Generated__c = false
              AND End_Date__c != null AND End_Date__c <= :dueCutoff
        ];
        m.pendingRenewals = [SELECT COUNT() FROM Subscription__c WHERE Status__c = 'Pending Renewal'];
        m.churned = [SELECT COUNT() FROM Subscription__c WHERE Status__c = 'Churned'];

        return m;
    }
}
