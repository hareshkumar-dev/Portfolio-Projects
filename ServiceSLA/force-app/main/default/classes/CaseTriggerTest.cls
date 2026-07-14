/**
 * Integration test for the trigger framework + service on real DML:
 * insert stamps targets, status change stamps first response, closure
 * is judged against the resolution target.
 */
@IsTest
private class CaseTriggerTest {

    @IsTest
    static void insertStampsTargets() {
        SlaTestData.installPolicies();

        Test.startTest();
        Case c = new Case(Subject = 'Login down', Service_Tier__c = 'Platinum', Status = 'New');
        insert c;
        Test.stopTest();

        c = [SELECT Response_Target__c, Resolution_Target__c, SLA_Status__c FROM Case WHERE Id = :c.Id];
        System.assertNotEquals(null, c.Response_Target__c, 'Response target stamped by trigger');
        System.assertNotEquals(null, c.Resolution_Target__c, 'Resolution target stamped by trigger');
        System.assertEquals('On Track', c.SLA_Status__c);
    }

    @IsTest
    static void statusChangeStampsFirstResponse() {
        SlaTestData.installPolicies();
        Case c = new Case(Subject = 'Slow report', Service_Tier__c = 'Gold', Status = 'New');
        insert c;

        Test.startTest();
        c.Status = 'Working';
        update c;
        Test.stopTest();

        c = [SELECT First_Responded_At__c FROM Case WHERE Id = :c.Id];
        System.assertNotEquals(null, c.First_Responded_At__c, 'First response stamped on status change');
    }

    @IsTest
    static void closingLateMarksResolutionBreached() {
        SlaTestData.installPolicies();
        Case c = new Case(Subject = 'Overdue', Service_Tier__c = 'Standard', Status = 'New');
        insert c;

        Test.startTest();
        c.Resolution_Target__c = Datetime.now().addHours(-1); // already overdue
        c.Status = 'Closed';
        update c;
        Test.stopTest();

        c = [SELECT SLA_Status__c FROM Case WHERE Id = :c.Id];
        System.assertEquals('Resolution Breached', c.SLA_Status__c, 'Late closure breaches SLA');
    }

    @IsTest
    static void closingOnTimeMarksMet() {
        SlaTestData.installPolicies();
        Case c = new Case(Subject = 'On time', Service_Tier__c = 'Platinum', Status = 'New');
        insert c; // resolution target is 4h out

        Test.startTest();
        c.Status = 'Closed';
        update c;
        Test.stopTest();

        c = [SELECT SLA_Status__c FROM Case WHERE Id = :c.Id];
        System.assertEquals('Met', c.SLA_Status__c, 'On-time closure meets SLA');
    }
}
