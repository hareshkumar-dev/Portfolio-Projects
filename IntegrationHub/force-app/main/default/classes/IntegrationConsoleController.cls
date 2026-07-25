public with sharing class IntegrationConsoleController {

    public class Summary {
        @AuraEnabled public Integer receivedToday;
        @AuraEnabled public Integer duplicatesBlocked;
        @AuraEnabled public Integer errors;
        @AuraEnabled public Integer totalOrders;
    }

    @AuraEnabled(cacheable=true)
    public static Summary getSummary() {
        Datetime startOfToday = Datetime.newInstance(Date.today(), Time.newInstance(0, 0, 0, 0));

        Summary s = new Summary();
        s.receivedToday = [SELECT COUNT() FROM Integration_Log__c WHERE Outcome__c = 'Success' AND Logged_At__c >= :startOfToday];
        s.duplicatesBlocked = [SELECT COUNT() FROM Integration_Log__c WHERE Outcome__c = 'Duplicate' AND Logged_At__c >= :startOfToday];
        s.errors = [SELECT COUNT() FROM Integration_Log__c WHERE Outcome__c = 'Error' AND Logged_At__c >= :startOfToday];
        s.totalOrders = [SELECT COUNT() FROM Integration_Order__c];
        return s;
    }

    @AuraEnabled(cacheable=true)
    public static List<Integration_Log__c> getRecentLogs() {
        return [
            SELECT Id, Request_Id__c, Endpoint__c, Http_Method__c, Status_Code__c, Outcome__c, Message__c, Logged_At__c, Order__r.External_Order_Id__c
            FROM Integration_Log__c
            WITH SECURITY_ENFORCED
            ORDER BY Logged_At__c DESC
            LIMIT 50
        ];
    }
}
