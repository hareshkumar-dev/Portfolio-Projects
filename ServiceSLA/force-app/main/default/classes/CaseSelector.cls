/**
 * CaseSelector — SELECTOR layer.
 *
 * All Case SOQL lives here, so queries are consistent, bulk-safe, and
 * easy to find. Callers never write inline SOQL against Case.
 */
public with sharing class CaseSelector {

    private static final String FIELDS =
        'Id, CaseNumber, Subject, Status, Priority, IsClosed, ' +
        'Service_Tier__c, SLA_Status__c, Response_Target__c, Resolution_Target__c, ' +
        'First_Responded_At__c, Is_Escalated__c, CreatedDate';

    /** Open cases, soonest resolution target first — the escalation work-list. */
    public static List<Case> selectOpen() {
        return Database.query(
            'SELECT ' + FIELDS + ' FROM Case WHERE IsClosed = false ' +
            'ORDER BY Resolution_Target__c ASC NULLS LAST LIMIT 5000'
        );
    }

    /** Open cases for the console (bounded for display). */
    public static List<Case> selectOpenForConsole() {
        return Database.query(
            'SELECT ' + FIELDS + ' FROM Case WHERE IsClosed = false ' +
            'ORDER BY Resolution_Target__c ASC NULLS LAST LIMIT 200'
        );
    }

    /** A QueryLocator over all open cases, for the escalation batch. */
    public static Database.QueryLocator locatorOpen() {
        return Database.getQueryLocator(
            'SELECT ' + FIELDS + ' FROM Case WHERE IsClosed = false'
        );
    }

    /** Demo cases created by the console seeder. */
    public static List<Case> selectDemo() {
        return [
            SELECT Id, Subject, Service_Tier__c, Response_Target__c, Resolution_Target__c
            FROM Case
            WHERE Subject LIKE '[Demo]%'
        ];
    }
}
