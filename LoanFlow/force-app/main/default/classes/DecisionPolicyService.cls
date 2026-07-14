/**
 * DecisionPolicyService — reads the decision thresholds from
 * Decision_Policy__mdt (CONFIG layer). Falls back to safe defaults if
 * no policy is deployed, and is test-injectable.
 */
public with sharing class DecisionPolicyService {

    public class Policy {
        public Decimal autoApproveScore;
        public Decimal autoDeclineScore;
        public Decimal manualReviewAmount;
    }

    private static Policy cache;

    @TestVisible
    private static Policy testOverride;

    public static Policy get() {
        if (testOverride != null) return testOverride;
        if (cache != null) return cache;

        Policy p = new Policy();
        List<Decision_Policy__mdt> rows = [
            SELECT Auto_Approve_Score__c, Auto_Decline_Score__c, Manual_Review_Amount__c
            FROM Decision_Policy__mdt LIMIT 1
        ];
        if (!rows.isEmpty()) {
            p.autoApproveScore = rows[0].Auto_Approve_Score__c;
            p.autoDeclineScore = rows[0].Auto_Decline_Score__c;
            p.manualReviewAmount = rows[0].Manual_Review_Amount__c;
        } else {
            // Defensive defaults so the engine still runs if config is missing.
            p.autoApproveScore = 70;
            p.autoDeclineScore = 40;
            p.manualReviewAmount = 500000;
        }
        cache = p;
        return p;
    }

    @TestVisible
    private static void setTestPolicy(Policy p) {
        testOverride = p;
    }
}
