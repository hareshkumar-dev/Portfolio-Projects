/**
 * ChurnInsightService — when a subscription is canceled, sends its plan,
 * tenure, and stated cancellation reason to Gemini for a churn-risk
 * classification and a recommended win-back action. The result is stored
 * on Churn_Insight__c so RevOps can see why customers are leaving and
 * what to do about it, without an analyst reading every free-text reason
 * by hand.
 */
public with sharing class ChurnInsightService {

    public static Churn_Insight__c analyze(Id subscriptionId) {
        Subscription__c sub = [
            SELECT Id, Customer_Name__c, Plan_Name__c, Monthly_Amount__c, Start_Date__c, Cancel_Reason__c
            FROM Subscription__c
            WHERE Id = :subscriptionId
            WITH SECURITY_ENFORCED
            LIMIT 1
        ];

        Integer tenureMonths = sub.Start_Date__c != null
            ? sub.Start_Date__c.monthsBetween(Date.today())
            : 0;

        String prompt = 'A SaaS customer just canceled their subscription.\n'
            + 'Plan: ' + sub.Plan_Name__c + '\n'
            + 'Monthly amount: ' + sub.Monthly_Amount__c + '\n'
            + 'Tenure: ' + tenureMonths + ' months\n'
            + 'Stated cancellation reason: ' + (String.isBlank(sub.Cancel_Reason__c) ? '(none provided)' : sub.Cancel_Reason__c) + '\n\n'
            + 'Respond in exactly this format, three lines, no extra text:\n'
            + 'Risk: <Low, Medium, or High>\n'
            + 'Analysis: <one or two sentences on why this customer likely churned>\n'
            + 'Action: <one sentence recommending the single best win-back action>';

        // Let a callout failure propagate rather than saving a fabricated
        // insight — an unreliable AI response is worse than no insight yet.
        String responseText = GeminiCalloutService.generate(prompt);

        Map<String, String> parsed = parseResponse(responseText);

        Churn_Insight__c insight = new Churn_Insight__c(
            Subscription__c = subscriptionId,
            Risk_Level__c = parsed.get('Risk'),
            Analysis__c = parsed.get('Analysis'),
            Recommended_Action__c = parsed.get('Action')
        );
        insert insight;
        return insight;
    }

    @TestVisible
    private static Map<String, String> parseResponse(String text) {
        Map<String, String> result = new Map<String, String>{
            'Risk' => 'Medium',
            'Analysis' => text,
            'Action' => 'Review this cancellation manually.'
        };
        if (String.isBlank(text)) {
            return result;
        }

        for (String line : text.split('\n')) {
            String trimmed = line.trim();
            if (trimmed.startsWithIgnoreCase('Risk:')) {
                String risk = trimmed.substringAfter(':').trim();
                result.put('Risk', normalizeRisk(risk));
            } else if (trimmed.startsWithIgnoreCase('Analysis:')) {
                result.put('Analysis', trimmed.substringAfter(':').trim());
            } else if (trimmed.startsWithIgnoreCase('Action:')) {
                result.put('Action', trimmed.substringAfter(':').trim());
            }
        }
        return result;
    }

    private static String normalizeRisk(String risk) {
        String lower = risk.toLowerCase();
        if (lower.contains('high')) return 'High';
        if (lower.contains('low')) return 'Low';
        return 'Medium';
    }
}
