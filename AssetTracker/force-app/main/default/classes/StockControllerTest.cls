/**
 * Tests for StockController (the dashboard's Apex controller).
 */
@isTest
private class StockControllerTest {

    static void makeCatalog() {
        insert new List<Stock_Item__c>{
            new Stock_Item__c(Name = 'USB-C Cable 1m',      SKU__c = 'ELE-001', Category__c = 'Electronics', Quantity_On_Hand__c = 240, Reorder_Point__c = 50, Unit_Cost__c = 120),
            new Stock_Item__c(Name = 'Wireless Mouse',      SKU__c = 'ELE-002', Category__c = 'Electronics', Quantity_On_Hand__c = 8,   Reorder_Point__c = 20, Unit_Cost__c = 650),
            new Stock_Item__c(Name = 'Mechanical Keyboard', SKU__c = 'ELE-003', Category__c = 'Electronics', Quantity_On_Hand__c = 0,   Reorder_Point__c = 15, Unit_Cost__c = 2999),
            new Stock_Item__c(Name = 'Office Chair',        SKU__c = 'FUR-001', Category__c = 'Furniture',   Quantity_On_Hand__c = 32,  Reorder_Point__c = 10, Unit_Cost__c = 5400),
            new Stock_Item__c(Name = 'Standing Desk',       SKU__c = 'FUR-002', Category__c = 'Furniture',   Quantity_On_Hand__c = 4,   Reorder_Point__c = 5,  Unit_Cost__c = 18500),
            new Stock_Item__c(Name = 'A4 Paper Ream',       SKU__c = 'STA-001', Category__c = 'Stationery',  Quantity_On_Hand__c = 500, Reorder_Point__c = 100, Unit_Cost__c = 280),
            new Stock_Item__c(Name = 'Whiteboard Marker',   SKU__c = 'STA-002', Category__c = 'Stationery',  Quantity_On_Hand__c = 12,  Reorder_Point__c = 30, Unit_Cost__c = 45),
            new Stock_Item__c(Name = 'Hand Sanitizer 500ml',SKU__c = 'CON-001', Category__c = 'Consumables', Quantity_On_Hand__c = 0,   Reorder_Point__c = 25, Unit_Cost__c = 150)
        };
    }

    @isTest
    static void catalogAndItemsRead() {
        Test.startTest();
        makeCatalog();
        Test.stopTest();

        System.assertEquals(8, [SELECT COUNT() FROM Stock_Item__c]);
        System.assertEquals(8, StockController.getItems().size(), 'getItems returns the catalog');
    }

    @isTest
    static void summaryAndReorderReflectTheScan() {
        makeCatalog();

        Test.startTest();
        Database.executeBatch(new StockLevelBatch(), 200);
        Test.stopTest();

        Map<String, Integer> summary = StockController.getSummary();
        System.assertEquals(8, summary.get('Total'), 'All items counted');
        System.assert(summary.get('Out of Stock') >= 2, 'Catalog includes out-of-stock');

        List<Stock_Item__c> reorder = StockController.getReorderList();
        System.assert(!reorder.isEmpty(), 'Reorder list should not be empty after the scan');
    }

    @isTest
    static void runScanNowEnqueuesBatch() {
        makeCatalog();

        Test.startTest();
        Id jobId = StockController.runScanNow();
        Test.stopTest();

        System.assertNotEquals(null, jobId, 'runScanNow should return an AsyncApexJob Id');
        Integer classified = [SELECT COUNT() FROM Stock_Item__c WHERE Last_Checked__c != null];
        System.assertEquals(8, classified, 'Every item should be classified');
    }
}
