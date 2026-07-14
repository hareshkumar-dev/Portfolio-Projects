/**
 * Tests for the expense roll-up trigger + service.
 *
 * Verifies the parent Total_Amount__c stays correct across insert,
 * update, delete, and bulk operations.
 */
@isTest
private class ExpenseRollupServiceTest {

    private static Expense_Report__c makeReport() {
        Expense_Report__c report = new Expense_Report__c(
            Purpose__c = 'Test trip',
            Status__c = 'Draft'
        );
        insert report;
        return report;
    }

    private static Expense_Line__c makeLine(Id reportId, Decimal amount) {
        return new Expense_Line__c(
            Expense_Report__c = reportId,
            Category__c = 'Travel',
            Amount__c = amount,
            Expense_Date__c = Date.today()
        );
    }

    private static Decimal totalOf(Id reportId) {
        return [SELECT Total_Amount__c FROM Expense_Report__c WHERE Id = :reportId].Total_Amount__c;
    }

    @isTest
    static void rollsUpOnInsert() {
        Expense_Report__c report = makeReport();
        insert new List<Expense_Line__c>{
            makeLine(report.Id, 100),
            makeLine(report.Id, 250.50)
        };
        System.assertEquals(350.50, totalOf(report.Id), 'Total should sum inserted lines');
    }

    @isTest
    static void rollsDownOnUpdateAndDelete() {
        Expense_Report__c report = makeReport();
        Expense_Line__c a = makeLine(report.Id, 100);
        Expense_Line__c b = makeLine(report.Id, 200);
        insert new List<Expense_Line__c>{ a, b };
        System.assertEquals(300, totalOf(report.Id), 'Baseline total');

        a.Amount__c = 500;
        update a;
        System.assertEquals(700, totalOf(report.Id), 'Total should reflect the updated amount');

        delete b;
        System.assertEquals(500, totalOf(report.Id), 'Total should drop when a line is deleted');
    }

    @isTest
    static void rollsUpInBulk() {
        List<Expense_Report__c> reports = new List<Expense_Report__c>();
        for (Integer i = 0; i < 5; i++) {
            reports.add(new Expense_Report__c(Purpose__c = 'Report ' + i, Status__c = 'Draft'));
        }
        insert reports;

        // 10 lines per report, each 50 -> expected total 500 per report
        List<Expense_Line__c> lines = new List<Expense_Line__c>();
        for (Expense_Report__c r : reports) {
            for (Integer i = 0; i < 10; i++) lines.add(makeLine(r.Id, 50));
        }

        Test.startTest();
        insert lines;
        Test.stopTest();

        for (Expense_Report__c r : reports) {
            System.assertEquals(500, totalOf(r.Id), 'Each report should total 500');
        }
    }

    @isTest
    static void resetsToZeroWhenLastLineRemoved() {
        Expense_Report__c report = makeReport();
        Expense_Line__c only = makeLine(report.Id, 99);
        insert only;
        System.assertEquals(99, totalOf(report.Id), 'Total before delete');

        delete only;
        System.assertEquals(0, totalOf(report.Id), 'Total should be 0 with no lines left');
    }
}
