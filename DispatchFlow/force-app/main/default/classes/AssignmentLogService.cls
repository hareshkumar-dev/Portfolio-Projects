/**
 * AssignmentLogService — builds the dispatch audit trail (SERVICE
 * layer). Shared by the trigger (insert-time dispatch) and the rebalance
 * batch so the audit is written the same way from both paths.
 */
public with sharing class AssignmentLogService {

    /**
     * @param picks  index → matching result, from DispatchService
     * @param workOrders  the same list that was dispatched (must have Ids)
     */
    public static List<Assignment_Log__c> build(
        Map<Integer, MatchingService.Result> picks, List<Work_Order__c> workOrders
    ) {
        List<Assignment_Log__c> logs = new List<Assignment_Log__c>();
        Datetime nowDt = Datetime.now();

        for (Integer index : picks.keySet()) {
            Work_Order__c wo = workOrders[index];
            MatchingService.Result r = picks.get(index);
            logs.add(new Assignment_Log__c(
                Work_Order__c = wo.Id,
                Technician__c = r.technicianId,
                Match_Score__c = r.score.setScale(0, System.RoundingMode.HALF_UP),
                Candidates_Considered__c = r.candidates,
                Reason__c = r.reason,
                Logged_At__c = nowDt
            ));
        }
        return logs;
    }
}
