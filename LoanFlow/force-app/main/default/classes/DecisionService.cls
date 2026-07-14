/**
 * DecisionService — the DECISIONING engine (SERVICE layer).
 *
 * Turns a score + amount into an auto-decision using the configured
 * thresholds. Large loans always route to an underwriter regardless of
 * score. Pure and DML-free.
 */
public with sharing class DecisionService {

    public class Outcome {
        public String decision;            // Auto-Approved / Referred / Declined
        public String status;              // Approved / Under Review / Declined
        public String reason;
        public Boolean requiresUnderwriter;
    }

    public static Outcome decide(Decimal score, Decimal amount) {
        DecisionPolicyService.Policy p = DecisionPolicyService.get();
        Outcome o = new Outcome();

        if (amount != null && p.manualReviewAmount != null && amount >= p.manualReviewAmount) {
            o.decision = 'Referred';
            o.status = 'Under Review';
            o.requiresUnderwriter = true;
            o.reason = 'Loan amount ≥ manual-review threshold; underwriter review required.';
        } else if (score >= p.autoApproveScore) {
            o.decision = 'Auto-Approved';
            o.status = 'Approved';
            o.requiresUnderwriter = false;
            o.reason = 'Score ' + score + ' meets the auto-approve threshold (' + p.autoApproveScore + ').';
        } else if (score < p.autoDeclineScore) {
            o.decision = 'Declined';
            o.status = 'Declined';
            o.requiresUnderwriter = false;
            o.reason = 'Score ' + score + ' is below the decline threshold (' + p.autoDeclineScore + ').';
        } else {
            o.decision = 'Referred';
            o.status = 'Under Review';
            o.requiresUnderwriter = true;
            o.reason = 'Score ' + score + ' falls in the referral band; underwriter review required.';
        }
        return o;
    }
}
