# LoanFlow — Loan Origination Engine

A **Salesforce solution** to a lending client's problem, built with an enterprise **layered architecture** and a config-driven **rules & decisioning engine**.

---

## The client problem

> "Every loan officer underwrites a little differently. The same applicant can get approved by one and declined by another, we can't explain *why* a decision was made, and there's no audit trail when a regulator asks. We need **consistent, explainable, automated decisions** — and we need to change our risk appetite (thresholds, weights) without waiting on a developer."

## The solution, at a glance

- Every submitted application is **scored** by a weighted rules engine and given an **automated decision** — Auto-Approved, Referred (to an underwriter), or Declined — with a **written reason**.
- The scoring **weights** and decision **thresholds** live in **Custom Metadata**, so risk appetite is tuned in Setup, not code.
- Large loans always route to a human underwriter, regardless of score.
- Every decision writes an immutable **Decision Audit** record — the explainability/compliance trail.

## High-level structure (separation of concerns)

```
┌──────────────────────────────────────────────────────────────────────┐
│  UI          loanConsole (LWC) ─► LoanConsoleController                │
├──────────────────────────────────────────────────────────────────────┤
│  DOMAIN      LoanApplicationTrigger ─► Handler ─► TriggerHandler (base)│
├──────────────────────────────────────────────────────────────────────┤
│  SERVICE     ScoringService     (weighted rules engine)               │
│              DecisionService    (score+amount ─► decision)            │
│              UnderwritingService(orchestrates score→decide→audit)     │
├──────────────────────────────────────────────────────────────────────┤
│  SELECTOR    LoanApplicationSelector                                  │
├──────────────────────────────────────────────────────────────────────┤
│  UOW         UnitOfWork          (one ordered commit)                 │
│  LOGGING     Logger + Log__c                                          │
├──────────────────────────────────────────────────────────────────────┤
│  CONFIG      Scoring_Rule__mdt (weights) · Decision_Policy__mdt (thresholds) │
│  DATA        Loan_Application__c · Decision_Audit__c                   │
└──────────────────────────────────────────────────────────────────────┘
```

## The decisioning engine (the distinctive pattern)

**Scoring** combines a 0..1 sub-score per criterion with the configured weight:

| Criterion (config weight) | Sub-score |
|---|---|
| Credit Score (40) | `(score − 300) / 550`, clamped |
| DTI Ratio (25) | `1 − (dti / 0.5)`, clamped — lower debt is better |
| Income (20) | `income / 200k`, capped |
| Employment Years (15) | `years / 10`, capped |

Weights total 100, so the result is a **0–100 eligibility score**. **Decision** then applies the thresholds:

```
amount ≥ Manual_Review_Amount   → Referred   (human underwriter)
score  ≥ Auto_Approve_Score     → Auto-Approved
score  <  Auto_Decline_Score    → Declined
otherwise                        → Referred
```

Because both the weights and the thresholds are Custom Metadata, **the client changes their risk appetite in Setup** — e.g. raise the auto-approve bar from 70 to 75, or drop the credit-score weight — with no deployment.

## How an application flows

```
Application (Draft) ─► officer sets Status = Submitted
   └► LoanApplicationTrigger ─► Handler
         beforeUpdate:  UnderwritingService.underwrite
                          └► ScoringService.score  (reads Scoring_Rule__mdt)
                          └► DecisionService.decide (reads Decision_Policy__mdt)
                          └► writes Risk_Score__c, Decision__c, Reason, Status in place
         afterUpdate:   UnitOfWork commits a Decision_Audit__c (Ids now exist)
                          └► Logger.info(summary) ─► Log__c
```

Scoring happens in **before**-update (results written in place — no extra DML on the application); the **audit** is written in **after**-update through the Unit of Work. That split is deliberate and avoids recursive DML.

---

## Deploy

```powershell
sf org login web --alias loan-org
sf project deploy start --source-dir force-app --target-org loan-org --test-level RunLocalTests
sf org assign permset --name Loan_Officer --target-org loan-org
```

## Use it

1. App Launcher → **Loan Console** (custom tab), or drop the component on any Lightning page.
2. **Seed demo applications** — four applicants (strong, weak, mid, and a large-amount case) are created and underwritten, producing an auto-approval, a decline, and referrals.
3. Note the **Score**, **Decision** and colour on each row; click **Audit** on a row to see the decision trail (score, decision, reason, who, when).
4. Create a `Loan_Application__c` yourself (Draft), then **Submit** it — watch the engine score and decide it, and an audit appear.
5. **Change the risk appetite:** Setup → Custom Metadata Types → **Decision Policy** → *Default* → raise *Auto Approve Score* to 80, or edit a **Scoring Rule** weight → new submissions use it immediately.

## Testing

```powershell
sf apex run test --target-org loan-org --test-level RunLocalTests --result-format human --code-coverage
```

Tests cover the scoring/decisioning rules (pure), the trigger integration (submit → decision → audit), the amount override, insert defaults, and the controller. `LoanTestData` injects the config through `@TestVisible` seams, so tests don't depend on Custom Metadata rows.

## Project layout

```
force-app/main/default/
├── customMetadata/  Scoring_Rule.* (4) · Decision_Policy.Default
├── objects/
│   ├── Scoring_Rule__mdt · Decision_Policy__mdt        (config types)
│   ├── Loan_Application__c   (13 fields)
│   ├── Decision_Audit__c     (audit trail)
│   └── Log__c
├── triggers/  LoanApplicationTrigger
├── classes/
│   ├── TriggerHandler · UnitOfWork · Logger            (framework)
│   ├── ScoringConfigService · DecisionPolicyService    (config accessors)
│   ├── ScoringService · DecisionService · UnderwritingService (service)
│   ├── LoanApplicationSelector                         (selector)
│   ├── LoanApplicationTriggerHandler                   (domain)
│   ├── LoanConsoleController                           (UI)
│   └── *Test + LoanTestData                            (tests)
├── lwc/  loanConsole
├── tabs/  Loan_Console
└── permissionsets/  Loan_Officer
```

## Notes & caveats

- Metadata-only project — deploy to a Salesforce org (a free [Developer Edition](https://developer.salesforce.com/signup) works). Not runnable locally.
- A production build would likely add a formal **Approval Process** for the *Referred* queue (underwriter sign-off); here the engine performs the *routing* (flagging + status), which is the substantive part. The layered design would absorb an approval process without change.
- Validated all metadata is well-formed and the Apex is structurally sound, but this hasn't been deployed to a live org — `sf project deploy start --test-level RunLocalTests` is the final confirmation.
