/**
 * DiscountRuleService — the volume-discount rules engine. Tiers are plain
 * Discount_Tier__c records (not Custom Metadata), so an admin tunes
 * pricing from the console with no deployment. Given a quote's total line
 * quantity, returns the richest tier the quote qualifies for.
 */
public with sharing class DiscountRuleService {

    public static Decimal getApplicableDiscount(Integer totalQuantity) {
        Decimal best = 0;
        for (Discount_Tier__c tier : [
            SELECT Min_Quantity__c, Discount_Percent__c
            FROM Discount_Tier__c
            WHERE Active__c = true AND Min_Quantity__c <= :totalQuantity
            WITH SECURITY_ENFORCED
            ORDER BY Min_Quantity__c DESC
        ]) {
            best = tier.Discount_Percent__c;
            break; // highest qualifying Min_Quantity__c wins — first row after DESC order
        }
        return best;
    }
}
