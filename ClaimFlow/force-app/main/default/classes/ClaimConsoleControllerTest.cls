/**
 * Tests the UI controller: seeding, summary, advance (legal + illegal),
 * and history read.
 */
@IsTest
private class ClaimConsoleControllerTest {

    @IsTest
    static void summarisesClaims() {
        ClaimTestData.installConfig();

        Test.startTest();
        insert new List<Claim__c>{
            ClaimTestData.claim('Auto', 'High', 400000),
            ClaimTestData.claim('Property', 'Critical', 1200000),
            ClaimTestData.claim('Health', 'Medium', 90000),
            ClaimTestData.claim('Liability', 'Low', 250000)
        };
        Test.stopTest();

        ClaimConsoleController.Summary s = ClaimConsoleController.getSummary();
        System.assertEquals(4, s.open, 'All claims still open');
        System.assertEquals(4, ClaimConsoleController.getClaims().size());
    }

    @IsTest
    static void advanceLegalThenReadHistory() {
        ClaimTestData.installConfig();
        Claim__c c = ClaimTestData.claim('Auto', 'Medium', 100000);
        insert c;

        Test.startTest();
        ClaimConsoleController.advanceStage(c.Id, 'Investigation');
        Test.stopTest();

        System.assertEquals('Investigation', [SELECT Stage__c FROM Claim__c WHERE Id = :c.Id].Stage__c);
        System.assert(ClaimConsoleController.getHistory(c.Id).size() >= 2, 'History captured the transition');
    }

    @IsTest
    static void advanceIllegalThrowsFriendlyError() {
        ClaimTestData.installConfig();
        Claim__c c = ClaimTestData.claim('Auto', 'Medium', 100000);
        insert c;

        Test.startTest();
        Boolean threw = false;
        try {
            ClaimConsoleController.advanceStage(c.Id, 'Closed'); // illegal from FNOL
        } catch (AuraHandledException e) {
            threw = true;
        }
        Test.stopTest();

        System.assert(threw, 'Illegal advance should raise an AuraHandledException');
    }

    @IsTest
    static void runAgingReturnsJobId() {
        ClaimTestData.installConfig();
        insert ClaimTestData.claim('Auto', 'Medium', 100000);
        Test.startTest();
        Id jobId = ClaimConsoleController.runAgingNow();
        Test.stopTest();
        System.assertNotEquals(null, jobId);
    }
}
