/**
 * OnboardingController
 *
 * Apex controller for the `onboardingTracker` Lightning Web Component:
 * list new hires with progress, read one hire's checklist, advance a
 * task's status, and create a new hire (which triggers the Flow that
 * generates the checklist).
 */
public with sharing class OnboardingController {

    /** All new hires, newest first, with their progress fields. */
    @AuraEnabled(cacheable=true)
    public static List<New_Hire__c> getNewHires() {
        return [
            SELECT Id, Name, Department__c, Role__c, Start_Date__c,
                   Status__c, Completion_Percent__c
            FROM New_Hire__c
            ORDER BY CreatedDate DESC
            LIMIT 200
        ];
    }

    /**
     * One hire's onboarding tasks, ordered by category then subject.
     * Not cacheable: fetched on demand and must reflect the latest task
     * statuses after a toggle (a cached result would go stale).
     */
    @AuraEnabled
    public static List<Onboarding_Task__c> getTasks(Id hireId) {
        return [
            SELECT Id, Name, Subject__c, Category__c, Status__c, Due_Date__c
            FROM Onboarding_Task__c
            WHERE New_Hire__c = :hireId
            ORDER BY Category__c ASC, Subject__c ASC
        ];
    }

    /** Advance (or reset) a task's status. The roll-up trigger updates progress. */
    @AuraEnabled
    public static void updateTaskStatus(Id taskId, String status) {
        update new Onboarding_Task__c(Id = taskId, Status__c = status);
    }

    /**
     * Create a new hire. Inserting the record fires the
     * "New Hire Onboarding Tasks" flow, which builds the checklist.
     */
    @AuraEnabled
    public static Id createNewHire(String name, Date startDate, String department, String role, String email) {
        New_Hire__c hire = new New_Hire__c(
            Name = name,
            Start_Date__c = startDate,
            Department__c = department,
            Role__c = role,
            Email__c = email
        );
        insert hire;
        return hire.Id;
    }
}
