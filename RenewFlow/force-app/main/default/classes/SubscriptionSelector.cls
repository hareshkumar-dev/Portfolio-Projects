/**
 * SubscriptionSelector — SELECTOR layer. All Subscription__c SOQL.
 */
public with sharing class SubscriptionSelector {

    private static final String FIELDS =
        'Id, Name, Customer__c, Customer__r.Name, Product__c, MRR__c, Term_Months__c, ' +
        'Start_Date__c, End_Date__c, Status__c, Auto_Renew__c, Renewal_Of__c, Renewal_Generated__c';

    public static List<Subscription__c> selectAll() {
        return Database.query(
            'SELECT ' + FIELDS + ' FROM Subscription__c ORDER BY End_Date__c ASC NULLS LAST LIMIT 500'
        );
    }

    /** All Active subscriptions — the renewal/churn work-list. */
    public static Database.QueryLocator locatorActive() {
        return Database.getQueryLocator(
            'SELECT ' + FIELDS + ' FROM Subscription__c WHERE Status__c = \'Active\''
        );
    }

}
