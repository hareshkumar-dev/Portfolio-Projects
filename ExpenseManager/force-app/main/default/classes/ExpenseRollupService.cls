/**
 * ExpenseRollupService
 *
 * Recalculates Expense_Report__c.Total_Amount__c from the sum of its
 * child Expense_Line__c.Amount__c values.
 *
 * This is done in Apex (rather than a native roll-up summary field) to
 * demonstrate a bulk-safe roll-up: for any batch of changed lines, it
 * runs a single aggregate query and a single update, so it stays within
 * governor limits regardless of row count.
 */
public with sharing class ExpenseRollupService {

    /**
     * Recalculate totals for every report referenced by the given lines.
     * `lines` is Trigger.new (insert/update/undelete) or Trigger.old
     * (delete) — either way we only need the parent Ids.
     */
    public static void recalculateTotals(List<Expense_Line__c> lines) {
        Set<Id> reportIds = new Set<Id>();
        for (Expense_Line__c line : lines) {
            if (line.Expense_Report__c != null) {
                reportIds.add(line.Expense_Report__c);
            }
        }
        if (reportIds.isEmpty()) return;

        // One aggregate query for the whole batch
        Map<Id, Decimal> totals = new Map<Id, Decimal>();
        for (AggregateResult ar : [
            SELECT Expense_Report__c reportId, SUM(Amount__c) total
            FROM Expense_Line__c
            WHERE Expense_Report__c IN :reportIds
            GROUP BY Expense_Report__c
        ]) {
            totals.put((Id) ar.get('reportId'), (Decimal) ar.get('total'));
        }

        // Build the reports to update — reports with no remaining lines
        // fall back to 0 (they won't appear in the aggregate result).
        List<Expense_Report__c> toUpdate = new List<Expense_Report__c>();
        for (Id reportId : reportIds) {
            Decimal total = totals.containsKey(reportId) ? totals.get(reportId) : 0;
            toUpdate.add(new Expense_Report__c(Id = reportId, Total_Amount__c = total));
        }
        update toUpdate;
    }
}
