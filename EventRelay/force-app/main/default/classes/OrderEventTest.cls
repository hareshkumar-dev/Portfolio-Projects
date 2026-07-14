/**
 * Tests for the platform-event pipeline: publisher trigger →
 * Order_Status_Event__e → subscriber trigger → Order_History__c.
 *
 * Platform events are delivered asynchronously, so the tests call
 * Test.getEventBus().deliver() to force synchronous delivery of the
 * events published during the test, then assert on the history the
 * subscriber wrote.
 */
@isTest
private class OrderEventTest {

    private static List<Order_History__c> historyFor(Id orderId) {
        return [
            SELECT Old_Status__c, New_Status__c, Changed_By__c
            FROM Order_History__c
            WHERE Order__c = :orderId
        ];
    }

    @isTest
    static void statusChangeCreatesHistory() {
        Order__c order = new Order__c(Customer_Name__c = 'Acme', Amount__c = 100, Status__c = 'Draft');
        insert order;

        Test.startTest();
        order.Status__c = 'Shipped';
        update order;              // publisher fires, event queued
        Test.getEventBus().deliver(); // force subscriber to run now
        Test.stopTest();

        List<Order_History__c> history = historyFor(order.Id);
        System.assertEquals(1, history.size(), 'One history record expected');
        System.assertEquals('Draft', history[0].Old_Status__c, 'Captured old status');
        System.assertEquals('Shipped', history[0].New_Status__c, 'Captured new status');
        System.assertNotEquals(null, history[0].Changed_By__c, 'Recorded who changed it');
    }

    @isTest
    static void noStatusChangeCreatesNoHistory() {
        Order__c order = new Order__c(Customer_Name__c = 'Globex', Amount__c = 50, Status__c = 'Draft');
        insert order;

        Test.startTest();
        order.Amount__c = 75;     // change something other than status
        update order;
        Test.getEventBus().deliver();
        Test.stopTest();

        System.assertEquals(0, historyFor(order.Id).size(), 'No event should fire without a status change');
    }

    @isTest
    static void multipleTransitionsAreAllLogged() {
        Order__c order = new Order__c(Customer_Name__c = 'Initech', Amount__c = 200, Status__c = 'Draft');
        insert order;

        Test.startTest();
        order.Status__c = 'Placed';
        update order;
        Test.getEventBus().deliver();

        order.Status__c = 'Shipped';
        update order;
        Test.getEventBus().deliver();
        Test.stopTest();

        System.assertEquals(2, historyFor(order.Id).size(), 'Each transition should be logged');
    }

    @isTest
    static void bulkStatusChangesEachPublish() {
        List<Order__c> orders = new List<Order__c>();
        for (Integer i = 0; i < 5; i++) {
            orders.add(new Order__c(Customer_Name__c = 'Cust ' + i, Amount__c = 10, Status__c = 'Draft'));
        }
        insert orders;

        Test.startTest();
        for (Order__c o : orders) o.Status__c = 'Delivered';
        update orders;
        Test.getEventBus().deliver();
        Test.stopTest();

        Integer total = [SELECT COUNT() FROM Order_History__c];
        System.assertEquals(5, total, 'One history record per order');
    }
}
