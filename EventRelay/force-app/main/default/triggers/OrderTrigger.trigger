/**
 * Trigger on Order__c — the PUBLISHER side.
 *
 * When an order's status changes, it publishes an Order_Status_Event__e
 * rather than writing history itself. The order transaction stays lean
 * and knows nothing about who consumes the event — that decoupling is
 * the whole point of the platform-event pattern.
 */
trigger OrderTrigger on Order__c (after update) {
    OrderEventPublisher.publishStatusChanges(Trigger.new, Trigger.oldMap);
}
