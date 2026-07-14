/**
 * StockController
 *
 * Apex controller for the `stockDashboard` Lightning Web Component:
 * summary counts, the reorder list, an on-demand batch run, and a
 * demo-data seeder.
 */
public with sharing class StockController {

    /** Counts per stock status, plus a total, for the dashboard tiles. */
    @AuraEnabled(cacheable=true)
    public static Map<String, Integer> getSummary() {
        Map<String, Integer> summary = new Map<String, Integer>{
            'In Stock' => 0,
            'Low Stock' => 0,
            'Out of Stock' => 0,
            'Total' => 0
        };
        for (AggregateResult ar : [
            SELECT Stock_Status__c status, COUNT(Id) total
            FROM Stock_Item__c
            GROUP BY Stock_Status__c
        ]) {
            String status = (String) ar.get('status');
            Integer total = (Integer) ar.get('total');
            if (status != null && summary.containsKey(status)) {
                summary.put(status, total);
            }
            summary.put('Total', summary.get('Total') + total);
        }
        return summary;
    }

    /** The full catalog, lowest stock first (drives the dashboard cards). */
    @AuraEnabled(cacheable=true)
    public static List<Stock_Item__c> getItems() {
        return [
            SELECT Id, Name, SKU__c, Category__c, Quantity_On_Hand__c,
                   Reorder_Point__c, Stock_Status__c, Unit_Cost__c, Last_Checked__c
            FROM Stock_Item__c
            ORDER BY Quantity_On_Hand__c ASC
            LIMIT 500
        ];
    }

    /** Items currently flagged for reorder, lowest stock first. */
    @AuraEnabled(cacheable=true)
    public static List<Stock_Item__c> getReorderList() {
        return [
            SELECT Id, Name, SKU__c, Category__c, Quantity_On_Hand__c,
                   Reorder_Point__c, Stock_Status__c, Last_Checked__c
            FROM Stock_Item__c
            WHERE Needs_Reorder__c = true
            ORDER BY Quantity_On_Hand__c ASC
            LIMIT 200
        ];
    }

    /**
     * Kick off the stock scan immediately (rather than waiting for the
     * nightly schedule). Returns the AsyncApexJob Id. The batch runs
     * asynchronously, so the UI should refresh shortly after.
     */
    @AuraEnabled
    public static Id runScanNow() {
        return Database.executeBatch(new StockLevelBatch(), 200);
    }

}
