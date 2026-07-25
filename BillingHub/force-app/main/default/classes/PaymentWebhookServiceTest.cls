@isTest
private class PaymentWebhookServiceTest {

    private static RestRequest buildRequest(Map<String, Object> body) {
        RestRequest req = new RestRequest();
        req.requestUri = '/services/apexrest/billing/payments';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf(JSON.serialize(body));
        return req;
    }

    private static Id createInvoice(String status, Integer attempts) {
        Subscription__c sub = new Subscription__c(
            Customer_Name__c = 'Test Customer',
            Plan_Name__c = 'Starter',
            Monthly_Amount__c = 49,
            Status__c = 'Active',
            Start_Date__c = Date.today(),
            Next_Billing_Date__c = Date.today().addMonths(1)
        );
        insert sub;

        Invoice__c inv = new Invoice__c(
            Subscription__c = sub.Id,
            Amount__c = 49,
            Status__c = status,
            Due_Date__c = Date.today(),
            Attempt_Count__c = attempts
        );
        insert inv;
        return inv.Id;
    }

    @isTest
    static void testSuccessfulPaymentMarksInvoicePaid() {
        Id invoiceId = createInvoice('Pending', 0);

        RestContext.request = buildRequest(new Map<String, Object>{
            'externalPaymentId' => 'PAY-1001',
            'invoiceId' => invoiceId,
            'outcome' => 'succeeded',
            'amount' => 49
        });
        RestContext.response = new RestResponse();

        Test.startTest();
        PaymentWebhookService.receivePayment();
        Test.stopTest();

        System.assertEquals(200, RestContext.response.statusCode);
        Invoice__c inv = [SELECT Status__c FROM Invoice__c WHERE Id = :invoiceId];
        System.assertEquals('Paid', inv.Status__c);
        System.assertEquals(1, [SELECT COUNT() FROM Payment_Event_Log__c WHERE Outcome__c = 'Succeeded']);
    }

    @isTest
    static void testDuplicatePaymentEventIsIgnored() {
        Id invoiceId = createInvoice('Pending', 0);
        insert new Payment_Event_Log__c(External_Payment_Id__c = 'PAY-2002', Invoice__c = invoiceId, Outcome__c = 'Succeeded', Message__c = 'first delivery');

        RestContext.request = buildRequest(new Map<String, Object>{
            'externalPaymentId' => 'PAY-2002',
            'invoiceId' => invoiceId,
            'outcome' => 'succeeded',
            'amount' => 49
        });
        RestContext.response = new RestResponse();

        Test.startTest();
        PaymentWebhookService.receivePayment();
        Test.stopTest();

        System.assertEquals(200, RestContext.response.statusCode);
        Invoice__c inv = [SELECT Status__c FROM Invoice__c WHERE Id = :invoiceId];
        System.assertEquals('Pending', inv.Status__c); // unchanged — duplicate was ignored
        System.assertEquals(1, [SELECT COUNT() FROM Payment_Event_Log__c WHERE Outcome__c = 'Duplicate']);
    }

    @isTest
    static void testFailedPaymentSchedulesRetry() {
        Id invoiceId = createInvoice('Pending', 0);

        RestContext.request = buildRequest(new Map<String, Object>{
            'externalPaymentId' => 'PAY-3003',
            'invoiceId' => invoiceId,
            'outcome' => 'failed',
            'amount' => 49
        });
        RestContext.response = new RestResponse();

        Test.startTest();
        PaymentWebhookService.receivePayment();
        Test.stopTest();

        Invoice__c inv = [SELECT Status__c, Attempt_Count__c FROM Invoice__c WHERE Id = :invoiceId];
        System.assertEquals('Failed', inv.Status__c);
        System.assertEquals(1, inv.Attempt_Count__c);
    }

    @isTest
    static void testFinalFailedAttemptSuspendsSubscription() {
        Id invoiceId = createInvoice('Pending', 2);
        Invoice__c inv = [SELECT Subscription__c FROM Invoice__c WHERE Id = :invoiceId];

        RestContext.request = buildRequest(new Map<String, Object>{
            'externalPaymentId' => 'PAY-4004',
            'invoiceId' => invoiceId,
            'outcome' => 'failed',
            'amount' => 49
        });
        RestContext.response = new RestResponse();

        Test.startTest();
        PaymentWebhookService.receivePayment();
        Test.stopTest();

        Subscription__c sub = [SELECT Status__c FROM Subscription__c WHERE Id = :inv.Subscription__c];
        System.assertEquals('Suspended', sub.Status__c);
    }

    @isTest
    static void testInvoiceNotFoundReturns404() {
        RestContext.request = buildRequest(new Map<String, Object>{
            'externalPaymentId' => 'PAY-5005',
            'invoiceId' => '001000000000000AAA',
            'outcome' => 'succeeded',
            'amount' => 10
        });
        RestContext.response = new RestResponse();

        Test.startTest();
        PaymentWebhookService.receivePayment();
        Test.stopTest();

        System.assertEquals(404, RestContext.response.statusCode);
    }

    @isTest
    static void testMissingFieldsReturns400() {
        RestContext.request = buildRequest(new Map<String, Object>{ 'outcome' => 'succeeded' });
        RestContext.response = new RestResponse();

        Test.startTest();
        PaymentWebhookService.receivePayment();
        Test.stopTest();

        System.assertEquals(400, RestContext.response.statusCode);
    }
}
