/**
 * ClaimLifecycleService — the STATE-MACHINE engine (SERVICE layer).
 *
 * Guards stage transitions against the configured FSM, stamps the
 * stage-entry time, and builds the transition audit trail. Pure and
 * bulk-safe (config is read through StageTransitionService).
 */
public with sharing class ClaimLifecycleService {

    /**
     * Block any stage change that isn't a configured transition.
     * addError stops just the offending record from saving.
     */
    public static void validateTransitions(List<Claim__c> newClaims, Map<Id, Claim__c> oldMap) {
        for (Claim__c c : newClaims) {
            Claim__c prior = oldMap.get(c.Id);
            if (c.Stage__c == prior.Stage__c) continue;

            if (!StageTransitionService.isAllowed(prior.Stage__c, c.Stage__c)) {
                c.addError(
                    'Illegal claim transition: ' + prior.Stage__c + ' → ' + c.Stage__c +
                    '. This step is not part of the configured claim lifecycle.'
                );
            }
        }
    }

    /** Stamp Stage_Changed_At__c and clear the stalled flag on any stage change. */
    public static void stampStageChange(List<Claim__c> newClaims, Map<Id, Claim__c> oldMap) {
        Datetime nowDt = Datetime.now();
        for (Claim__c c : newClaims) {
            Claim__c prior = (oldMap == null) ? null : oldMap.get(c.Id);
            Boolean changed = (prior == null) || (c.Stage__c != prior.Stage__c);
            if (changed) {
                c.Stage_Changed_At__c = nowDt;
                c.Is_Stalled__c = false;
            }
        }
    }

    /** Build a history record for each stage change (creation counts as one). */
    public static List<Claim_History__c> buildHistory(List<Claim__c> newClaims, Map<Id, Claim__c> oldMap) {
        List<Claim_History__c> history = new List<Claim_History__c>();
        Datetime nowDt = Datetime.now();
        String actor = UserInfo.getName();

        for (Claim__c c : newClaims) {
            Claim__c prior = (oldMap == null) ? null : oldMap.get(c.Id);
            Boolean changed = (prior == null) || (c.Stage__c != prior.Stage__c);
            if (!changed) continue;

            history.add(new Claim_History__c(
                Claim__c = c.Id,
                From_Stage__c = (prior == null) ? '—' : prior.Stage__c,
                To_Stage__c = c.Stage__c,
                Changed_By__c = actor,
                Changed_At__c = nowDt
            ));
        }
        return history;
    }
}
