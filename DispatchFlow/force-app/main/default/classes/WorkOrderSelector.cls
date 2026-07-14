/**
 * WorkOrderSelector — SELECTOR layer for Work_Order__c.
 */
public with sharing class WorkOrderSelector {

    private static final String FIELDS =
        'Id, Name, Subject__c, Required_Skill__c, Territory__c, Priority__c, Status__c, ' +
        'Assigned_Technician__c, Assigned_Technician__r.Name, Match_Score__c, Scheduled_Date__c';

    public static List<Work_Order__c> selectAll() {
        return Database.query(
            'SELECT ' + FIELDS + ' FROM Work_Order__c ORDER BY CreatedDate DESC LIMIT 500'
        );
    }

    /** Unassigned work orders — the rebalance batch work-list. */
    public static Database.QueryLocator locatorUnassigned() {
        return Database.getQueryLocator(
            'SELECT ' + FIELDS + ' FROM Work_Order__c WHERE Status__c = \'Unassigned\''
        );
    }
}
