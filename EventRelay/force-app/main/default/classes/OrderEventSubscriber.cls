/**
 * OrderEventSubscriber
 *
 * Consumes Order_Status_Event__e events and writes an audit trail into
 * Order_History__c. Bulk-safe: one insert for the whole batch of events.
 */
public with sharing class OrderEventSubscriber {

    public static void handle(List<Order_Status_Event__e> events) {
        List<Order_History__c> history = new List<Order_History__c>();

        for (Order_Status_Event__e event : events) {
            history.add(new Order_History__c(
                Order__c = (Id) event.Order_Id__c,
                Old_Status__c = event.Old_Status__c,
                New_Status__c = event.New_Status__c,
                Changed_By__c = event.Changed_By__c,
                Event_Time__c = System.now()
            ));
        }

        if (!history.isEmpty()) {
            insert history;
        }
    }
}
