/**
 * MatchingService — the MATCHING engine (SERVICE layer).
 *
 * Scores every eligible technician for a work order and returns the best.
 * Score = skillWeight (eligible ⇒ skill matched) + territoryWeight (if
 * same territory) + loadWeight × capacity-headroom, on a 0-100 scale.
 * Eligibility is a hard filter: available, has the required skill, and
 * not at capacity. Pure and DML-free.
 */
public with sharing class MatchingService {

    public class Result {
        public Id technicianId;
        public Decimal score;
        public Integer candidates;
        public String reason;
    }

    /**
     * @param loadMap  live in-memory load per technician (so sequential
     *                 assignment within a batch keeps balancing)
     */
    public static Result rank(
        Work_Order__c wo, List<Technician__c> techs,
        Map<Id, Integer> loadMap, MatchWeightService.Weights w
    ) {
        Result best;
        Integer eligibleCount = 0;

        for (Technician__c t : techs) {
            Integer maxJobs = (t.Max_Jobs__c == null) ? 5 : Integer.valueOf(t.Max_Jobs__c);
            Integer load = loadMap.containsKey(t.Id) ? loadMap.get(t.Id) : 0;

            if (!t.Is_Available__c) continue;
            if (load >= maxJobs) continue;
            if (!hasSkill(t, wo.Required_Skill__c)) continue;

            eligibleCount++;
            Decimal score = scoreFor(wo, t, load, maxJobs, w);

            if (best == null || score > best.score
                || (score == best.score && load < loadMap.get(best.technicianId))) {
                best = new Result();
                best.technicianId = t.Id;
                best.score = score;
            }
        }

        if (best == null) return null;
        best.candidates = eligibleCount;
        best.reason = 'Best of ' + eligibleCount + ' eligible technician(s) by skill, territory and load.';
        return best;
    }

    private static Decimal scoreFor(
        Work_Order__c wo, Technician__c t, Integer load, Integer maxJobs,
        MatchWeightService.Weights w
    ) {
        Decimal territory = (t.Territory__c != null && t.Territory__c == wo.Territory__c) ? 1 : 0;
        Decimal headroom = maxJobs <= 0 ? 0 : Decimal.valueOf(maxJobs - load) / maxJobs;
        if (headroom < 0) headroom = 0;
        if (headroom > 1) headroom = 1;
        // skill term is always 1 here (eligibility guaranteed a skill match)
        return (1 * w.skill) + (territory * w.territory) + (headroom * w.load);
    }

    /** Does the technician's multi-select Skills include the required one? */
    public static Boolean hasSkill(Technician__c t, String requiredSkill) {
        if (String.isBlank(requiredSkill)) return true;
        if (String.isBlank(t.Skills__c)) return false;
        for (String s : t.Skills__c.split(';')) {
            if (s == requiredSkill) return true;
        }
        return false;
    }
}
