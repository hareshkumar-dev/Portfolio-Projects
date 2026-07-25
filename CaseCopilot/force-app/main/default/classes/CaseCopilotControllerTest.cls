@isTest
private class CaseCopilotControllerTest {

    private class GeminiMock implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('{"candidates":[{"content":{"parts":[{"text":"Mock AI response."}]}}]}');
            return res;
        }
    }

    @TestSetup
    static void setup() {
        insert new Case(
            Subject = 'Cannot reset password',
            Description = 'Customer says the reset link never arrives.',
            Status = 'New',
            Priority = 'Medium'
        );
    }

    @isTest
    static void testSummarizeCase() {
        GeminiCalloutService.bypassConfigForTest = true;
        Test.setMock(HttpCalloutMock.class, new GeminiMock());
        Case c = [SELECT Id FROM Case LIMIT 1];

        Test.startTest();
        String result = CaseCopilotController.summarizeCase(c.Id);
        Test.stopTest();

        System.assertEquals('Mock AI response.', result);
        System.assertEquals(1, [SELECT COUNT() FROM AI_Interaction__c WHERE Case__c = :c.Id]);
    }

    @isTest
    static void testDraftReplyAndSuggestAction() {
        GeminiCalloutService.bypassConfigForTest = true;
        Test.setMock(HttpCalloutMock.class, new GeminiMock());
        Case c = [SELECT Id FROM Case LIMIT 1];

        Test.startTest();
        CaseCopilotController.draftReply(c.Id);
        CaseCopilotController.suggestNextAction(c.Id);
        Test.stopTest();

        System.assertEquals(2, [SELECT COUNT() FROM AI_Interaction__c WHERE Case__c = :c.Id]);
    }

    @isTest
    static void testGetHistory() {
        GeminiCalloutService.bypassConfigForTest = true;
        Test.setMock(HttpCalloutMock.class, new GeminiMock());
        Case c = [SELECT Id FROM Case LIMIT 1];
        CaseCopilotController.summarizeCase(c.Id);

        Test.startTest();
        List<AI_Interaction__c> history = CaseCopilotController.getHistory(c.Id);
        Test.stopTest();

        System.assertEquals(1, history.size());
        System.assertEquals('Summary', history[0].Interaction_Type__c);
    }
}
