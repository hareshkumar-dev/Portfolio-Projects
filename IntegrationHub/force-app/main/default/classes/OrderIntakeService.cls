/**
 * OrderIntakeService — inbound integration endpoint. External systems POST
 * an order here; External_Order_Id__c is the idempotency key, so a retried
 * or duplicated delivery is detected and safely ignored rather than
 * creating a second record. Every call — success, duplicate, or error —
 * is logged to Integration_Log__c for the monitoring console. A successful
 * order publishes Order_Received__e so downstream systems can react.
 */
@RestResource(urlMapping='/integration/orders/*')
global with sharing class OrderIntakeService {

    @HttpPost
    global static void receiveOrder() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        String requestId = generateRequestId();

        try {
            Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(req.requestBody.toString());
            String externalOrderId = (String) body.get('externalOrderId');
            String customerName = (String) body.get('customerName');
            Object amountRaw = body.get('amount');

            if (String.isBlank(externalOrderId)) {
                logCall(requestId, null, 'Error', 400, 'Missing required field: externalOrderId');
                respond(res, 400, new Map<String, Object>{ 'status' => 'error', 'message' => 'Missing required field: externalOrderId' });
                return;
            }

            Decimal amount = amountRaw != null ? Decimal.valueOf(String.valueOf(amountRaw)) : 0;

            List<Integration_Order__c> existing = [
                SELECT Id
                FROM Integration_Order__c
                WHERE External_Order_Id__c = :externalOrderId
                WITH SECURITY_ENFORCED
                LIMIT 1
            ];

            if (!existing.isEmpty()) {
                logCall(requestId, existing[0].Id, 'Duplicate', 200, 'Order already processed; request ignored (idempotent).');
                respond(res, 200, new Map<String, Object>{
                    'status' => 'duplicate',
                    'externalOrderId' => externalOrderId,
                    'message' => 'Order already processed.'
                });
                return;
            }

            Integration_Order__c order = new Integration_Order__c(
                External_Order_Id__c = externalOrderId,
                Customer_Name__c = customerName,
                Amount__c = amount,
                Status__c = 'Received',
                Raw_Payload__c = req.requestBody.toString(),
                Received_At__c = Datetime.now()
            );
            insert order;

            EventBus.publish(new Order_Received__e(
                External_Order_Id__c = externalOrderId,
                Amount__c = amount,
                Status__c = 'Received'
            ));

            logCall(requestId, order.Id, 'Success', 201, 'Order received and processed.');
            respond(res, 201, new Map<String, Object>{
                'status' => 'received',
                'externalOrderId' => externalOrderId,
                'orderId' => order.Id
            });

        } catch (Exception e) {
            logCall(requestId, null, 'Error', 500, e.getMessage());
            respond(res, 500, new Map<String, Object>{ 'status' => 'error', 'message' => e.getMessage() });
        }
    }

    private static void respond(RestResponse res, Integer statusCode, Map<String, Object> body) {
        res.statusCode = statusCode;
        res.responseBody = Blob.valueOf(JSON.serialize(body));
    }

    private static void logCall(String requestId, Id orderId, String outcome, Integer statusCode, String message) {
        insert new Integration_Log__c(
            Request_Id__c = requestId,
            Order__c = orderId,
            Endpoint__c = '/integration/orders',
            Http_Method__c = 'POST',
            Status_Code__c = statusCode,
            Outcome__c = outcome,
            Message__c = message,
            Logged_At__c = Datetime.now()
        );
    }

    private static String generateRequestId() {
        return 'REQ-' + Datetime.now().getTime() + '-' + Crypto.getRandomInteger();
    }
}
