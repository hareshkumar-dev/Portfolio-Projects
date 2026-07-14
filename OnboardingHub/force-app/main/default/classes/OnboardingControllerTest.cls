/**
 * Tests for OnboardingController (the tracker's Apex controller).
 */
@isTest
private class OnboardingControllerTest {

    @isTest
    static void createsAndListsHire() {
        Test.startTest();
        Id hireId = OnboardingController.createNewHire(
            'Asha Menon', Date.today(), 'Engineering', 'Backend Engineer', 'asha@example.com'
        );
        Test.stopTest();

        System.assertNotEquals(null, hireId, 'Should return the new hire Id');

        List<New_Hire__c> hires = OnboardingController.getNewHires();
        Boolean found = false;
        for (New_Hire__c h : hires) {
            if (h.Id == hireId) found = true;
        }
        System.assert(found, 'The new hire should appear in the list');
    }

    @isTest
    static void updatesTaskStatusAndRollsUp() {
        New_Hire__c hire = new New_Hire__c(Name = 'Test Hire', Department__c = 'Sales');
        insert hire;
        // Control the task set regardless of the flow
        delete [SELECT Id FROM Onboarding_Task__c WHERE New_Hire__c = :hire.Id];

        Onboarding_Task__c t = new Onboarding_Task__c(
            New_Hire__c = hire.Id, Subject__c = 'Sign offer letter',
            Category__c = 'Paperwork', Status__c = 'Not Started'
        );
        insert t;

        Test.startTest();
        OnboardingController.updateTaskStatus(t.Id, 'Completed');
        Test.stopTest();

        New_Hire__c updated = [SELECT Completion_Percent__c, Status__c FROM New_Hire__c WHERE Id = :hire.Id];
        System.assertEquals(100, updated.Completion_Percent__c, 'Only task completed -> 100%');
        System.assertEquals('Completed', updated.Status__c, 'Hire marked Completed');

        List<Onboarding_Task__c> tasks = OnboardingController.getTasks(hire.Id);
        System.assertEquals(1, tasks.size(), 'One task expected');
        System.assertEquals('Completed', tasks[0].Status__c, 'Task reads as completed');
    }
}
