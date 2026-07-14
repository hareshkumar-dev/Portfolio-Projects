/**
 * The single trigger on Subscription__c — delegates to the handler.
 */
trigger SubscriptionTrigger on Subscription__c (
    after insert, after update, after delete
) {
    new SubscriptionTriggerHandler().run();
}
