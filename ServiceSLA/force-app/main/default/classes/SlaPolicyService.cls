/**
 * SlaPolicyService — configuration accessor (CONFIG layer).
 *
 * Reads SLA targets from the SLA_Policy__mdt Custom Metadata Type so
 * admins can change SLAs without a deployment. The result is cached per
 * transaction, and a @TestVisible override lets tests inject policies
 * (Custom Metadata rows can't be created in a test transaction).
 */
public with sharing class SlaPolicyService {

    /** Immutable value object for a single tier's policy. */
    public class Policy {
        public final String tier;
        public final Integer responseMinutes;
        public final Integer resolutionHours;
        public Policy(String tier, Integer responseMinutes, Integer resolutionHours) {
            this.tier = tier;
            this.responseMinutes = responseMinutes;
            this.resolutionHours = resolutionHours;
        }
    }

    private static Map<String, Policy> cache;

    @TestVisible
    private static Map<String, Policy> testOverride;

    /** Policies keyed by tier name. */
    public static Map<String, Policy> getPolicies() {
        if (testOverride != null) return testOverride;
        if (cache != null) return cache;

        cache = new Map<String, Policy>();
        for (SLA_Policy__mdt row : [
            SELECT Tier__c, Response_Target_Minutes__c, Resolution_Target_Hours__c
            FROM SLA_Policy__mdt
            WHERE Active__c = true
        ]) {
            cache.put(row.Tier__c, new Policy(
                row.Tier__c,
                Integer.valueOf(row.Response_Target_Minutes__c),
                Integer.valueOf(row.Resolution_Target_Hours__c)
            ));
        }
        return cache;
    }

    public static Policy forTier(String tier) {
        return getPolicies().get(tier);
    }

    /** Seed policies for a test (bypasses the Custom Metadata read). */
    @TestVisible
    private static void setTestPolicies(List<Policy> policies) {
        testOverride = new Map<String, Policy>();
        for (Policy p : policies) {
            testOverride.put(p.tier, p);
        }
    }
}
