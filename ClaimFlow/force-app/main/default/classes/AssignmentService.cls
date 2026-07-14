/**
 * AssignmentService — routes a claim to the right team (SERVICE layer)
 * from the per-type config, escalating Critical claims to the senior
 * desk.
 */
public with sharing class AssignmentService {

    public static void assign(List<Claim__c> claims) {
        Map<String, ClaimConfigService.TypeConfig> config = ClaimConfigService.byType();

        for (Claim__c c : claims) {
            ClaimConfigService.TypeConfig tc = config.get(c.Claim_Type__c);
            String team = (tc == null || String.isBlank(tc.team)) ? 'General Claims Team' : tc.team;
            c.Assigned_To__c = (c.Severity__c == 'Critical') ? ('Senior ' + team) : team;
        }
    }
}
