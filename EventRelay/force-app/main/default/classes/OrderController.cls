/**
 * OrderController
 *
 * Apex controller for the `orderConsole` Lightning Web Component.
 * Note the component never publishes events itself — it just changes
 * an order's status, and the OrderTrigger → platform event → subscriber
 * pipeline produces the history. That's the decoupling in action.
 */
public with sharing class OrderController {

    @AuraEnabled(cacheable=true)
    public static List<Order__c> getOrders() {
        return [
            SELECT Id, Name, Customer_Name__c, Amount__c, Status__c
            FROM Order__c
            ORDER BY CreatedDate DESC
            LIMIT 200
        ];
    }

    // Not cacheable: history is written asynchronously by the platform-event
    // subscriber, so the console re-fetches after a change and must get live data.
    @AuraEnabled
    public static List<Order_History__c> getHistory(Id orderId) {
        return [
            SELECT Id, Name, Old_Status__c, New_Status__c, Changed_By__c, Event_Time__c
            FROM Order_History__c
            WHERE Order__c = :orderId
            ORDER BY Event_Time__c DESC, CreatedDate DESC
            LIMIT 200
        ];
    }

    /** Change an order's status. The trigger publishes the event. */
    @AuraEnabled
    public static void updateStatus(Id orderId, String status) {
        update new Order__c(Id = orderId, Status__c = status);
    }

    @AuraEnabled
    public static Id createOrder(String customerName, Decimal amount) {
        Order__c order = new Order__c(
            Customer_Name__c = customerName,
            Amount__c = amount,
            Status__c = 'Draft'
        );
        insert order;
        return order.Id;
    }

}
