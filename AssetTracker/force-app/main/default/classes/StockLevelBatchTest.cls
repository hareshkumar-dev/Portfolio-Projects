/**
 * Tests for StockLevelBatch and StockLevelScheduler.
 *
 * Verifies the classification logic (in / low / out) after the batch
 * runs, and that the scheduler enqueues without error.
 */
@isTest
private class StockLevelBatchTest {

    @testSetup
    static void setup() {
        insert new List<Stock_Item__c>{
            new Stock_Item__c(Name = 'Healthy Widget',  SKU__c = 'SKU-IN',  Quantity_On_Hand__c = 100, Reorder_Point__c = 10),
            new Stock_Item__c(Name = 'Running Low',      SKU__c = 'SKU-LOW', Quantity_On_Hand__c = 5,   Reorder_Point__c = 10),
            new Stock_Item__c(Name = 'All Gone',         SKU__c = 'SKU-OUT', Quantity_On_Hand__c = 0,   Reorder_Point__c = 10),
            new Stock_Item__c(Name = 'Exactly At Point', SKU__c = 'SKU-EQ',  Quantity_On_Hand__c = 10,  Reorder_Point__c = 10)
        };
    }

    private static String statusOf(String sku) {
        return [SELECT Stock_Status__c FROM Stock_Item__c WHERE SKU__c = :sku].Stock_Status__c;
    }

    @isTest
    static void classifiesEveryItem() {
        Test.startTest();
        Database.executeBatch(new StockLevelBatch(), 200);
        Test.stopTest();

        System.assertEquals('In Stock', statusOf('SKU-IN'), 'Well-stocked item');
        System.assertEquals('Low Stock', statusOf('SKU-LOW'), 'Below reorder point');
        System.assertEquals('Out of Stock', statusOf('SKU-OUT'), 'Zero quantity');
        System.assertEquals('Low Stock', statusOf('SKU-EQ'), 'At the reorder point counts as low');
    }

    @isTest
    static void flagsAndTimestampsReorders() {
        Test.startTest();
        Database.executeBatch(new StockLevelBatch(), 200);
        Test.stopTest();

        Integer flagged = [SELECT COUNT() FROM Stock_Item__c WHERE Needs_Reorder__c = true];
        System.assertEquals(3, flagged, 'Low, out, and at-point items should be flagged');

        Integer checked = [SELECT COUNT() FROM Stock_Item__c WHERE Last_Checked__c != null];
        System.assertEquals(4, checked, 'Every item should be timestamped');
    }

    @isTest
    static void schedulerEnqueuesBatch() {
        Test.startTest();
        String jobId = System.schedule(
            'Stock Scan Test',
            '0 0 2 * * ?',
            new StockLevelScheduler()
        );
        Test.stopTest();

        CronTrigger ct = [SELECT Id, CronJobDetail.Name FROM CronTrigger WHERE Id = :jobId];
        System.assertNotEquals(null, ct, 'Scheduler should register a cron job');
    }
}
