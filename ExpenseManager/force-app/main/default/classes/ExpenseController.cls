/**
 * ExpenseController
 *
 * Apex controller for the `expenseManager` Lightning Web Component.
 * Exposes the operations the component needs: list the current user's
 * reports, read one report with its lines, create a report, add or
 * remove lines, and submit a report into the approval process.
 *
 * `with sharing` so the component respects the running user's access.
 */
public with sharing class ExpenseController {

    /** All expense reports belonging to the running user, newest first. */
    @AuraEnabled(cacheable=true)
    public static List<Expense_Report__c> getMyReports() {
        Id me = UserInfo.getUserId();
        return [
            SELECT Id, Name, Status__c, Total_Amount__c, Purpose__c, Submitted_Date__c
            FROM Expense_Report__c
            WHERE Employee__c = :me OR CreatedById = :me
            ORDER BY CreatedDate DESC
            LIMIT 200
        ];
    }

    /**
     * One report with its line items. Not cacheable: it's fetched on
     * demand and must reflect the latest total after lines change (a
     * cached result would go stale until a full page reload).
     */
    @AuraEnabled
    public static Expense_Report__c getReport(Id reportId) {
        return [
            SELECT Id, Name, Status__c, Total_Amount__c, Purpose__c, Submitted_Date__c,
                   (SELECT Id, Name, Category__c, Amount__c, Expense_Date__c, Merchant__c, Notes__c
                    FROM Expense_Lines__r
                    ORDER BY Expense_Date__c DESC NULLS LAST)
            FROM Expense_Report__c
            WHERE Id = :reportId
            LIMIT 1
        ];
    }

    /** Create a new draft report for the running user. Returns its Id. */
    @AuraEnabled
    public static Id createReport(String purpose) {
        Expense_Report__c report = new Expense_Report__c(
            Purpose__c = purpose,
            Status__c = 'Draft',
            Employee__c = UserInfo.getUserId()
        );
        insert report;
        return report.Id;
    }

    /** Rename a report (edit its purpose). */
    @AuraEnabled
    public static void renameReport(Id reportId, String purpose) {
        update new Expense_Report__c(Id = reportId, Purpose__c = purpose);
    }

    /** Delete a report (its expense lines cascade via master-detail). */
    @AuraEnabled
    public static void deleteReport(Id reportId) {
        delete [SELECT Id FROM Expense_Report__c WHERE Id = :reportId];
    }

    /** Add a line to a report. The roll-up trigger updates the total. */
    @AuraEnabled
    public static void addLine(
        Id reportId, String category, Decimal amount,
        Date expenseDate, String merchant, String notes
    ) {
        insert new Expense_Line__c(
            Expense_Report__c = reportId,
            Category__c = category,
            Amount__c = amount,
            Expense_Date__c = expenseDate,
            Merchant__c = merchant,
            Notes__c = notes
        );
    }

    /** Remove a line. The roll-up trigger updates the total. */
    @AuraEnabled
    public static void deleteLine(Id lineId) {
        delete [SELECT Id FROM Expense_Line__c WHERE Id = :lineId];
    }

    /** Submit a report: move it to Submitted and stamp the submitted date. */
    @AuraEnabled
    public static String submitForApproval(Id reportId) {
        try {
            update new Expense_Report__c(
                Id = reportId,
                Status__c = 'Submitted',
                Submitted_Date__c = Date.today()
            );
            return 'Report submitted for approval.';
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}
