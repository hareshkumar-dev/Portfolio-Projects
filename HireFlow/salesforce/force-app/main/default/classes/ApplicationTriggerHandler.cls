/**
 * ApplicationTriggerHandler
 *
 * Automation that runs inside Salesforce whenever an Application__c is
 * created or updated — so the rules hold no matter how the record is
 * changed (this React app, the Salesforce UI, the API, or a data load).
 *
 * Two rules:
 *   1. Stamp Stage_Changed_Date__c whenever the Stage changes.
 *   2. Block hiring more candidates than the Job has openings.
 *
 * All logic is bulk-safe (operates on the whole trigger batch, with a
 * fixed number of SOQL queries regardless of row count).
 */
public with sharing class ApplicationTriggerHandler {

    public static void handle(
        List<Application__c> newApps,
        Map<Id, Application__c> oldMap,
        Boolean isInsert
    ) {
        stampStageChange(newApps, oldMap, isInsert);
        enforceOpenings(newApps, oldMap, isInsert);
    }

    /** Rule 1: record the date each time an application's Stage changes. */
    private static void stampStageChange(
        List<Application__c> newApps,
        Map<Id, Application__c> oldMap,
        Boolean isInsert
    ) {
        for (Application__c app : newApps) {
            Boolean changed = isInsert
                || app.Stage__c != oldMap.get(app.Id).Stage__c;
            if (changed) {
                app.Stage_Changed_Date__c = Date.today();
            }
        }
    }

    /**
     * Rule 2: a Job cannot have more Hired applications than Openings.
     * Only applications *newly* moving into 'Hired' are checked.
     */
    private static void enforceOpenings(
        List<Application__c> newApps,
        Map<Id, Application__c> oldMap,
        Boolean isInsert
    ) {
        // How many new hires does this batch attempt, per Job?
        Map<Id, Integer> attemptedByJob = new Map<Id, Integer>();
        for (Application__c app : newApps) {
            Boolean wasHired = !isInsert && oldMap.get(app.Id).Stage__c == 'Hired';
            if (app.Stage__c == 'Hired' && !wasHired && app.Job__c != null) {
                Integer n = attemptedByJob.containsKey(app.Job__c)
                    ? attemptedByJob.get(app.Job__c) : 0;
                attemptedByJob.put(app.Job__c, n + 1);
            }
        }
        if (attemptedByJob.isEmpty()) return;

        // Hires already committed in the database, per Job.
        Map<Id, Integer> existingByJob = new Map<Id, Integer>();
        for (AggregateResult ar : [
            SELECT Job__c jobId, COUNT(Id) cnt
            FROM Application__c
            WHERE Job__c IN :attemptedByJob.keySet() AND Stage__c = 'Hired'
            GROUP BY Job__c
        ]) {
            existingByJob.put((Id) ar.get('jobId'), (Integer) ar.get('cnt'));
        }

        // Openings per Job.
        Map<Id, Job__c> jobs = new Map<Id, Job__c>([
            SELECT Id, Name, Openings__c
            FROM Job__c
            WHERE Id IN :attemptedByJob.keySet()
        ]);

        // Which jobs would be over-filled?
        Set<Id> overfilledJobs = new Set<Id>();
        for (Id jobId : attemptedByJob.keySet()) {
            Job__c job = jobs.get(jobId);
            Integer openings = (job != null && job.Openings__c != null)
                ? Integer.valueOf(job.Openings__c) : 0;
            Integer already = existingByJob.containsKey(jobId)
                ? existingByJob.get(jobId) : 0;
            if (already + attemptedByJob.get(jobId) > openings) {
                overfilledJobs.add(jobId);
            }
        }
        if (overfilledJobs.isEmpty()) return;

        // Block the specific applications causing the overflow.
        for (Application__c app : newApps) {
            Boolean wasHired = !isInsert && oldMap.get(app.Id).Stage__c == 'Hired';
            if (app.Stage__c == 'Hired' && !wasHired && overfilledJobs.contains(app.Job__c)) {
                Job__c job = jobs.get(app.Job__c);
                Integer openings = (job != null && job.Openings__c != null)
                    ? Integer.valueOf(job.Openings__c) : 0;
                app.addError(
                    'Cannot hire: "' + (job != null ? job.Name : 'this role') +
                    '" has only ' + openings + ' opening(s), which are already filled.'
                );
            }
        }
    }
}
