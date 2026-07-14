/**
 * StageAgingScheduler — runs the aging sweep on a schedule.
 *
 *   System.schedule('Claim Aging Nightly', '0 0 3 * * ?',
 *       new StageAgingScheduler());
 */
public with sharing class StageAgingScheduler implements Schedulable {
    public void execute(SchedulableContext sc) {
        Database.executeBatch(new StageAgingBatch(), 200);
    }
}
