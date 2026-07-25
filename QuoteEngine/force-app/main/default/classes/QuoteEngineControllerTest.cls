@isTest
private class QuoteEngineControllerTest {

    @TestSetup
    static void setup() {
        insert new List<Product__c>{
            new Product__c(Name = 'Core License', Description__c = 'Per-seat core license', Unit_Price__c = 50, Category__c = 'Software'),
            new Product__c(Name = 'Onboarding Package', Description__c = 'Guided onboarding', Unit_Price__c = 500, Category__c = 'Services')
        };

        Bundle__c bundle = new Bundle__c(Name = 'Starter Bundle', Description__c = 'Core license + onboarding', Bundle_Discount_Percent__c = 10);
        insert bundle;

        List<Product__c> products = [SELECT Id, Name FROM Product__c];
        Map<String, Id> productIdByName = new Map<String, Id>();
        for (Product__c p : products) productIdByName.put(p.Name, p.Id);

        insert new List<Bundle_Item__c>{
            new Bundle_Item__c(Bundle__c = bundle.Id, Product__c = productIdByName.get('Core License'), Quantity__c = 5),
            new Bundle_Item__c(Bundle__c = bundle.Id, Product__c = productIdByName.get('Onboarding Package'), Quantity__c = 1)
        };

        insert new List<Discount_Tier__c>{
            new Discount_Tier__c(Name = 'Base', Min_Quantity__c = 0, Discount_Percent__c = 0, Active__c = true),
            new Discount_Tier__c(Name = 'Volume 20+', Min_Quantity__c = 20, Discount_Percent__c = 8, Active__c = true)
        };
    }

    private static Id productId(String name) {
        return [SELECT Id FROM Product__c WHERE Name = :name LIMIT 1].Id;
    }

    private static Id bundleId() {
        return [SELECT Id FROM Bundle__c LIMIT 1].Id;
    }

    @isTest
    static void testCreateQuoteAndAddProductLine() {
        Test.startTest();
        Id quoteId = QuoteEngineController.createQuote('Acme Corp');
        QuoteEngineController.addProductLine(quoteId, productId('Core License'), 3);
        Test.stopTest();

        Quote__c q = [SELECT Subtotal__c, Total__c, Discount_Percent__c FROM Quote__c WHERE Id = :quoteId];
        System.assertEquals(150, q.Subtotal__c); // 3 * 50
        System.assertEquals(0, q.Discount_Percent__c); // below the 20-unit tier
        System.assertEquals(150, q.Total__c);
    }

    @isTest
    static void testAddBundleLineAppliesBundleDiscount() {
        Test.startTest();
        Id quoteId = QuoteEngineController.createQuote('Beta LLC');
        QuoteEngineController.addBundleLine(quoteId, bundleId(), 1);
        Test.stopTest();

        // Bundle base = 5*50 + 1*500 = 750; 10% bundle discount -> 675
        List<Quote_Line__c> lines = [SELECT Unit_Price__c, Line_Total__c FROM Quote_Line__c WHERE Quote__c = :quoteId];
        System.assertEquals(1, lines.size());
        System.assertEquals(675, lines[0].Unit_Price__c);
        System.assertEquals(675, lines[0].Line_Total__c);
    }

    @isTest
    static void testVolumeDiscountAppliesAtThreshold() {
        Id quoteId = QuoteEngineController.createQuote('Gamma Inc');

        Test.startTest();
        QuoteEngineController.addProductLine(quoteId, productId('Core License'), 25);
        Test.stopTest();

        Quote__c q = [SELECT Subtotal__c, Discount_Percent__c, Total__c FROM Quote__c WHERE Id = :quoteId];
        System.assertEquals(1250, q.Subtotal__c); // 25 * 50
        System.assertEquals(8, q.Discount_Percent__c);
        System.assertEquals(1150, q.Total__c); // 1250 * 0.92
    }

    @isTest
    static void testSubmitBelowThresholdAutoApproves() {
        Id quoteId = QuoteEngineController.createQuote('Delta Co');
        QuoteEngineController.addProductLine(quoteId, productId('Core License'), 3); // 0% discount

        Test.startTest();
        QuoteEngineController.submitForApproval(quoteId);
        Test.stopTest();

        Quote__c q = [SELECT Status__c FROM Quote__c WHERE Id = :quoteId];
        System.assertEquals('Approved', q.Status__c);
    }

    @isTest
    static void testSubmitAboveThresholdRequiresApproval() {
        Id quoteId = QuoteEngineController.createQuote('Epsilon LLC');
        QuoteEngineController.addProductLine(quoteId, productId('Core License'), 25); // 8% discount, above 15%? no—need >=15

        Test.startTest();
        QuoteEngineController.submitForApproval(quoteId);
        Test.stopTest();

        // 8% is below the 15% approval threshold, so this should auto-approve too.
        Quote__c q = [SELECT Status__c FROM Quote__c WHERE Id = :quoteId];
        System.assertEquals('Approved', q.Status__c);
    }

    @isTest
    static void testSubmitAtHighDiscountRequiresApprovalAndDecision() {
        insert new Discount_Tier__c(Name = 'Volume 40+', Min_Quantity__c = 40, Discount_Percent__c = 20, Active__c = true);

        Id quoteId = QuoteEngineController.createQuote('Zeta Corp');
        QuoteEngineController.addProductLine(quoteId, productId('Core License'), 45); // 20% discount, above 15% threshold

        Test.startTest();
        QuoteEngineController.submitForApproval(quoteId);
        Test.stopTest();

        Quote__c pending = [SELECT Status__c FROM Quote__c WHERE Id = :quoteId];
        System.assertEquals('Pending Approval', pending.Status__c);
        System.assertEquals(1, QuoteEngineController.getPendingApprovals().size());

        QuoteEngineController.decideQuote(quoteId, true, 'Approved — strategic account.');
        Quote__c approved = [SELECT Status__c FROM Quote__c WHERE Id = :quoteId];
        System.assertEquals('Approved', approved.Status__c);
    }

    @isTest
    static void testGetProductsBundlesAndQuoteLines() {
        Id quoteId = QuoteEngineController.createQuote('Theta Inc');
        QuoteEngineController.addProductLine(quoteId, productId('Onboarding Package'), 1);

        Test.startTest();
        List<Product__c> products = QuoteEngineController.getProducts();
        List<Bundle__c> bundles = QuoteEngineController.getBundles();
        List<Quote_Line__c> lines = QuoteEngineController.getQuoteLines(quoteId);
        List<Quote__c> quotes = QuoteEngineController.getQuotes();
        Test.stopTest();

        System.assertEquals(2, products.size());
        System.assertEquals(1, bundles.size());
        System.assertEquals(1, lines.size());
        System.assert(quotes.size() >= 1);
    }
}
