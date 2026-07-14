/**
 * RenewalService — generates renewal records for subscriptions nearing
 * expiry (SERVICE layer). Pure: it builds the new records and marks the
 * originals; the caller commits.
 */
public with sharing class RenewalService {

    /**
     * For each eligible subscription, build a renewal starting the day
     * after the current term ends. Marks originals Renewal_Generated__c.
     * Returns the new renewal records to insert.
     */
    public static List<Subscription__c> buildRenewals(List<Subscription__c> due) {
        RenewalSettingService.Settings cfg = RenewalSettingService.get();
        List<Subscription__c> renewals = new List<Subscription__c>();

        for (Subscription__c s : due) {
            Integer term = (s.Term_Months__c != null && s.Term_Months__c > 0)
                ? Integer.valueOf(s.Term_Months__c) : cfg.defaultTerm;

            Date newStart = (s.End_Date__c == null ? Date.today() : s.End_Date__c).addDays(1);

            renewals.add(new Subscription__c(
                Customer__c = s.Customer__c,
                Product__c = s.Product__c,
                MRR__c = s.MRR__c,
                Term_Months__c = term,
                Start_Date__c = newStart,
                End_Date__c = newStart.addMonths(term),
                Status__c = 'Pending Renewal',
                Auto_Renew__c = s.Auto_Renew__c,
                Renewal_Of__c = s.Id
            ));
            s.Renewal_Generated__c = true;
        }
        return renewals;
    }
}
