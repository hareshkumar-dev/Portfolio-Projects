/**
 * SlaService — SERVICE layer (the SLA business rules).
 *
 * Pure, bulk-safe operations on in-memory Case lists; the trigger and
 * batch call these. No SOQL/DML here except through injected config —
 * that keeps the rules unit-testable in isolation.
 */
public with sharing class SlaService {

    private static final String DEFAULT_TIER = 'Standard';

    // Case statuses that count as "closed". Detecting closure by Status
    // (not IsClosed) matters in before-update: the platform doesn't
    // recompute IsClosed on the new record until after before-triggers run,
    // so IsClosed there still reflects the prior status.
    private static final Set<String> CLOSED_STATUSES = new Set<String>{ 'Closed' };

    /**
     * On creation, stamp Response/Resolution targets from the tier's
     * policy and initialise the SLA status. (before-insert context.)
     */
    public static void applyTargets(List<Case> cases) {
        Map<String, SlaPolicyService.Policy> policies = SlaPolicyService.getPolicies();
        Datetime nowDt = Datetime.now();

        for (Case c : cases) {
            String tier = String.isBlank(c.Service_Tier__c) ? DEFAULT_TIER : c.Service_Tier__c;
            SlaPolicyService.Policy policy = policies.get(tier);
            if (policy == null) {
                Logger.warn('SlaService.applyTargets', 'No active SLA policy for tier: ' + tier);
                continue;
            }
            c.Response_Target__c = nowDt.addMinutes(policy.responseMinutes);
            c.Resolution_Target__c = nowDt.addMinutes(policy.resolutionHours * 60);
            if (String.isBlank(c.SLA_Status__c)) {
                c.SLA_Status__c = 'On Track';
            }
        }
    }

    /**
     * On update, record first response and evaluate closure against the
     * resolution target. (before-update context.)
     */
    public static void handleUpdates(List<Case> newCases, Map<Id, Case> oldMap) {
        Datetime nowDt = Datetime.now();

        for (Case c : newCases) {
            Case prior = oldMap.get(c.Id);

            // First response: case leaving 'New' for the first time.
            if (c.First_Responded_At__c == null && prior.Status == 'New' && c.Status != 'New') {
                c.First_Responded_At__c = nowDt;
            }

            // Closure: judge against the resolution target. Detect the
            // transition into a closed status by Status (see CLOSED_STATUSES).
            if (CLOSED_STATUSES.contains(c.Status) && !CLOSED_STATUSES.contains(prior.Status)) {
                Boolean late = c.Resolution_Target__c != null && nowDt > c.Resolution_Target__c;
                c.SLA_Status__c = late ? 'Resolution Breached' : 'Met';
            }
        }
    }

    /**
     * Evaluate open cases against their targets and flag breaches.
     * Mutates the list and returns the ones that changed (for the batch
     * to persist). (No DML here.)
     */
    public static List<Case> evaluateBreaches(List<Case> openCases) {
        Datetime nowDt = Datetime.now();
        List<Case> changed = new List<Case>();

        for (Case c : openCases) {
            String original = c.SLA_Status__c;
            Boolean wasEscalated = c.Is_Escalated__c;

            if (c.Resolution_Target__c != null && nowDt > c.Resolution_Target__c) {
                c.SLA_Status__c = 'Resolution Breached';
                c.Is_Escalated__c = true;
                c.Priority = 'High';
            } else if (c.First_Responded_At__c == null
                    && c.Response_Target__c != null && nowDt > c.Response_Target__c) {
                c.SLA_Status__c = 'Response Breached';
            }

            if (c.SLA_Status__c != original || c.Is_Escalated__c != wasEscalated) {
                changed.add(c);
            }
        }
        return changed;
    }
}
