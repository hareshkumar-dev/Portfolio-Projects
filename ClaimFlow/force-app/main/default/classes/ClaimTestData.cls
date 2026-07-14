/**
 * Test utility: injects the FSM transitions and per-type config so tests
 * don't depend on Custom Metadata rows.
 */
@IsTest
public class ClaimTestData {

    public static void installConfig() {
        StageTransitionService.setTestTransitions(new Set<String>{
            'FNOL|Investigation',
            'Investigation|Approval',
            'Investigation|Rejected',
            'Approval|Settlement',
            'Approval|Rejected',
            'Settlement|Closed'
        });

        ClaimConfigService.setTestConfig(new Map<String, ClaimConfigService.TypeConfig>{
            'Auto'      => new ClaimConfigService.TypeConfig(0.80, 'Auto Claims Team'),
            'Property'  => new ClaimConfigService.TypeConfig(0.90, 'Property Claims Team'),
            'Health'    => new ClaimConfigService.TypeConfig(0.95, 'Health Claims Team'),
            'Liability' => new ClaimConfigService.TypeConfig(1.00, 'Liability Claims Team')
        });
    }

    public static Claim__c claim(String type, String severity, Decimal amount) {
        return new Claim__c(
            Claimant_Name__c = 'Test ' + type,
            Claim_Type__c = type,
            Severity__c = severity,
            Amount_Claimed__c = amount
        );
    }
}
