/**
 * Unit tests for the SERVICE layer — pure, no DML beyond the config
 * injection. Exercises target-setting, first-response/closure handling,
 * and breach evaluation.
 */
@IsTest
private class SlaServiceTest {

    @IsTest
    static void appliesTargetsFromPolicy() {
        SlaTestData.installPolicies();
        Case c = new Case(Subject = 'Test', Service_Tier__c = 'Platinum');

        Test.startTest();
        SlaService.applyTargets(new List<Case>{ c });
        Test.stopTest();

        System.assertNotEquals(null, c.Response_Target__c, 'Response target set');
        System.assertNotEquals(null, c.Resolution_Target__c, 'Resolution target set');
        System.assertEquals('On Track', c.SLA_Status__c, 'Status initialised');
        // Platinum = 15 min response, 4 h resolution
        System.assert(c.Resolution_Target__c > c.Response_Target__c, 'Resolution after response');
    }

    @IsTest
    static void defaultsToStandardWhenTierBlank() {
        SlaTestData.installPolicies();
        Case c = new Case(Subject = 'No tier');
        SlaService.applyTargets(new List<Case>{ c });
        System.assertNotEquals(null, c.Resolution_Target__c, 'Standard policy applied');
    }

    @IsTest
    static void stampsFirstResponseOnce() {
        Case c = new Case(Id = fakeId(), Status = 'Working');
        Case prior = new Case(Id = c.Id, Status = 'New');
        SlaService.handleUpdates(
            new List<Case>{ c },
            new Map<Id, Case>{ c.Id => prior }
        );
        System.assertNotEquals(null, c.First_Responded_At__c, 'First response stamped');
    }

    @IsTest
    static void evaluatesBreaches() {
        Case overdue = new Case(
            Id = fakeId(),
            SLA_Status__c = 'On Track',
            Resolution_Target__c = Datetime.now().addHours(-1)
        );
        List<Case> changed = SlaService.evaluateBreaches(new List<Case>{ overdue });
        System.assertEquals(1, changed.size(), 'Overdue case flagged');
        System.assertEquals('Resolution Breached', overdue.SLA_Status__c);
        System.assertEquals(true, overdue.Is_Escalated__c);
        System.assertEquals('High', overdue.Priority);
    }

    // A synthetic Case Id for pure in-memory tests (no DML).
    private static Id fakeId() {
        return Case.SObjectType.getDescribe().getKeyPrefix() + '000000000001AAA';
    }
}
