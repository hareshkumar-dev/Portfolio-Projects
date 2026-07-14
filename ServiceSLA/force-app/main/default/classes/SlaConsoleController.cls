/**
 * SlaConsoleController — UI layer for the slaConsole LWC.
 *
 * Read paths go through the selector; the on-demand escalation reuses
 * the batch. The seeder builds a realistic mix of tiers and some
 * deliberately-breached cases so the console has something to show.
 */
public with sharing class SlaConsoleController {

    public class Summary {
        @AuraEnabled public Integer open;
        @AuraEnabled public Integer onTrack;
        @AuraEnabled public Integer breached;
        @AuraEnabled public Integer escalated;
    }

    @AuraEnabled(cacheable=true)
    public static Summary getSummary() {
        Summary s = new Summary();
        s.open = 0; s.onTrack = 0; s.breached = 0; s.escalated = 0;
        for (Case c : CaseSelector.selectOpen()) {
            s.open++;
            if (c.Is_Escalated__c) s.escalated++;
            if (c.SLA_Status__c == 'On Track') s.onTrack++;
            else if (c.SLA_Status__c == 'Response Breached' || c.SLA_Status__c == 'Resolution Breached') {
                s.breached++;
            }
        }
        return s;
    }

    @AuraEnabled(cacheable=true)
    public static List<Case> getOpenCases() {
        return CaseSelector.selectOpenForConsole();
    }

    /** Run the SLA sweep now (async); returns the AsyncApexJob Id. */
    @AuraEnabled
    public static Id runEscalationNow() {
        return Database.executeBatch(new SlaEscalationBatch(), 200);
    }

    /**
     * Seed a demo case mix. Some cases are pushed past their targets so
     * the escalation sweep has breaches to catch.
     */
    @AuraEnabled
    public static Integer seedSampleData() {
        if (!CaseSelector.selectDemo().isEmpty()) return 0;

        List<Case> cases = new List<Case>{
            new Case(Subject = '[Demo] Login page down',        Service_Tier__c = 'Platinum', Status = 'New', Priority = 'High'),
            new Case(Subject = '[Demo] Report export slow',     Service_Tier__c = 'Gold',     Status = 'New', Priority = 'Medium'),
            new Case(Subject = '[Demo] Password reset email',   Service_Tier__c = 'Standard', Status = 'New', Priority = 'Low'),
            new Case(Subject = '[Demo] API returning 500s',     Service_Tier__c = 'Platinum', Status = 'Working', Priority = 'High'),
            new Case(Subject = '[Demo] Invoice PDF misaligned', Service_Tier__c = 'Gold',     Status = 'New', Priority = 'Medium'),
            new Case(Subject = '[Demo] Feature request: dark mode', Service_Tier__c = 'Standard', Status = 'New', Priority = 'Low')
        };
        insert cases; // trigger stamps future targets

        // Simulate elapsed time so the sweep finds breaches.
        Datetime nowDt = Datetime.now();
        cases[0].Resolution_Target__c = nowDt.addHours(-1);   // Platinum overdue
        cases[3].Resolution_Target__c = nowDt.addMinutes(-30); // Platinum overdue
        cases[1].Response_Target__c = nowDt.addMinutes(-20);   // Gold response overdue, no first response
        update cases;

        return cases.size();
    }
}
