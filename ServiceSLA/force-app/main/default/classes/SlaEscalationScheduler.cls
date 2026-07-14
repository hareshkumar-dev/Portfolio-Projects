/**
 * SlaEscalationScheduler — runs the escalation batch on a schedule.
 *
 * Schedule from anonymous Apex, e.g. every 15 minutes is overkill for a
 * demo; hourly is typical:
 *
 *   System.schedule('SLA Escalation Hourly', '0 0 * * * ?',
 *       new SlaEscalationScheduler());
 */
public with sharing class SlaEscalationScheduler implements Schedulable {
    public void execute(SchedulableContext sc) {
        Database.executeBatch(new SlaEscalationBatch(), 200);
    }
}
