/**
 * ClaimSelector — SELECTOR layer. All Claim__c and Claim_History__c
 * SOQL lives here.
 */
public with sharing class ClaimSelector {

    private static final String FIELDS =
        'Id, Name, Claimant_Name__c, Claim_Type__c, Severity__c, Amount_Claimed__c, ' +
        'Stage__c, Reserve_Amount__c, Assigned_To__c, Stage_Changed_At__c, Is_Stalled__c';

    public static List<Claim__c> selectAll() {
        return Database.query(
            'SELECT ' + FIELDS + ' FROM Claim__c ORDER BY CreatedDate DESC LIMIT 500'
        );
    }

    /** Open claims (not Closed/Rejected) — the aging batch work-list. */
    public static Database.QueryLocator locatorOpen() {
        return Database.getQueryLocator(
            'SELECT ' + FIELDS + ' FROM Claim__c WHERE Stage__c NOT IN (\'Closed\', \'Rejected\')'
        );
    }

    public static List<Claim_History__c> selectHistoryFor(Id claimId) {
        return [
            SELECT Id, Name, From_Stage__c, To_Stage__c, Changed_By__c, Changed_At__c
            FROM Claim_History__c
            WHERE Claim__c = :claimId
            ORDER BY Changed_At__c ASC, CreatedDate ASC
        ];
    }
}
