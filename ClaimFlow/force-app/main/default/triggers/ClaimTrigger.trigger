/**
 * The single trigger on Claim__c — delegates to ClaimTriggerHandler.
 */
trigger ClaimTrigger on Claim__c (
    before insert, before update, after insert, after update
) {
    new ClaimTriggerHandler().run();
}
