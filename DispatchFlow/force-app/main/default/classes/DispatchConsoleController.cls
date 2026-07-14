/**
 * DispatchConsoleController — UI layer for the dispatchConsole LWC.
 */
public with sharing class DispatchConsoleController {

    public class Summary {
        @AuraEnabled public Integer unassigned;
        @AuraEnabled public Integer assigned;
        @AuraEnabled public Integer inProgress;
        @AuraEnabled public Integer completed;
    }

    @AuraEnabled(cacheable=true)
    public static List<Work_Order__c> getWorkOrders() {
        return WorkOrderSelector.selectAll();
    }

    @AuraEnabled(cacheable=true)
    public static List<Technician__c> getTechnicians() {
        return TechnicianSelector.selectAll();
    }

    @AuraEnabled(cacheable=true)
    public static Summary getSummary() {
        Summary s = new Summary();
        s.unassigned = 0; s.assigned = 0; s.inProgress = 0; s.completed = 0;
        for (Work_Order__c wo : WorkOrderSelector.selectAll()) {
            if (wo.Status__c == 'Unassigned') s.unassigned++;
            else if (wo.Status__c == 'Assigned') s.assigned++;
            else if (wo.Status__c == 'In Progress') s.inProgress++;
            else if (wo.Status__c == 'Completed') s.completed++;
        }
        return s;
    }

    /** Manually assign a technician (load roll-up is maintained by the trigger). */
    @AuraEnabled
    public static void reassign(Id workOrderId, Id technicianId) {
        update new Work_Order__c(
            Id = workOrderId,
            Assigned_Technician__c = technicianId,
            Status__c = 'Assigned'
        );
    }

    /** Work the Unassigned backlog now. */
    @AuraEnabled
    public static Id runRebalance() {
        return Database.executeBatch(new RebalanceBatch(), 200);
    }
}
