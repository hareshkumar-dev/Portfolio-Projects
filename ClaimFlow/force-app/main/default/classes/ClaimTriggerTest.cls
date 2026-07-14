/**
 * Integration test: the trigger orchestrates assignment, reserve, the
 * FSM guard, and the audit trail on real DML.
 */
@IsTest
private class ClaimTriggerTest {

    @IsTest
    static void insertAssignsReservesStampsAndAudits() {
        ClaimTestData.installConfig();

        Test.startTest();
        Claim__c c = ClaimTestData.claim('Property', 'High', 200000);
        insert c;
        Test.stopTest();

        c = [SELECT Stage__c, Assigned_To__c, Reserve_Amount__c, Stage_Changed_At__c FROM Claim__c WHERE Id = :c.Id];
        System.assertEquals('FNOL', c.Stage__c, 'New claims start at FNOL');
        System.assertEquals('Property Claims Team', c.Assigned_To__c, 'Assigned by type');
        // Property 0.9 * High 1.2 * 200000 = 216000
        System.assertEquals(216000, c.Reserve_Amount__c, 'Reserve computed');
        System.assertNotEquals(null, c.Stage_Changed_At__c, 'Stage entry stamped');

        System.assertEquals(1, [SELECT COUNT() FROM Claim_History__c WHERE Claim__c = :c.Id],
            'Creation recorded in history');
    }

    @IsTest
    static void legalTransitionSucceedsAndAudits() {
        ClaimTestData.installConfig();
        Claim__c c = ClaimTestData.claim('Auto', 'Medium', 100000);
        insert c;

        Test.startTest();
        c.Stage__c = 'Investigation';
        update c;
        Test.stopTest();

        c = [SELECT Stage__c FROM Claim__c WHERE Id = :c.Id];
        System.assertEquals('Investigation', c.Stage__c);
        System.assertEquals(2, [SELECT COUNT() FROM Claim_History__c WHERE Claim__c = :c.Id],
            'Creation + one transition recorded');
    }

    @IsTest
    static void illegalTransitionIsBlocked() {
        ClaimTestData.installConfig();
        Claim__c c = ClaimTestData.claim('Auto', 'Medium', 100000);
        insert c; // FNOL

        Test.startTest();
        Boolean blocked = false;
        try {
            c.Stage__c = 'Settlement'; // skips Investigation + Approval
            update c;
        } catch (DmlException e) {
            blocked = true;
            System.assert(e.getMessage().contains('Illegal claim transition'), 'FSM error surfaced');
        }
        Test.stopTest();

        System.assert(blocked, 'The state machine must block stage-skipping');
        System.assertEquals('FNOL', [SELECT Stage__c FROM Claim__c WHERE Id = :c.Id].Stage__c,
            'Stage unchanged after a blocked transition');
    }
}
