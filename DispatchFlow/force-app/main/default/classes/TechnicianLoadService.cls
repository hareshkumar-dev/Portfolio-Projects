/**
 * TechnicianLoadService — keeps Technician__c.Active_Jobs__c equal to the
 * count of that technician's open (Assigned / In Progress) work orders
 * (SERVICE layer). Bulk-safe roll-up: one aggregate query + one update.
 */
public with sharing class TechnicianLoadService {

    public static void recalculate(Set<Id> technicianIds) {
        technicianIds.remove(null);
        if (technicianIds.isEmpty()) return;

        Map<Id, Integer> loadByTech = new Map<Id, Integer>();
        for (AggregateResult ar : [
            SELECT Assigned_Technician__c tid, COUNT(Id) cnt
            FROM Work_Order__c
            WHERE Assigned_Technician__c IN :technicianIds
              AND Status__c IN ('Assigned', 'In Progress')
            GROUP BY Assigned_Technician__c
        ]) {
            loadByTech.put((Id) ar.get('tid'), (Integer) ar.get('cnt'));
        }

        List<Technician__c> updates = new List<Technician__c>();
        for (Id tid : technicianIds) {
            updates.add(new Technician__c(
                Id = tid,
                Active_Jobs__c = loadByTech.containsKey(tid) ? loadByTech.get(tid) : 0
            ));
        }
        update updates;
    }
}
