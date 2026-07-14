/**
 * Integration test: the trigger auto-dispatches on insert, rolls up
 * technician load, and writes the assignment audit — on real DML.
 */
@IsTest
private class WorkOrderTriggerTest {

    @IsTest
    static void autoAssignsBestTechnician() {
        DispatchTestData.installWeights();
        Technician__c t = DispatchTestData.technician('Alex', 'HVAC;Electrical', 'North', 3, true);
        insert t;

        Test.startTest();
        Work_Order__c wo = DispatchTestData.workOrder('AC repair', 'HVAC', 'North');
        insert wo;
        Test.stopTest();

        wo = [SELECT Status__c, Assigned_Technician__c, Match_Score__c FROM Work_Order__c WHERE Id = :wo.Id];
        System.assertEquals('Assigned', wo.Status__c, 'Auto-dispatched');
        System.assertEquals(t.Id, wo.Assigned_Technician__c, 'Assigned to the skilled in-territory tech');
        System.assertEquals(100, wo.Match_Score__c, 'Perfect skill+territory+headroom = 100');

        System.assertEquals(1, [SELECT Active_Jobs__c FROM Technician__c WHERE Id = :t.Id].Active_Jobs__c,
            'Load rolled up');
        System.assertEquals(1, [SELECT COUNT() FROM Assignment_Log__c WHERE Work_Order__c = :wo.Id],
            'Assignment audited');
    }

    @IsTest
    static void noEligibleTechnicianStaysUnassigned() {
        DispatchTestData.installWeights();
        insert DispatchTestData.technician('Plumber', 'Plumbing', 'North', 3, true);

        Test.startTest();
        Work_Order__c wo = DispatchTestData.workOrder('AC repair', 'HVAC', 'North'); // no HVAC tech
        insert wo;
        Test.stopTest();

        System.assertEquals('Unassigned', [SELECT Status__c FROM Work_Order__c WHERE Id = :wo.Id].Status__c,
            'No skilled technician ⇒ stays Unassigned');
    }

    @IsTest
    static void capacityLimitsAssignment() {
        DispatchTestData.installWeights();
        insert DispatchTestData.technician('Solo', 'HVAC', 'North', 2, true); // max 2

        Test.startTest();
        insert new List<Work_Order__c>{
            DispatchTestData.workOrder('WO1', 'HVAC', 'North'),
            DispatchTestData.workOrder('WO2', 'HVAC', 'North'),
            DispatchTestData.workOrder('WO3', 'HVAC', 'North')
        };
        Test.stopTest();

        System.assertEquals(2, [SELECT COUNT() FROM Work_Order__c WHERE Status__c = 'Assigned'],
            'Only up to capacity get assigned');
        System.assertEquals(1, [SELECT COUNT() FROM Work_Order__c WHERE Status__c = 'Unassigned'],
            'The overflow stays unassigned');
    }

    @IsTest
    static void balancesAcrossTechnicians() {
        DispatchTestData.installWeights();
        insert new List<Technician__c>{
            DispatchTestData.technician('A', 'HVAC', 'North', 5, true),
            DispatchTestData.technician('B', 'HVAC', 'North', 5, true)
        };

        Test.startTest();
        insert new List<Work_Order__c>{
            DispatchTestData.workOrder('W1', 'HVAC', 'North'),
            DispatchTestData.workOrder('W2', 'HVAC', 'North'),
            DispatchTestData.workOrder('W3', 'HVAC', 'North'),
            DispatchTestData.workOrder('W4', 'HVAC', 'North')
        };
        Test.stopTest();

        for (Technician__c t : [SELECT Active_Jobs__c FROM Technician__c]) {
            System.assertEquals(2, t.Active_Jobs__c, 'Four jobs split evenly across two technicians');
        }
    }

    @IsTest
    static void completingFreesLoad() {
        DispatchTestData.installWeights();
        Technician__c t = DispatchTestData.technician('Alex', 'HVAC', 'North', 3, true);
        insert t;
        Work_Order__c wo = DispatchTestData.workOrder('AC repair', 'HVAC', 'North');
        insert wo; // auto-assigned, load 1

        Test.startTest();
        wo.Status__c = 'Completed';
        update wo;
        Test.stopTest();

        System.assertEquals(0, [SELECT Active_Jobs__c FROM Technician__c WHERE Id = :t.Id].Active_Jobs__c,
            'Completing the job frees the technician');
    }
}
