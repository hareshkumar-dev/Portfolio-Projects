/**
 * ReserveService — computes the financial reserve held against a claim
 * (SERVICE layer): amount × type factor (config) × severity multiplier.
 */
public with sharing class ReserveService {

    public static void setReserves(List<Claim__c> claims) {
        Map<String, ClaimConfigService.TypeConfig> config = ClaimConfigService.byType();

        for (Claim__c c : claims) {
            ClaimConfigService.TypeConfig tc = config.get(c.Claim_Type__c);
            Decimal factor = (tc == null || tc.reserveFactor == null) ? 1 : tc.reserveFactor;
            Decimal amount = (c.Amount_Claimed__c == null) ? 0 : c.Amount_Claimed__c;

            c.Reserve_Amount__c =
                (amount * factor * severityMultiplier(c.Severity__c))
                    .setScale(0, System.RoundingMode.HALF_UP);
        }
    }

    private static Decimal severityMultiplier(String severity) {
        if (severity == 'Critical') return 1.5;
        if (severity == 'High') return 1.2;
        if (severity == 'Low') return 0.8;
        return 1.0; // Medium / unset
    }
}
