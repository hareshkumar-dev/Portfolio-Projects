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
        String result = GeminiCalloutService.generate('Summarize this case.');
        Test.stopTest();

        System.assertEquals('Mock AI response.', result);
    }

    @isTest
    static void testGenerateHttpError() {
        GeminiCalloutService.bypassConfigForTest = true;
        Test.setMock(HttpCalloutMock.class, new GeminiMock(500));

        Test.startTest();
        try {
            GeminiCalloutService.generate('Summarize this case.');
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
            GeminiCalloutService.generate('Summarize this case.');
            System.assert(false, 'Expected a CalloutException.');
        } catch (GeminiCalloutService.CalloutException e) {
            System.assert(e.getMessage().contains('not configured'));
        }
        Test.stopTest();
    }
}
