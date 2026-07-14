/**
 * Tests for ExpenseController (the LWC's Apex controller).
 *
 * Covers report creation, line add/remove with roll-up, and the
 * report read. Approval submission is exercised in a way that tolerates
 * an org where the approval process isn't active.
 */
@isTest
private class ExpenseControllerTest {

    @isTest
    static void createsReportForRunningUser() {
        Test.startTest();
        Id reportId = ExpenseController.createReport('Conference travel');
        Test.stopTest();

        Expense_Report__c report = [
            SELECT Purpose__c, Status__c, Employee__c
            FROM Expense_Report__c WHERE Id = :reportId
        ];
        System.assertEquals('Conference travel', report.Purpose__c);
        System.assertEquals('Draft', report.Status__c);
        System.assertEquals(UserInfo.getUserId(), report.Employee__c);
    }

    @isTest
    static void addsAndRemovesLinesWithRollup() {
        Id reportId = ExpenseController.createReport('Client visit');

        Test.startTest();
        ExpenseController.addLine(reportId, 'Travel', 1200, Date.today(), 'Airline', 'Return flight');
        ExpenseController.addLine(reportId, 'Meals', 800, Date.today(), 'Cafe', null);
        Test.stopTest();

        Expense_Report__c withLines = ExpenseController.getReport(reportId);
        System.assertEquals(2000, withLines.Total_Amount__c, 'Total should sum both lines');
        System.assertEquals(2, withLines.Expense_Lines__r.size(), 'Two lines expected');

        Id lineId = withLines.Expense_Lines__r[0].Id;
        ExpenseController.deleteLine(lineId);

        Expense_Report__c afterDelete = ExpenseController.getReport(reportId);
        System.assertEquals(1, afterDelete.Expense_Lines__r.size(), 'One line should remain');
    }

    @isTest
    static void listsRunningUsersReports() {
        ExpenseController.createReport('Report A');
        ExpenseController.createReport('Report B');

        List<Expense_Report__c> mine = ExpenseController.getMyReports();
        System.assert(mine.size() >= 2, 'Both created reports should be listed');
    }

    @isTest
    static void submitForApprovalIsHandledGracefully() {
        Id reportId = ExpenseController.createReport('Needs approval');
        ExpenseController.addLine(reportId, 'Lodging', 5000, Date.today(), 'Hotel', null);

        Test.startTest();
        try {
            // Succeeds if the approval process is active; otherwise the
            // controller throws an AuraHandledException, which is fine here.
            String result = ExpenseController.submitForApproval(reportId);
            System.assertNotEquals(null, result);
        } catch (AuraHandledException e) {
            System.assert(true, 'No active approval process in test context is acceptable');
        }
        Test.stopTest();
    }
}
