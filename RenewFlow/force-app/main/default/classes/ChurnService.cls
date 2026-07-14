/**
 * ChurnService — flags subscriptions that expired without renewing
 * (past the grace period) as Churned (SERVICE layer). Mutates the
 * records in place and returns the ones that changed.
 */
public with sharing class ChurnService {

    public static List<Subscription__c> flagChurned(List<Subscription__c> subs) {
        RenewalSettingService.Settings cfg = RenewalSettingService.get();
        Date churnCutoff = Date.today().addDays(-cfg.graceDays);

        List<Subscription__c> churned = new List<Subscription__c>();
        for (Subscription__c s : subs) {
            Boolean expired = s.End_Date__c != null && s.End_Date__c < churnCutoff;
            if (s.Status__c == 'Active' && expired && !s.Renewal_Generated__c) {
                s.Status__c = 'Churned';
                churned.add(s);
            }
        }
        return churned;
    }
}
