/**
 * OpsPulseController — UI layer for the opsPulse LWC. Provides the initial
 * KPI summary and open-case snapshot; the LWC then stays live via Change
 * Data Capture (empApi), calling getCaseSnapshot to refresh a single row
 * whenever a CaseChangeEvent arrives.
 */
public with sharing class OpsPulseController {

    public class Summary {
        @AuraEnabled public Integer openCount;
        @AuraEnabled public Integer newToday;
        @AuraEnabled public Integer highPriorityOpen;
        @AuraEnabled public Integer closedToday;
    }

    public class CaseRow {
        @AuraEnabled public Id id;
        @AuraEnabled public String caseNumber;
        @AuraEnabled public String subject;
        @AuraEnabled public String status;
        @AuraEnabled public String priority;
        @AuraEnabled public Boolean isClosed;
        @AuraEnabled public Datetime createdDate;
    }

    @AuraEnabled(cacheable=true)
    public static Summary getSummary() {
        Datetime startOfToday = Datetime.newInstance(Date.today(), Time.newInstance(0, 0, 0, 0));

        Summary s = new Summary();
        s.openCount = [SELECT COUNT() FROM Case WHERE IsClosed = false];
        s.newToday = [SELECT COUNT() FROM Case WHERE CreatedDate >= :startOfToday];
        s.highPriorityOpen = [SELECT COUNT() FROM Case WHERE IsClosed = false AND Priority = 'High'];
        s.closedToday = [SELECT COUNT() FROM Case WHERE IsClosed = true AND LastModifiedDate >= :startOfToday];
        return s;
    }

    @AuraEnabled(cacheable=true)
    public static List<CaseRow> getOpenCases() {
        List<CaseRow> rows = new List<CaseRow>();
        for (Case c : [
            SELECT Id, CaseNumber, Subject, Status, Priority, IsClosed, CreatedDate
            FROM Case
            WHERE IsClosed = false
            WITH SECURITY_ENFORCED
            ORDER BY CreatedDate DESC
            LIMIT 50
        ]) {
            rows.add(toRow(c));
        }
        return rows;
    }

    @AuraEnabled
    public static CaseRow getCaseSnapshot(Id caseId) {
        List<Case> matches = [
            SELECT Id, CaseNumber, Subject, Status, Priority, IsClosed, CreatedDate
            FROM Case
            WHERE Id = :caseId
            WITH SECURITY_ENFORCED
            LIMIT 1
        ];
        return matches.isEmpty() ? null : toRow(matches[0]);
    }

    private static CaseRow toRow(Case c) {
        CaseRow r = new CaseRow();
        r.id = c.Id;
        r.caseNumber = c.CaseNumber;
        r.subject = c.Subject;
        r.status = c.Status;
        r.priority = c.Priority;
        r.isClosed = c.IsClosed;
        r.createdDate = c.CreatedDate;
        return r;
    }
}
