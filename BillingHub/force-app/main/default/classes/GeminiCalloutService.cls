/**
 * GeminiCalloutService — makes the HTTP callout to the Gemini API. The host
 * is allowlisted via the Gemini_API Remote Site Setting; the API key and
 * endpoint path are Custom Labels so they can change without a deployment.
 * Set Gemini_Api_Key in Setup > Custom Labels after deploying — never
 * commit a real key to source control.
 */
public with sharing class GeminiCalloutService {

    private static final String API_HOST = 'https://generativelanguage.googleapis.com';
    private static final String NOT_CONFIGURED_SENTINEL = 'REPLACE_ME_IN_SETUP';

    public class CalloutException extends Exception {}

    @TestVisible private static Boolean bypassConfigForTest = false;
    @TestVisible private static Boolean simulateMissingKeyForTest = false;

    public static String generate(String prompt) {
        String apiKey;
        String endpointPath;

        if (Test.isRunningTest() && simulateMissingKeyForTest) {
            apiKey = null;
            endpointPath = null;
        } else if (Test.isRunningTest() && bypassConfigForTest) {
            apiKey = 'test-key';
            endpointPath = '/v1beta/models/gemini-flash-latest:generateContent';
        } else {
            apiKey = System.Label.Gemini_Api_Key;
            endpointPath = System.Label.Gemini_Endpoint_Path;
        }

        if (String.isBlank(apiKey) || apiKey == NOT_CONFIGURED_SENTINEL) {
            throw new CalloutException('Gemini API key is not configured. Set the Gemini_Api_Key value in Setup > Custom Labels.');
        }

        HttpRequest req = new HttpRequest();
        req.setEndpoint(API_HOST + endpointPath + '?key=' + EncodingUtil.urlEncode(apiKey, 'UTF-8'));
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setTimeout(20000);

        Map<String, Object> part = new Map<String, Object>{ 'text' => prompt };
        Map<String, Object> content = new Map<String, Object>{ 'parts' => new List<Object>{ part } };
        Map<String, Object> body = new Map<String, Object>{ 'contents' => new List<Object>{ content } };
        req.setBody(JSON.serialize(body));

        // Gemini occasionally returns 503 (model overloaded) — that's transient,
        // so retry a couple of times before giving up rather than failing on the first blip.
        Integer maxAttempts = 3;
        HttpResponse res;
        for (Integer attempt = 1; attempt <= maxAttempts; attempt++) {
            Http http = new Http();
            res = http.send(req);

            if (res.getStatusCode() == 200) {
                return parseText(res.getBody());
            }
            if (res.getStatusCode() != 503 || attempt == maxAttempts) {
                throw new CalloutException('Gemini API error (' + res.getStatusCode() + '): ' + res.getBody());
            }
        }
        throw new CalloutException('Gemini API error (' + res.getStatusCode() + '): ' + res.getBody());
    }

    @TestVisible
    private static String parseText(String responseBody) {
        Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(responseBody);
        List<Object> candidates = (List<Object>) parsed.get('candidates');
        if (candidates == null || candidates.isEmpty()) {
            throw new CalloutException('Gemini returned no candidates.');
        }
        Map<String, Object> first = (Map<String, Object>) candidates[0];
        Map<String, Object> contentMap = (Map<String, Object>) first.get('content');
        List<Object> parts = (List<Object>) contentMap.get('parts');
        Map<String, Object> part0 = (Map<String, Object>) parts[0];
        return (String) part0.get('text');
    }
}
