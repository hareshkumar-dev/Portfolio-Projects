/**
 * DispatchService — orchestrates auto-assignment (SERVICE layer).
 *
 * For each unassigned work order it asks the MatchingService for the
 * best technician and assigns them in place, maintaining a live load map
 * so a bulk of orders is spread across the team rather than piled on one
 * person. Returns the picks (indexed by position in the input list) so
 * the caller can build the audit log.
 */
public with sharing class DispatchService {

    public static Map<Integer, MatchingService.Result> autoDispatch(List<Work_Order__c> workOrders) {
        Map<Integer, MatchingService.Result> picks = new Map<Integer, MatchingService.Result>();

        Boolean anyUnassigned = false;
        for (Work_Order__c wo : workOrders) {
            if (isUnassigned(wo)) { anyUnassigned = true; break; }
        }
        if (!anyUnassigned) return picks;

        List<Technician__c> techs = TechnicianSelector.selectAvailable();
        MatchWeightService.Weights w = MatchWeightService.get();

        Map<Id, Integer> loadMap = new Map<Id, Integer>();
        for (Technician__c t : techs) {
            loadMap.put(t.Id, t.Active_Jobs__c == null ? 0 : Integer.valueOf(t.Active_Jobs__c));
        }

        for (Integer i = 0; i < workOrders.size(); i++) {
            Work_Order__c wo = workOrders[i];
            if (!isUnassigned(wo)) continue;

            MatchingService.Result r = MatchingService.rank(wo, techs, loadMap, w);
            if (r == null) continue; // no eligible technician — stays Unassigned

            wo.Assigned_Technician__c = r.technicianId;
            wo.Match_Score__c = r.score.setScale(0, System.RoundingMode.HALF_UP);
            wo.Status__c = 'Assigned';
            loadMap.put(r.technicianId, loadMap.get(r.technicianId) + 1); // balance within the batch
            picks.put(i, r);
        }
        return picks;
    }

    public static Boolean isUnassigned(Work_Order__c wo) {
        return (wo.Status__c == null || wo.Status__c == 'Unassigned')
            && wo.Assigned_Technician__c == null;
    }
}
