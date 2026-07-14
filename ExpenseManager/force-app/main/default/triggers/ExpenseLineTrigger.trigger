/**
 * Trigger on Expense_Line__c.
 *
 * Keeps each Expense Report's Total_Amount__c in sync with the sum of
 * its lines. Runs on every event that can change the set of lines or
 * their amounts. Delegates to a handler class (standard pattern).
 */
trigger ExpenseLineTrigger on Expense_Line__c (
    after insert, after update, after delete, after undelete
) {
    List<Expense_Line__c> records =
        Trigger.isDelete ? Trigger.old : Trigger.new;
    ExpenseRollupService.recalculateTotals(records);
}
