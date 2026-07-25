public with sharing class AIInteractionSelector {
    public static List<AI_Interaction__c> getByCase(Id caseId) {
        return [
            SELECT Id, Interaction_Type__c, Response__c, CreatedDate
            FROM AI_Interaction__c
            WHERE Case__c = :caseId
            WITH SECURITY_ENFORCED
            ORDER BY CreatedDate DESC
            LIMIT 20
        ];
    }
}
