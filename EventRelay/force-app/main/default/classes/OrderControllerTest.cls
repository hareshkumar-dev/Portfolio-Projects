/**
 * Tests for OrderController (the console's Apex controller).
 */
@isTest
private class OrderControllerTest {

    @isTest
    static void listsOrders() {
        Test.startTest();
        OrderController.createOrder('Acme Corp', 4599);
        OrderController.createOrder('Globex Ltd', 1299);
        Test.stopTest();

        System.assert(OrderController.getOrders().size() >= 2, 'Orders should be listed');
    }

    @isTest
    static void createOrderReturnsId() {
        Test.startTest();
        Id id = OrderController.createOrder('Wayne Enterprises', 999);
        Test.stopTest();
        System.assertNotEquals(null, id, 'createOrder returns the new Id');
    }

    @isTest
    static void updateStatusDrivesHistoryThroughTheEvent() {
        Id orderId = OrderController.createOrder('Stark Industries', 1500);

        Test.startTest();
        OrderController.updateStatus(orderId, 'Placed');
        Test.getEventBus().deliver();
        Test.stopTest();

        List<Order_History__c> history = OrderController.getHistory(orderId);
        System.assertEquals(1, history.size(), 'Status change should have produced history');
        System.assertEquals('Placed', history[0].New_Status__c, 'History reflects the new status');
    }
}
