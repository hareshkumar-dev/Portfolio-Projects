/**
 * OnboardingRollupService
 *
 * For every New Hire touched by a batch of task changes, recomputes:
 *   - Completion_Percent__c = completed tasks / total tasks * 100
 *   - Status__c             = Completed (100%) / In Progress (>0%) / Pre-boarding (0%)
 *
 * Bulk-safe: one aggregate query for totals, one for completed counts,
 * and a single update for the whole batch.
 */
public with sharing class OnboardingRollupService {

    public static void recalculate(List<Onboarding_Task__c> tasks) {
        Set<Id> hireIds = new Set<Id>();
        for (Onboarding_Task__c task : tasks) {
            if (task.New_Hire__c != null) {
                hireIds.add(task.New_Hire__c);
            }
        }
        if (hireIds.isEmpty()) return;

        // Total tasks per hire
        Map<Id, Integer> totals = new Map<Id, Integer>();
        for (AggregateResult ar : [
            SELECT New_Hire__c hireId, COUNT(Id) total
            FROM Onboarding_Task__c
            WHERE New_Hire__c IN :hireIds
            GROUP BY New_Hire__c
        ]) {
            totals.put((Id) ar.get('hireId'), (Integer) ar.get('total'));
        }

        // Completed tasks per hire
        Map<Id, Integer> completed = new Map<Id, Integer>();
        for (AggregateResult ar : [
            SELECT New_Hire__c hireId, COUNT(Id) done
            FROM Onboarding_Task__c
            WHERE New_Hire__c IN :hireIds AND Status__c = 'Completed'
            GROUP BY New_Hire__c
        ]) {
            completed.put((Id) ar.get('hireId'), (Integer) ar.get('done'));
        }

        List<New_Hire__c> updates = new List<New_Hire__c>();
        for (Id hireId : hireIds) {
            Integer total = totals.containsKey(hireId) ? totals.get(hireId) : 0;
            Integer done = completed.containsKey(hireId) ? completed.get(hireId) : 0;

            Integer percent = total == 0 ? 0 : (Integer) Math.round((Double) done / total * 100);

            String status;
            if (total > 0 && done == total) {
                status = 'Completed';
            } else if (done > 0) {
                status = 'In Progress';
            } else {
                status = 'Pre-boarding';
            }

            updates.add(new New_Hire__c(
                Id = hireId,
                Completion_Percent__c = percent,
                Status__c = status
            ));
        }
        update updates;
    }
}
