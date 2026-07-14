/**
 * MatchWeightService — reads the matching weights from Match_Weight__mdt
 * (CONFIG layer). Falls back to defaults and is test-injectable.
 */
public with sharing class MatchWeightService {

    public class Weights {
        public Decimal skill;
        public Decimal territory;
        public Decimal load;
    }

    private static Weights cache;

    @TestVisible
    private static Weights testOverride;

    public static Weights get() {
        if (testOverride != null) return testOverride;
        if (cache != null) return cache;

        Weights w = new Weights();
        List<Match_Weight__mdt> rows = [
            SELECT Skill_Weight__c, Territory_Weight__c, Load_Weight__c
            FROM Match_Weight__mdt LIMIT 1
        ];
        if (!rows.isEmpty()) {
            w.skill = rows[0].Skill_Weight__c;
            w.territory = rows[0].Territory_Weight__c;
            w.load = rows[0].Load_Weight__c;
        } else {
            w.skill = 50; w.territory = 30; w.load = 20;
        }
        cache = w;
        return w;
    }

    @TestVisible
    private static void setTestWeights(Weights w) {
        testOverride = w;
    }
}
