/**
 * OrderEventPublisher
 *
 * Publishes an Order_Status_Event__e for every order whose Status__c
 * changed in the trigger batch. Publishing is bulkified — one
 * EventBus.publish call for the whole batch.
 */
public with sharing class OrderEventPublisher {

    public static void publishStatusChanges(List<Order__c> newOrders, Map<Id, Order__c> oldMap) {
        List<Order_Status_Event__e> events = new List<Order_Status_Event__e>();

        for (Order__c order : newOrders) {
            Order__c previous = oldMap.get(order.Id);
            if (order.Status__c != previous.Status__c) {
                events.add(new Order_Status_Event__e(
                    Order_Id__c = order.Id,
                    Order_Number__c = order.Name,
                    Old_Status__c = previous.Status__c,
                    New_Status__c = order.Status__c,
                    Changed_By__c = UserInfo.getName()
                ));
            }
        }

        if (events.isEmpty()) return;

        List<Database.SaveResult> results = EventBus.publish(events);
        for (Database.SaveResult sr : results) {
            if (!sr.isSuccess()) {
                for (Database.Error err : sr.getErrors()) {
                    System.debug('Failed to publish order event: ' + err.getMessage());
                }
            }
        }
    }
}
