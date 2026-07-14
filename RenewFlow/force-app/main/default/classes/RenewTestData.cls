/**
 * Test utility: injects renewal settings so tests don't depend on
 * Custom Metadata rows, and builds customers/subscriptions.
 */
@IsTest
public class RenewTestData {

    public static void installSettings() {
        RenewalSettingService.Settings s = new RenewalSettingService.Settings();
        s.leadTimeDays = 60;
        s.graceDays = 15;
        s.defaultTerm = 12;
        RenewalSettingService.setTestSettings(s);
    }

    public static Customer__c customer(String name) {
        Customer__c c = new Customer__c(Name = name);
        insert c;
        return c;
    }

    public static Subscription__c subscription(Id customerId, Decimal mrr, Date endDate, Boolean autoRenew) {
        return new Subscription__c(
            Customer__c = customerId,
            Product__c = 'Test Product',
            MRR__c = mrr,
            Term_Months__c = 12,
            Start_Date__c = endDate.addMonths(-12),
            End_Date__c = endDate,
            Status__c = 'Active',
            Auto_Renew__c = autoRenew
        );
    }
}
