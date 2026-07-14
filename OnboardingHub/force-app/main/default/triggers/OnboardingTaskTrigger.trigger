/**
 * Trigger on Onboarding_Task__c.
 *
 * Complements the Record-Triggered Flow (which *creates* the checklist)
 * by rolling task completion back up to the parent New Hire: it keeps
 * Completion_Percent__c and Status__c in sync as tasks change.
 */
trigger OnboardingTaskTrigger on Onboarding_Task__c (
    after insert, after update, after delete, after undelete
) {
    List<Onboarding_Task__c> records =
        Trigger.isDelete ? Trigger.old : Trigger.new;
    OnboardingRollupService.recalculate(records);
}
