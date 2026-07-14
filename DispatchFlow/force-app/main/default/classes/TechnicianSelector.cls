/**
 * TechnicianSelector — SELECTOR layer for Technician__c.
 */
public with sharing class TechnicianSelector {

    private static final String FIELDS =
        'Id, Name, Skills__c, Territory__c, Max_Jobs__c, Active_Jobs__c, Is_Available__c';

    /** The candidate pool for dispatch: available technicians. */
    public static List<Technician__c> selectAvailable() {
        return Database.query(
            'SELECT ' + FIELDS + ' FROM Technician__c WHERE Is_Available__c = true LIMIT 1000'
        );
    }

    public static List<Technician__c> selectAll() {
        return Database.query(
            'SELECT ' + FIELDS + ' FROM Technician__c ORDER BY Name ASC LIMIT 500'
        );
    }
}
