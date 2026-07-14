/**
 * The single trigger on Work_Order__c — delegates to the handler.
 */
trigger WorkOrderTrigger on Work_Order__c (
    before insert, before update, after insert, after update, after delete
) {
    new WorkOrderTriggerHandler().run();
}
