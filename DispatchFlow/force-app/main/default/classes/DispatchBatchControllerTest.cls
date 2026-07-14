/**
 * Tests the rebalance batch + scheduler and the console controller.
 */
@IsTest
private class DispatchBatchControllerTest {

    @IsTest
    static void rebalanceAssignsBacklog() {
        DispatchTestData.installWeights();
        // No technician yet -> the order can't be dispatched at insert.
        Work_Order__c wo = DispatchTestData.workOrder('Leak', 'Plumbing', 'South');
        insert wo;
        System.assertEquals('Unassigned', [SELECT Status__c FROM Work_Order__c WHERE Id = :wo.Id].Status__c);

        // A suitable technician becomes available; the batch works the backlog.
        insert DispatchTestData.technician('Bina', 'Plumbing', 'South', 3, true);

        Test.startTest();
        Database.executeBatch(new RebalanceBatch(), 200);
        Test.stopTest();

        System.assertEquals('Assigned', [SELECT Status__c FROM Work_Order__c WHERE Id = :wo.Id].Status__c,
            'Backlog assigned by the rebalance batch');
    }

    @IsTest
    static void schedulerEnqueues() {
        DispatchTestData.installWeights();
        Test.startTest();
        String jobId = System.schedule('Rebalance Test', '0 0 2 * * ?', new RebalanceScheduler());
        Test.stopTest();
        System.assertNotEquals(null, [SELECT Id FROM CronTrigger WHERE Id = :jobId]);
    }

    @IsTest
    static void controllerSummaryAndLists() {
        DispatchTestData.installWeights();
        insert new List<Technician__c>{
            DispatchTestData.technician('Alex', 'HVAC', 'North', 3, true),
            DispatchTestData.technician('Bina', 'Plumbing', 'South', 3, true)
        };

        Test.startTest();
        // One order a technician can take (auto-dispatched) and one nobody is
        // skilled for (stays in the backlog).
        insert DispatchTestData.workOrder('AC repair', 'HVAC', 'North');
        insert DispatchTestData.workOrder('Network drop', 'Networking', 'North');
        Test.stopTest();

        DispatchConsoleController.Summary s = DispatchConsoleController.getSummary();
        System.assert(s.assigned >= 1, 'The HVAC order auto-dispatched');
        System.assert(s.unassigned >= 1, 'The networking order has no eligible tech');
        System.assertEquals(2, DispatchConsoleController.getWorkOrders().size());
        System.assert(!DispatchConsoleController.getTechnicians().isEmpty(), 'Technicians listed');
    }

    @IsTest
    static void manualReassignUpdatesLoads() {
        DispatchTestData.installWeights();
        Technician__c a = DispatchTestData.technician('A', 'HVAC', 'North', 3, true);
        Technician__c b = DispatchTestData.technician('B', 'HVAC', 'North', 3, true);
        insert new List<Technician__c>{ a, b };

        // Force assignment to A by making B unavailable at insert.
        b.Is_Available__c = false;
        update b;
        Work_Order__c wo = DispatchTestData.workOrder('AC', 'HVAC', 'North');
        insert wo; // -> A
        b.Is_Available__c = true;
        update b;

        Test.startTest();
        DispatchConsoleController.reassign(wo.Id, b.Id);
        Test.stopTest();

        System.assertEquals(b.Id, [SELECT Assigned_Technician__c FROM Work_Order__c WHERE Id = :wo.Id].Assigned_Technician__c);
        System.assertEquals(0, [SELECT Active_Jobs__c FROM Technician__c WHERE Id = :a.Id].Active_Jobs__c, 'A freed');
        System.assertEquals(1, [SELECT Active_Jobs__c FROM Technician__c WHERE Id = :b.Id].Active_Jobs__c, 'B loaded');
    }
}
