/**
 * Unit tests for the matching engine — scoring and ranking a pool,
 * pure and DML-free.
 */
@IsTest
private class MatchingServiceTest {

    private static MatchWeightService.Weights weights() {
        MatchWeightService.Weights w = new MatchWeightService.Weights();
        w.skill = 50; w.territory = 30; w.load = 20;
        return w;
    }

    @IsTest
    static void skilledInTerritoryBeatsOutOfTerritory() {
        Technician__c inTerr = DispatchTestData.technician('In', 'HVAC', 'North', 3, true);
        inTerr.Id = fakeTech(1);
        Technician__c outTerr = DispatchTestData.technician('Out', 'HVAC', 'South', 3, true);
        outTerr.Id = fakeTech(2);

        Work_Order__c wo = DispatchTestData.workOrder('AC', 'HVAC', 'North');
        Map<Id, Integer> load = new Map<Id, Integer>{ inTerr.Id => 0, outTerr.Id => 0 };

        MatchingService.Result r = MatchingService.rank(
            wo, new List<Technician__c>{ inTerr, outTerr }, load, weights());

        System.assertEquals(inTerr.Id, r.technicianId, 'Same-territory technician wins');
        System.assertEquals(2, r.candidates, 'Both were eligible on skill');
    }

    @IsTest
    static void wrongSkillIsIneligible() {
        Technician__c plumber = DispatchTestData.technician('Plumber', 'Plumbing', 'North', 3, true);
        plumber.Id = fakeTech(1);
        Work_Order__c wo = DispatchTestData.workOrder('AC', 'HVAC', 'North');

        MatchingService.Result r = MatchingService.rank(
            wo, new List<Technician__c>{ plumber },
            new Map<Id, Integer>{ plumber.Id => 0 }, weights());

        System.assertEquals(null, r, 'No skill match ⇒ no eligible technician');
    }

    @IsTest
    static void technicianAtCapacityIsExcluded() {
        Technician__c full = DispatchTestData.technician('Full', 'HVAC', 'North', 2, true);
        full.Id = fakeTech(1);
        Work_Order__c wo = DispatchTestData.workOrder('AC', 'HVAC', 'North');

        MatchingService.Result r = MatchingService.rank(
            wo, new List<Technician__c>{ full },
            new Map<Id, Integer>{ full.Id => 2 }, weights()); // already at Max_Jobs = 2

        System.assertEquals(null, r, 'A technician at capacity is not eligible');
    }

    @IsTest
    static void lighterLoadWinsOnTie() {
        Technician__c busy = DispatchTestData.technician('Busy', 'HVAC', 'North', 5, true);
        busy.Id = fakeTech(1);
        Technician__c free = DispatchTestData.technician('Free', 'HVAC', 'North', 5, true);
        free.Id = fakeTech(2);
        Work_Order__c wo = DispatchTestData.workOrder('AC', 'HVAC', 'North');

        // Same skill + territory; free has lower load so higher headroom.
        MatchingService.Result r = MatchingService.rank(
            wo, new List<Technician__c>{ busy, free },
            new Map<Id, Integer>{ busy.Id => 3, free.Id => 0 }, weights());

        System.assertEquals(free.Id, r.technicianId, 'Lower-load technician preferred');
    }

    private static Id fakeTech(Integer n) {
        return Technician__c.SObjectType.getDescribe().getKeyPrefix() + '00000000000' + String.valueOf(n).leftPad(4, '0');
    }
}
