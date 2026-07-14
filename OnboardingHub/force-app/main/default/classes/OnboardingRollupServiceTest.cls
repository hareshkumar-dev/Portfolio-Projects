/**
 * Tests for the onboarding roll-up trigger + service.
 *
 * Each test clears any tasks the Record-Triggered Flow may have created
 * on New Hire insert, so the assertions are deterministic regardless of
 * whether the flow is active in the running org.
 */
@isTest
private class OnboardingRollupServiceTest {

    private static New_Hire__c makeHireWithCleanSlate() {
        New_Hire__c hire = new New_Hire__c(Name = 'Test Hire', Department__c = 'Engineering');
        insert hire;
        // Remove any flow-generated tasks so the test controls the set
        delete [SELECT Id FROM Onboarding_Task__c WHERE New_Hire__c = :hire.Id];
        return hire;
    }

    private static Onboarding_Task__c task(Id hireId, String status) {
        return new Onboarding_Task__c(
            New_Hire__c = hireId,
            Subject__c = 'Task ' + status,
            Category__c = 'Paperwork',
            Status__c = status
        );
    }

    private static New_Hire__c reload(Id hireId) {
        return [SELECT Completion_Percent__c, Status__c FROM New_Hire__c WHERE Id = :hireId];
    }

    @isTest
    static void zeroWhenNoneComplete() {
        New_Hire__c hire = makeHireWithCleanSlate();
        insert new List<Onboarding_Task__c>{
            task(hire.Id, 'Not Started'),
            task(hire.Id, 'Not Started')
        };
        New_Hire__c result = reload(hire.Id);
        System.assertEquals(0, result.Completion_Percent__c, '0% when nothing is done');
        System.assertEquals('Pre-boarding', result.Status__c, 'Pre-boarding at 0%');
    }

    @isTest
    static void halfwayIsInProgress() {
        New_Hire__c hire = makeHireWithCleanSlate();
        insert new List<Onboarding_Task__c>{
            task(hire.Id, 'Completed'),
            task(hire.Id, 'Completed'),
            task(hire.Id, 'Not Started'),
            task(hire.Id, 'Not Started')
        };
        New_Hire__c result = reload(hire.Id);
        System.assertEquals(50, result.Completion_Percent__c, '2 of 4 done = 50%');
        System.assertEquals('In Progress', result.Status__c, 'In Progress between 0 and 100');
    }

    @isTest
    static void allCompleteMarksCompleted() {
        New_Hire__c hire = makeHireWithCleanSlate();
        List<Onboarding_Task__c> tasks = new List<Onboarding_Task__c>{
            task(hire.Id, 'Not Started'),
            task(hire.Id, 'Not Started')
        };
        insert tasks;

        for (Onboarding_Task__c t : tasks) t.Status__c = 'Completed';
        update tasks;

        New_Hire__c result = reload(hire.Id);
        System.assertEquals(100, result.Completion_Percent__c, 'All done = 100%');
        System.assertEquals('Completed', result.Status__c, 'Completed at 100%');
    }

    @isTest
    static void recalculatesWhenTaskDeleted() {
        New_Hire__c hire = makeHireWithCleanSlate();
        Onboarding_Task__c done = task(hire.Id, 'Completed');
        Onboarding_Task__c todo = task(hire.Id, 'Not Started');
        insert new List<Onboarding_Task__c>{ done, todo };
        System.assertEquals(50, reload(hire.Id).Completion_Percent__c, 'Baseline 50%');

        delete todo; // only the completed one remains
        New_Hire__c result = reload(hire.Id);
        System.assertEquals(100, result.Completion_Percent__c, 'Deleting the open task -> 100%');
        System.assertEquals('Completed', result.Status__c, 'Now completed');
    }
}
