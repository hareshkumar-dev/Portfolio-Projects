/**
 * RenewalGenerationScheduler — runs the renewal/churn sweep on a
 * schedule.
 *
 *   System.schedule('Renewal Sweep Daily', '0 0 4 * * ?',
 *       new RenewalGenerationScheduler());
 */
public with sharing class RenewalGenerationScheduler implements Schedulable {
    public void execute(SchedulableContext sc) {
        Database.executeBatch(new RenewalGenerationBatch(), 200);
    }
}
