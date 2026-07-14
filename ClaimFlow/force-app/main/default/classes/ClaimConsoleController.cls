/**
 * ClaimConsoleController — UI layer for the claimConsole LWC.
 * Advancing a claim drives the state machine through the trigger; an
 * illegal transition surfaces as a friendly error.
 */
public with sharing class ClaimConsoleController {

    public class Summary {
        @AuraEnabled public Integer open;
        @AuraEnabled public Integer settled;
        @AuraEnabled public Integer rejected;
        @AuraEnabled public Integer stalled;
    }

    @AuraEnabled(cacheable=true)
    public static List<Claim__c> getClaims() {
        return ClaimSelector.selectAll();
    }

    @AuraEnabled(cacheable=true)
    public static Summary getSummary() {
        Summary s = new Summary();
        s.open = 0; s.settled = 0; s.rejected = 0; s.stalled = 0;
        for (Claim__c c : ClaimSelector.selectAll()) {
            if (c.Stage__c == 'Closed') s.settled++;
            else if (c.Stage__c == 'Rejected') s.rejected++;
            else s.open++;
            if (c.Is_Stalled__c) s.stalled++;
        }
        return s;
    }

    // Not cacheable: the history trail is fetched on demand when the modal
    // opens and must always reflect the latest transitions (a cached result
    // would go stale after an advance until a full page reload).
    @AuraEnabled
    public static List<Claim_History__c> getHistory(Id claimId) {
        return ClaimSelector.selectHistoryFor(claimId);
    }

    /** Move a claim to a new stage. The FSM validates the transition. */
    @AuraEnabled
    public static void advanceStage(Id claimId, String toStage) {
        try {
            update new Claim__c(Id = claimId, Stage__c = toStage);
        } catch (Exception e) {
            throw new AuraHandledException(cleanError(e.getMessage()));
        }
    }

    /** Kick off the aging sweep now. */
    @AuraEnabled
    public static Id runAgingNow() {
        return Database.executeBatch(new StageAgingBatch(), 200);
    }

    private static String cleanError(String message) {
        // Strip Salesforce's "FIELD_CUSTOM_VALIDATION_EXCEPTION, ..." wrapping.
        Integer idx = message.indexOf('Illegal claim transition');
        if (idx >= 0) {
            Integer endIdx = message.indexOf('lifecycle.');
            return endIdx >= 0 ? message.substring(idx, endIdx + 10) : message.substring(idx);
        }
        return message;
    }
}
