@isTest
private class DiscountRuleServiceTest {

    @TestSetup
    static void setup() {
        insert new List<Discount_Tier__c>{
            new Discount_Tier__c(Name = 'Base', Min_Quantity__c = 0, Discount_Percent__c = 0, Active__c = true),
            new Discount_Tier__c(Name = 'Volume 10+', Min_Quantity__c = 10, Discount_Percent__c = 5, Active__c = true),
            new Discount_Tier__c(Name = 'Volume 50+', Min_Quantity__c = 50, Discount_Percent__c = 12, Active__c = true),
            new Discount_Tier__c(Name = 'Volume 100+ (inactive)', Min_Quantity__c = 100, Discount_Percent__c = 25, Active__c = false)
        };
    }

    @isTest
    static void testNoQualifyingVolumeReturnsBaseTier() {
        System.assertEquals(0, DiscountRuleService.getApplicableDiscount(5));
    }

    @isTest
    static void testMidVolumeReturnsMatchingTier() {
        System.assertEquals(5, DiscountRuleService.getApplicableDiscount(15));
    }

    @isTest
    static void testHighVolumeReturnsRichestTier() {
        System.assertEquals(12, DiscountRuleService.getApplicableDiscount(75));
    }

    @isTest
    static void testInactiveTierIsIgnored() {
        // 150 would qualify for the inactive 100+ tier (25%) if it were active; it's not, so 50+ (12%) wins.
        System.assertEquals(12, DiscountRuleService.getApplicableDiscount(150));
    }
}
