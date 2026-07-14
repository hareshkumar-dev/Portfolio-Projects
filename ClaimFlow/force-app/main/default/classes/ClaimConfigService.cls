/**
 * ClaimConfigService — per-claim-type configuration (CONFIG layer):
 * reserve factor and assigned team, from Claim_Type_Config__mdt.
 * Test-injectable.
 */
public with sharing class ClaimConfigService {

    public class TypeConfig {
        public Decimal reserveFactor;
        public String team;
        public TypeConfig(Decimal reserveFactor, String team) {
            this.reserveFactor = reserveFactor;
            this.team = team;
        }
    }

    private static Map<String, TypeConfig> cache;

    @TestVisible
    private static Map<String, TypeConfig> testOverride;

    public static Map<String, TypeConfig> byType() {
        if (testOverride != null) return testOverride;
        if (cache != null) return cache;

        cache = new Map<String, TypeConfig>();
        for (Claim_Type_Config__mdt c : [
            SELECT Claim_Type__c, Reserve_Factor__c, Assigned_Team__c FROM Claim_Type_Config__mdt
        ]) {
            cache.put(c.Claim_Type__c, new TypeConfig(c.Reserve_Factor__c, c.Assigned_Team__c));
        }
        return cache;
    }

    @TestVisible
    private static void setTestConfig(Map<String, TypeConfig> config) {
        testOverride = config;
    }
}
