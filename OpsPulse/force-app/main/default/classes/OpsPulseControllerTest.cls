@isTest
private class OpsPulseControllerTest {

    @TestSetup
    static void setup() {
        insert new List<Case>{
            new Case(Subject = 'Cannot access account', Status = 'New', Priority = 'High'),
            new Case(Subject = 'Billing question', Status = 'Working', Priority = 'Medium'),
            new Case(Subject = 'Feature request', Status = 'New', Priority = 'Low'),
            new Case(Subject = 'Resolved earlier issue', Status = 'Closed', Priority = 'Medium')
        };
    }

    @isTest
    static void testGetSummary() {
        Test.startTest();
        OpsPulseController.Summary s = OpsPulseController.getSummary();
        Test.stopTest();

        System.assertEquals(3, s.openCount);
        System.assertEquals(1, s.highPriorityOpen);
    }

    @isTest
    static void testGetOpenCases() {
        Test.startTest();
        List<OpsPulseController.CaseRow> rows = OpsPulseController.getOpenCases();
        Test.stopTest();

        System.assertEquals(3, rows.size());
        for (OpsPulseController.CaseRow r : rows) {
            System.assertEquals(false, r.isClosed);
        }
    }

    @isTest
    static void testGetCaseSnapshot() {
        Case c = [SELECT Id FROM Case WHERE Subject = 'Billing question' LIMIT 1];

        Test.startTest();
        OpsPulseController.CaseRow row = OpsPulseController.getCaseSnapshot(c.Id);
        Test.stopTest();

        System.assertEquals('Working', row.status);
    }

    @isTest
    static void testGetCaseSnapshotMissing() {
        Test.startTest();
        OpsPulseController.CaseRow row = OpsPulseController.getCaseSnapshot('500000000000000AAA');
        Test.stopTest();

        System.assertEquals(null, row);
    }
}
