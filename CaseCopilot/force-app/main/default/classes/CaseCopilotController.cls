/**
 * CaseCopilotController — UI layer for the caseCopilot LWC. Builds a prompt
 * from the Case record, calls GeminiCalloutService, and logs every
 * interaction to AI_Interaction__c for audit/history.
 */
public with sharing class CaseCopilotController {

    @AuraEnabled
    public static String summarizeCase(Id caseId) {
        return runPrompt(caseId, 'Summary',
            buildContext(caseId) + '\n\nSummarize this support case in 3 concise sentences for an agent who has not read it yet.');
    }

    @AuraEnabled
    public static String draftReply(Id caseId) {
        return runPrompt(caseId, 'Draft Reply',
            buildContext(caseId) + '\n\nDraft a short, professional reply to the customer addressing their issue. Do not invent facts that are not stated above.');
    }

    @AuraEnabled
    public static String suggestNextAction(Id caseId) {
        return runPrompt(caseId, 'Suggested Action',
            buildContext(caseId) + '\n\nIn one sentence, suggest the single best next action for the support agent.');
    }

    @AuraEnabled(cacheable=true)
    public static List<AI_Interaction__c> getHistory(Id caseId) {
        return AIInteractionSelector.getByCase(caseId);
    }

    private static String buildContext(Id caseId) {
        Case c = [
            SELECT Subject, Description, Status, Priority
            FROM Case
            WHERE Id = :caseId
            WITH SECURITY_ENFORCED
            LIMIT 1
        ];
        return 'Case Subject: ' + c.Subject
            + '\nStatus: ' + c.Status
            + '\nPriority: ' + c.Priority
            + '\nDescription: ' + (String.isBlank(c.Description) ? '(none provided)' : c.Description);
    }

    private static String runPrompt(Id caseId, String interactionType, String prompt) {
        String response;
        try {
            response = GeminiCalloutService.generate(prompt);
        } catch (Exception e) {
            response = 'AI request failed: ' + e.getMessage();
        }

        insert new AI_Interaction__c(
            Case__c = caseId,
            Interaction_Type__c = interactionType,
            Prompt__c = prompt,
            Response__c = response,
            Model__c = System.Label.Gemini_Model
        );

        return response;
    }
}
