@isTest
private class QuotePdfControllerTest {

    @isTest
    static void testLoadsQuoteAndLines() {
        Quote__c q = new Quote__c(Customer_Name__c = 'Acme Corp', Status__c = 'Approved', Subtotal__c = 500, Discount_Percent__c = 10, Total__c = 450);
        insert q;
        insert new Quote_Line__c(Quote__c = q.Id, Line_Name__c = 'Core License', Quantity__c = 10, Unit_Price__c = 50, Line_Total__c = 500);

        Test.setCurrentPageReference(new PageReference('/apex/QuotePdf'));
        ApexPages.currentPage().getParameters().put('id', q.Id);

        Test.startTest();
        QuotePdfController controller = new QuotePdfController();
        Test.stopTest();

        System.assertEquals('Acme Corp', controller.quote.Customer_Name__c);
        System.assertEquals(1, controller.lines.size());
        System.assertEquals(1, controller.lineRows.size());
        System.assertEquals('Core License', controller.lineRows[0].name);
        System.assertEquals('', controller.lineRows[0].rowStyle);
        System.assert(controller.generatedOnFormatted.length() > 0);
        System.assert(controller.quoteDateFormatted.length() > 0);
    }

    @isTest
    static void testMissingIdParamDoesNotThrow() {
        Test.setCurrentPageReference(new PageReference('/apex/QuotePdf'));

        Test.startTest();
        QuotePdfController controller = new QuotePdfController();
        Test.stopTest();

        System.assertEquals(null, controller.quote);
    }

    @isTest
    static void testGarbageIdParamDoesNotThrow() {
        Test.setCurrentPageReference(new PageReference('/apex/QuotePdf'));
        ApexPages.currentPage().getParameters().put('id', 'not-a-real-id');

        Test.startTest();
        QuotePdfController controller = new QuotePdfController();
        Test.stopTest();

        System.assertEquals(null, controller.quote);
    }
}
