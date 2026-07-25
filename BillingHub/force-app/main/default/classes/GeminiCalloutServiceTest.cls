@isTest
private class GeminiCalloutServiceTest {

    private class GeminiMock implements HttpCalloutMock {
        Integer statusCode;
        GeminiMock(Integer statusCode) { this.statusCode = statusCode; }
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(statusCode);
            res.setBody(statusCode == 200
                ? '{"candidates":[{"content":{"parts":[{"text":"Mock AI response."}]}}]}'
                : '{"error":{"message":"bad request"}}');
            return res;
        }
    }

    @isTest
    static void testGenerateSuccess() {
        GeminiCalloutService.bypassConfigForTest = true;
        Test.setMock(HttpCalloutMock.class, new GeminiMock(200));

        Test.startTest();
        String result = GeminiCalloutService.generate('Analyze this churn reason.');
        Test.stopTest();

        System.assertEquals('Mock AI response.', result);
    }

    @isTest
    static void testGenerateHttpError() {
        GeminiCalloutService.bypassConfigForTest = true;
        Test.setMock(HttpCalloutMock.class, new GeminiMock(500));

        Test.startTest();
        try {
            GeminiCalloutService.generate('Analyze this churn reason.');
            System.assert(false, 'Expected a CalloutException.');
        } catch (GeminiCalloutService.CalloutException e) {
            System.assert(e.getMessage().contains('500'));
        }
        Test.stopTest();
    }

    @isTest
    static void testMissingApiKeyThrows() {
        GeminiCalloutService.simulateMissingKeyForTest = true;
        Test.startTest();
        try {
            GeminiCalloutService.generate('Analyze this churn reason.');
            System.assert(false, 'Expected a CalloutException.');
        } catch (GeminiCalloutService.CalloutException e) {
            System.assert(e.getMessage().contains('not configured'));
        }
        Test.stopTest();
    }

    private class RetryThenSucceedMock implements HttpCalloutMock {
        Integer callCount = 0;
        Integer failCount;
        RetryThenSucceedMock(Integer failCount) { this.failCount = failCount; }
        public HttpResponse respond(HttpRequest req) {
            callCount++;
            HttpResponse res = new HttpResponse();
            if (callCount <= failCount) {
                res.setStatusCode(503);
                res.setBody('{"error":{"message":"model overloaded"}}');
            } else {
                res.setStatusCode(200);
                res.setBody('{"candidates":[{"content":{"parts":[{"text":"Mock AI response."}]}}]}');
            }
            return res;
        }
    }

    @isTest
    static void testGenerateRetriesOn503ThenSucceeds() {
        GeminiCalloutService.bypassConfigForTest = true;
        Test.setMock(HttpCalloutMock.class, new RetryThenSucceedMock(2));

        Test.startTest();
        String result = GeminiCalloutService.generate('Analyze this churn reason.');
        Test.stopTest();

        System.assertEquals('Mock AI response.', result);
    }

    @isTest
    static void testGenerateThrowsAfterExhaustingRetriesOn503() {
        GeminiCalloutService.bypassConfigForTest = true;
        Test.setMock(HttpCalloutMock.class, new RetryThenSucceedMock(10));

        Test.startTest();
        try {
            GeminiCalloutService.generate('Analyze this churn reason.');
            System.assert(false, 'Expected a CalloutException.');
        } catch (GeminiCalloutService.CalloutException e) {
            System.assert(e.getMessage().contains('503'));
        }
        Test.stopTest();
    }
}
