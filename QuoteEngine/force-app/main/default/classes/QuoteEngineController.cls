/**
 * QuoteEngineController — UI layer for the quoteEngineConsole LWC. Builds
 * a quote from products and bundles, applies the volume-tier discount
 * engine on recalculation, and gates quotes with a large discount behind
 * an approval step (permission-gated Apex, same pattern as BillingHub's
 * refund approvals — not a native declarative Approval Process, kept
 * lightweight by design).
 */
public with sharing class QuoteEngineController {

    private static final Decimal APPROVAL_THRESHOLD_PERCENT = 15;

    @AuraEnabled(cacheable=true)
    public static List<Product__c> getProducts() {
        return [SELECT Id, Name, Description__c, Unit_Price__c, Category__c FROM Product__c WITH SECURITY_ENFORCED ORDER BY Name LIMIT 100];
    }

    @AuraEnabled(cacheable=true)
    public static List<Bundle__c> getBundles() {
        return [SELECT Id, Name, Description__c, Bundle_Discount_Percent__c FROM Bundle__c WITH SECURITY_ENFORCED ORDER BY Name LIMIT 100];
    }

    @AuraEnabled(cacheable=true)
    public static List<Quote__c> getQuotes() {
        return [SELECT Id, Name, Customer_Name__c, Status__c, Subtotal__c, Discount_Percent__c, Total__c FROM Quote__c WITH SECURITY_ENFORCED ORDER BY CreatedDate DESC LIMIT 50];
    }

    @AuraEnabled
    public static List<Quote_Line__c> getQuoteLines(Id quoteId) {
        return [
            SELECT Id, Line_Name__c, Quantity__c, Unit_Price__c, Line_Total__c
            FROM Quote_Line__c
            WHERE Quote__c = :quoteId
            WITH SECURITY_ENFORCED
            ORDER BY CreatedDate ASC
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Quote__c> getPendingApprovals() {
        return [SELECT Id, Name, Customer_Name__c, Subtotal__c, Discount_Percent__c, Total__c FROM Quote__c WHERE Status__c = 'Pending Approval' WITH SECURITY_ENFORCED ORDER BY CreatedDate ASC LIMIT 50];
    }

    @AuraEnabled
    public static Id createQuote(String customerName) {
        Quote__c q = new Quote__c(Customer_Name__c = customerName, Status__c = 'Draft');
        insert q;
        return q.Id;
    }

    @AuraEnabled
    public static void addProductLine(Id quoteId, Id productId, Decimal quantity) {
        Product__c p = [SELECT Id, Name, Unit_Price__c FROM Product__c WHERE Id = :productId WITH SECURITY_ENFORCED LIMIT 1];
        insert new Quote_Line__c(
            Quote__c = quoteId,
            Product__c = productId,
            Line_Name__c = p.Name,
            Quantity__c = quantity,
            Unit_Price__c = p.Unit_Price__c,
            Line_Total__c = p.Unit_Price__c * quantity
        );
        recalculateQuote(quoteId);
    }

    @AuraEnabled
    public static void addBundleLine(Id quoteId, Id bundleId, Decimal quantity) {
        Bundle__c b = [SELECT Id, Name, Bundle_Discount_Percent__c FROM Bundle__c WHERE Id = :bundleId WITH SECURITY_ENFORCED LIMIT 1];
        Decimal basePrice = 0;
        for (Bundle_Item__c item : [
            SELECT Quantity__c, Product__r.Unit_Price__c
            FROM Bundle_Item__c
            WHERE Bundle__c = :bundleId
            WITH SECURITY_ENFORCED
        ]) {
            basePrice += item.Quantity__c * item.Product__r.Unit_Price__c;
        }
        Decimal discountMultiplier = 1 - (b.Bundle_Discount_Percent__c / 100);
        Decimal bundleUnitPrice = (basePrice * discountMultiplier).setScale(2);

        insert new Quote_Line__c(
            Quote__c = quoteId,
            Bundle__c = bundleId,
            Line_Name__c = b.Name + ' (bundle)',
            Quantity__c = quantity,
            Unit_Price__c = bundleUnitPrice,
            Line_Total__c = bundleUnitPrice * quantity
        );
        recalculateQuote(quoteId);
    }

    @AuraEnabled
    public static Quote__c recalculateQuote(Id quoteId) {
        Decimal subtotal = 0;
        Integer totalQuantity = 0;
        for (Quote_Line__c line : [
            SELECT Quantity__c, Line_Total__c
            FROM Quote_Line__c
            WHERE Quote__c = :quoteId
            WITH SECURITY_ENFORCED
        ]) {
            subtotal += line.Line_Total__c;
            totalQuantity += Integer.valueOf(line.Quantity__c);
        }

        Decimal discountPercent = DiscountRuleService.getApplicableDiscount(totalQuantity);
        Decimal total = (subtotal * (1 - discountPercent / 100)).setScale(2);

        Quote__c q = new Quote__c(
            Id = quoteId,
            Subtotal__c = subtotal,
            Discount_Percent__c = discountPercent,
            Total__c = total
        );
        update q;
        return q;
    }

    @AuraEnabled
    public static void submitForApproval(Id quoteId) {
        Quote__c q = [SELECT Id, Discount_Percent__c FROM Quote__c WHERE Id = :quoteId WITH SECURITY_ENFORCED LIMIT 1];
        String newStatus = q.Discount_Percent__c >= APPROVAL_THRESHOLD_PERCENT ? 'Pending Approval' : 'Approved';
        update new Quote__c(Id = quoteId, Status__c = newStatus);
    }

    @AuraEnabled
    public static void decideQuote(Id quoteId, Boolean approve, String notes) {
        Quote__c q = [SELECT Id, Status__c FROM Quote__c WHERE Id = :quoteId WITH SECURITY_ENFORCED LIMIT 1];
        if (q.Status__c != 'Pending Approval') {
            return;
        }
        update new Quote__c(
            Id = quoteId,
            Status__c = approve ? 'Approved' : 'Rejected',
            Approval_Notes__c = notes
        );
    }
}
