/**
 * Test utility: injects match weights and builds technicians / work
 * orders.
 */
@IsTest
public class DispatchTestData {

    public static void installWeights() {
        MatchWeightService.Weights w = new MatchWeightService.Weights();
        w.skill = 50; w.territory = 30; w.load = 20;
        MatchWeightService.setTestWeights(w);
    }

    public static Technician__c technician(String name, String skills, String territory, Integer maxJobs, Boolean available) {
        return new Technician__c(
            Name = name, Skills__c = skills, Territory__c = territory,
            Max_Jobs__c = maxJobs, Is_Available__c = available
        );
    }

    public static Work_Order__c workOrder(String subject, String skill, String territory) {
        return new Work_Order__c(
            Subject__c = subject, Required_Skill__c = skill, Territory__c = territory,
            Priority__c = 'Medium', Status__c = 'Unassigned'
        );
    }
}
