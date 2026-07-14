/**
 * RebalanceScheduler — runs the backlog dispatch on a schedule.
 *
 *   System.schedule('Dispatch Rebalance', '0 0/30 * * * ?',
 *       new RebalanceScheduler());
 */
public with sharing class RebalanceScheduler implements Schedulable {
    public void execute(SchedulableContext sc) {
        Database.executeBatch(new RebalanceBatch(), 200);
    }
}
