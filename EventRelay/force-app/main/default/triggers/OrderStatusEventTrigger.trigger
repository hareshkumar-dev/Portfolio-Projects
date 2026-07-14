/**
 * Trigger on Order_Status_Event__e — the SUBSCRIBER side.
 *
 * Fires after the platform event is delivered (asynchronously, as the
 * Automated Process user) and reacts by writing an Order_History__c
 * audit record. It never touches the order that produced the event —
 * publisher and subscriber are fully decoupled, so new consumers can
 * be added without changing the order code.
 */
trigger OrderStatusEventTrigger on Order_Status_Event__e (after insert) {
    OrderEventSubscriber.handle(Trigger.new);
}
