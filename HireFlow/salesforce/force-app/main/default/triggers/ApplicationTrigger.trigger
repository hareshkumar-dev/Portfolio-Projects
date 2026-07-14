/**
 * Trigger on Application__c.
 *
 * Delegates all logic to ApplicationTriggerHandler (a thin trigger over
 * a handler class is the standard Salesforce pattern — it keeps logic
 * testable and out of the trigger body).
 */
trigger ApplicationTrigger on Application__c (before insert, before update) {
    ApplicationTriggerHandler.handle(Trigger.new, Trigger.oldMap, Trigger.isInsert);
}
