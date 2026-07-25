@isTest
private class IntegrationConsoleControllerTest {

    @TestSetup
    static void setup() {
        Integration_Order__c order = new Integration_Order__c(
            External_Order_Id__c = 'EXT-9001',
            Customer_Name__c = 'Delta Co',
            Amount__c = 500,
            Status__c = 'Received',
            Received_At__c = Datetime.now()
        );
        insert order;

        insert new List<Integration_Log__c>{
            new Integration_Log__c(Order__c = order.Id, Endpoint__c = '/integration/orders', Http_Method__c = 'POST', Status_Code__c = 201, Outcome__c = 'Success', Message__c = 'Order received and processed.', Request_Id__c = 'REQ-1', Logged_At__c = Datetime.now()),
            new Integration_Log__c(Endpoint__c = '/integration/orders', Http_Method__c = 'POST', Status_Code__c = 400, Outcome__c = 'Error', Message__c = 'Missing required field: externalOrderId', Request_Id__c = 'REQ-2', Logged_At__c = Datetime.now()),
            new Integration_Log__c(Order__c = order.Id, Endpoint__c = '/integration/orders', Http_Method__c = 'POST', Status_Code__c = 200, Outcome__c = 'Duplicate', Message__c = 'Order already processed.', Request_Id__c = 'REQ-3', Logged_At__c = Datetime.now())
        };
    }

    @isTest
    static void testGetSummary() {
        Test.startTest();
        IntegrationConsoleController.Summary s = IntegrationConsoleController.getSummary();
        Test.stopTest();

        System.assertEquals(1, s.receivedToday);
        System.assertEquals(1, s.duplicatesBlocked);
        System.assertEquals(1, s.errors);
        System.assertEquals(1, s.totalOrders);
    }

    @isTest
    static void testGetRecentLogs() {
        Test.startTest();
        List<Integration_Log__c> logs = IntegrationConsoleController.getRecentLogs();
        Test.stopTest();

        System.assertEquals(3, logs.size());
    }
}
