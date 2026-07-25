@isTest
private class ChurnInsightServiceTest {

    private class GeminiMock implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            String text = 'Risk: High\\nAnalysis: Customer canceled due to price sensitivity after a short tenure.\\nAction: Offer a 20% retention discount for 3 months.';
            res.setBody('{"candidates":[{"content":{"parts":[{"text":"' + text + '"}]}}]}');
            return res;
        }
    }

    @isTest
    static void testAnalyzeCreatesChurnInsight() {
        Subscription__c sub = new Subscription__c(
            Customer_Name__c = 'Contoso Ltd',
            Plan_Name__c = 'Growth',
            Monthly_Amount__c = 199,
            Status__c = 'Canceled',
            Start_Date__c = Date.today().addMonths(-2),
            Next_Billing_Date__c = Date.today(),
            Cancel_Reason__c = 'Too expensive for what we use.'
        );
        insert sub;

        GeminiCalloutService.bypassConfigForTest = true;
        Test.setMock(HttpCalloutMock.class, new GeminiMock());

        Test.startTest();
        Churn_Insight__c insight = ChurnInsightService.analyze(sub.Id);
        Test.stopTest();

        System.assertEquals('High', insight.Risk_Level__c);
        System.assert(insight.Analysis__c.contains('price sensitivity'));
        System.assert(insight.Recommended_Action__c.contains('retention discount'));
        System.assertEquals(1, [SELECT COUNT() FROM Churn_Insight__c WHERE Subscription__c = :sub.Id]);
    }

    @isTest
    static void testParseResponseHandlesMalformedText() {
        Map<String, String> parsed = ChurnInsightService.parseResponse('This is not formatted the way we asked.');
        System.assertEquals('Medium', parsed.get('Risk'));
        System.assertEquals('This is not formatted the way we asked.', parsed.get('Analysis'));
    }

    @isTest
    static void testAnalyzeThrowsAndSavesNothingWhenAiFails() {
        Subscription__c sub = new Subscription__c(
            Customer_Name__c = 'Fabrikam Inc',
            Plan_Name__c = 'Starter',
            Monthly_Amount__c = 49,
            Status__c = 'Canceled',
            Start_Date__c = Date.today().addMonths(-1),
            Next_Billing_Date__c = Date.today(),
            Cancel_Reason__c = 'No longer needed.'
        );
        insert sub;

        GeminiCalloutService.simulateMissingKeyForTest = true;

        Test.startTest();
        try {
            ChurnInsightService.analyze(sub.Id);
            System.assert(false, 'Expected a CalloutException.');
        } catch (GeminiCalloutService.CalloutException e) {
            System.assert(e.getMessage().contains('not configured'));
        }
        Test.stopTest();

        System.assertEquals(0, [SELECT COUNT() FROM Churn_Insight__c WHERE Subscription__c = :sub.Id]);
    }
}
