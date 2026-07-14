/**
 * ScoringConfigService — reads the weighted criteria from
 * Scoring_Rule__mdt (CONFIG layer). Cached per transaction, with a
 * @TestVisible override because Custom Metadata rows can't be created
 * in a test.
 */
public with sharing class ScoringConfigService {

    public class Weight {
        public final String criterion;
        public final Decimal weight;
        public Weight(String criterion, Decimal weight) {
            this.criterion = criterion;
            this.weight = weight;
        }
    }

    private static List<Weight> cache;

    @TestVisible
    private static List<Weight> testOverride;

    public static List<Weight> getWeights() {
        if (testOverride != null) return testOverride;
        if (cache != null) return cache;

        cache = new List<Weight>();
        for (Scoring_Rule__mdt rule : [
            SELECT Criterion__c, Weight__c FROM Scoring_Rule__mdt WHERE Active__c = true
        ]) {
            cache.add(new Weight(rule.Criterion__c, rule.Weight__c));
        }
        return cache;
    }

    @TestVisible
    private static void setTestWeights(List<Weight> weights) {
        testOverride = weights;
    }
}
