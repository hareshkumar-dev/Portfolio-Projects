/**
 * StageTransitionService — the STATE MACHINE definition (CONFIG layer).
 *
 * Loads the allowed (from → to) stage transitions from
 * Stage_Transition__mdt into a fast lookup set. Because it's config,
 * the claims lifecycle can be re-shaped in Setup — no code change.
 * Test-injectable.
 */
public with sharing class StageTransitionService {

    private static Set<String> cache;

    @TestVisible
    private static Set<String> testOverride;

    public static Set<String> allowed() {
        if (testOverride != null) return testOverride;
        if (cache != null) return cache;

        cache = new Set<String>();
        for (Stage_Transition__mdt t : [
            SELECT From_Stage__c, To_Stage__c FROM Stage_Transition__mdt WHERE Active__c = true
        ]) {
            cache.add(key(t.From_Stage__c, t.To_Stage__c));
        }
        return cache;
    }

    public static Boolean isAllowed(String fromStage, String toStage) {
        return allowed().contains(key(fromStage, toStage));
    }

    private static String key(String fromStage, String toStage) {
        return fromStage + '|' + toStage;
    }

    @TestVisible
    private static void setTestTransitions(Set<String> transitions) {
        testOverride = transitions;
    }
}
