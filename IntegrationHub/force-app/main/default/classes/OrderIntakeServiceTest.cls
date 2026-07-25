@isTest
private class OrderIntakeServiceTest {

    private static RestRequest buildRequest(Map<String, Object> body) {
        RestRequest req = new RestRequest();
        req.requestUri = '/services/apexrest/integration/orders';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf(JSON.serialize(body));
        return req;
    }

    @isTest
    static void testReceiveNewOrder() {
        RestContext.request = buildRequest(new Map<String, Object>{
            'externalOrderId' => 'EXT-1001',
            'customerName' => 'Acme Corp',
            'amount' => 249.99
        });
        RestContext.response = new RestResponse();

        Test.startTest();
        OrderIntakeService.receiveOrder();
        Test.stopTest();

        System.assertEquals(201, RestContext.response.statusCode);
        List<Integration_Order__c> orders = [SELECT Id, Status__c FROM Integration_Order__c WHERE External_Order_Id__c = 'EXT-1001'];
        System.assertEquals(1, orders.size());
        System.assertEquals('Received', orders[0].Status__c);
        System.assertEquals(1, [SELECT COUNT() FROM Integration_Log__c WHERE Outcome__c = 'Success']);
    }

    @isTest
    static void testDuplicateOrderIsBlocked() {
        insert new Integration_Order__c(
            External_Order_Id__c = 'EXT-2002',
            Customer_Name__c = 'Beta LLC',
            Amount__c = 100,
            Status__c = 'Received',
            Received_At__c = Datetime.now()
        );

        RestContext.request = buildRequest(new Map<String, Object>{
            'externalOrderId' => 'EXT-2002',
            'customerName' => 'Beta LLC',
            'amount' => 100
        });
        RestContext.response = new RestResponse();

        Test.startTest();
        OrderIntakeService.receiveOrder();
        Test.stopTest();

        System.assertEquals(200, RestContext.response.statusCode);
        System.assertEquals(1, [SELECT COUNT() FROM Integration_Order__c WHERE External_Order_Id__c = 'EXT-2002']);
        System.assertEquals(1, [SELECT COUNT() FROM Integration_Log__c WHERE Outcome__c = 'Duplicate']);
    }

    @isTest
    static void testMissingExternalOrderIdReturns400() {
        RestContext.request = buildRequest(new Map<String, Object>{
            'customerName' => 'Gamma Inc',
            'amount' => 50
        });
        RestContext.response = new RestResponse();

        Test.startTest();
        OrderIntakeService.receiveOrder();
        Test.stopTest();

        System.assertEquals(400, RestContext.response.statusCode);
        System.assertEquals(1, [SELECT COUNT() FROM Integration_Log__c WHERE Outcome__c = 'Error']);
    }
}
