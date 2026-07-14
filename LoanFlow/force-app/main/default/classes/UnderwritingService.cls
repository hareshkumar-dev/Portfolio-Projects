/**
 * UnderwritingService — orchestrates the SCORE → DECIDE → RECORD flow
 * (SERVICE layer). It mutates applications in place (so the trigger can
 * persist them with no extra DML) and builds the audit records the
 * handler commits through the Unit of Work.
 */
public with sharing class UnderwritingService {

    /** Score and decide each application, writing results onto the records. */
    public static void underwrite(List<Loan_Application__c> apps) {
        for (Loan_Application__c app : apps) {
            Decimal score = ScoringService.score(app);
            DecisionService.Outcome outcome = DecisionService.decide(score, app.Loan_Amount__c);

            app.Risk_Score__c = score;
            app.Decision__c = outcome.decision;
            app.Decision_Reason__c = outcome.reason;
            app.Status__c = outcome.status;
            app.Requires_Underwriter__c = outcome.requiresUnderwriter;
        }
    }

    /** Build an immutable audit record per decided application. */
    public static List<Decision_Audit__c> buildAudits(List<Loan_Application__c> apps) {
        List<Decision_Audit__c> audits = new List<Decision_Audit__c>();
        Datetime nowDt = Datetime.now();
        String actor = UserInfo.getName();

        for (Loan_Application__c app : apps) {
            audits.add(new Decision_Audit__c(
                Loan_Application__c = app.Id,
                Risk_Score__c = app.Risk_Score__c,
                Decision__c = app.Decision__c,
                Reason__c = app.Decision_Reason__c,
                Decided_By__c = actor,
                Decided_At__c = nowDt
            ));
        }
        return audits;
    }
}
