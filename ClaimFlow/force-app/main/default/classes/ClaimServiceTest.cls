/**
 * Unit tests for the SERVICE layer — FSM validation, reserve, and
 * assignment (pure where possible).
 */
@IsTest
private class ClaimServiceTest {

    @IsTest
    static void fsmAllowsConfiguredTransition() {
        ClaimTestData.installConfig();
        System.assertEquals(true, StageTransitionService.isAllowed('FNOL', 'Investigation'));
        System.assertEquals(true, StageTransitionService.isAllowed('Approval', 'Settlement'));
    }

    @IsTest
    static void fsmBlocksUnconfiguredTransition() {
        ClaimTestData.installConfig();
        System.assertEquals(false, StageTransitionService.isAllowed('FNOL', 'Settlement'),
            'Skipping stages is not allowed');
        System.assertEquals(false, StageTransitionService.isAllowed('Closed', 'FNOL'),
            'Re-opening a closed claim is not allowed');
    }

    @IsTest
    static void reserveUsesFactorAndSeverity() {
        ClaimTestData.installConfig();
        // Liability factor 1.0, Critical multiplier 1.5 -> 100000 * 1.0 * 1.5 = 150000
        Claim__c c = ClaimTestData.claim('Liability', 'Critical', 100000);
        ReserveService.setReserves(new List<Claim__c>{ c });
        System.assertEquals(150000, c.Reserve_Amount__c);

        // Auto factor 0.8, Low multiplier 0.8 -> 100000 * 0.8 * 0.8 = 64000
        Claim__c c2 = ClaimTestData.claim('Auto', 'Low', 100000);
        ReserveService.setReserves(new List<Claim__c>{ c2 });
        System.assertEquals(64000, c2.Reserve_Amount__c);
    }

    @IsTest
    static void assignmentRoutesByTypeAndEscalatesCritical() {
        ClaimTestData.installConfig();
        Claim__c normal = ClaimTestData.claim('Health', 'Medium', 50000);
        Claim__c critical = ClaimTestData.claim('Health', 'Critical', 50000);
        AssignmentService.assign(new List<Claim__c>{ normal, critical });

        System.assertEquals('Health Claims Team', normal.Assigned_To__c);
        System.assertEquals('Senior Health Claims Team', critical.Assigned_To__c,
            'Critical claims escalate to the senior desk');
    }
}
