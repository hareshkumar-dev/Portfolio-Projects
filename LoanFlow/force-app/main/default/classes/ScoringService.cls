/**
 * ScoringService — the RULES/SCORING engine (SERVICE layer).
 *
 * Produces a 0-100 eligibility score (higher = lower risk) by combining
 * per-criterion sub-scores (0..1) with the weights from configuration.
 * The weights are config; how each criterion maps to a sub-score is
 * code. Pure and DML-free, so it's trivially unit-testable.
 */
public with sharing class ScoringService {

    /** Weighted 0-100 score for one application. */
    public static Decimal score(Loan_Application__c app) {
        Decimal total = 0;
        for (ScoringConfigService.Weight w : ScoringConfigService.getWeights()) {
            total += subScore(w.criterion, app) * w.weight;
        }
        return total.setScale(0, System.RoundingMode.HALF_UP);
    }

    /** Debt-to-income ratio (annualised). 1 (worst) if income is unknown. */
    public static Decimal dti(Loan_Application__c app) {
        Decimal income = (app.Annual_Income__c == null || app.Annual_Income__c == 0)
            ? null : app.Annual_Income__c;
        if (income == null) return 1;
        Decimal monthlyDebt = app.Monthly_Debt__c == null ? 0 : app.Monthly_Debt__c;
        return (monthlyDebt * 12) / income;
    }

    /** Maps one criterion to a 0..1 sub-score. */
    private static Decimal subScore(String criterion, Loan_Application__c app) {
        if (criterion == 'Credit_Score') {
            Decimal cs = app.Credit_Score__c == null ? 300 : app.Credit_Score__c;
            return clamp((cs - 300) / 550); // 300..850 -> 0..1
        } else if (criterion == 'DTI_Ratio') {
            return 1 - clamp(dti(app) / 0.5); // 0 DTI -> 1, >=50% -> 0
        } else if (criterion == 'Income') {
            Decimal income = app.Annual_Income__c == null ? 0 : app.Annual_Income__c;
            return clamp(income / 200000); // caps at 200k
        } else if (criterion == 'Employment_Years') {
            Decimal years = app.Employment_Years__c == null ? 0 : app.Employment_Years__c;
            return clamp(years / 10); // caps at 10 years
        }
        return 0;
    }

    private static Decimal clamp(Decimal v) {
        if (v < 0) return 0;
        if (v > 1) return 1;
        return v;
    }
}
