/**
 * StockLevelScheduler
 *
 * Schedulable wrapper that runs StockLevelBatch. Schedule it to run
 * nightly, e.g. from anonymous Apex:
 *
 *   System.schedule(
 *     'Nightly Stock Scan',
 *     '0 0 2 * * ?',                 // 02:00 every day
 *     new StockLevelScheduler()
 *   );
 */
public with sharing class StockLevelScheduler implements Schedulable {

    // Batch chunk size — 200 records per execute() call.
    private static final Integer SCOPE_SIZE = 200;

    public void execute(SchedulableContext sc) {
        Database.executeBatch(new StockLevelBatch(), SCOPE_SIZE);
    }
}
