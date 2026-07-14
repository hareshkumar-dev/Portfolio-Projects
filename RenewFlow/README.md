# RenewFlow — Subscription & Renewal Engine

A **Salesforce solution** to a SaaS company's revenue problem, built with an enterprise **layered architecture**, **scheduled record-generation**, and live **financial roll-ups**.

---

## The client problem

> "We run on recurring revenue, but renewals fall through the cracks — nobody notices a contract is about to expire until the customer has already left. We have **no live view of MRR or ARR**, no idea how many renewals are due, and churn only shows up in a spreadsheet a month later. We need the system to **generate renewals ahead of expiry**, **track MRR automatically**, and **flag churn** — and we need to tune the renewal timing without a developer."

## The solution, at a glance

- A scheduled sweep **auto-generates a renewal record** for every subscription entering its renewal window, and **flags churn** for anything that lapses past the grace period.
- **MRR and active-subscription counts roll up to the customer automatically** — maintained live by a trigger, so the dashboard is always current.
- A **revenue dashboard** shows Total MRR, ARR, renewals due, pending renewals and churn at a glance.
- The renewal lead time, grace period and default term live in **Custom Metadata** — tuned in Setup.

## High-level structure (separation of concerns)

```
┌──────────────────────────────────────────────────────────────────────┐
│  UI          revenueDashboard (LWC) ─► RevenueDashboardController      │
├──────────────────────────────────────────────────────────────────────┤
│  DOMAIN      SubscriptionTrigger ─► Handler ─► TriggerHandler (base)   │
├──────────────────────────────────────────────────────────────────────┤
│  SERVICE     MrrRollupService  ← the FINANCIAL ROLL-UP (trigger-driven) │
│              RenewalService    (generate renewals)                     │
│              ChurnService      (flag lapsed subscriptions)             │
│              SubscriptionLifecycleService (activate renewal → retire prior) │
│              MrrService        (portfolio MRR/ARR metrics)             │
├──────────────────────────────────────────────────────────────────────┤
│  SELECTOR    SubscriptionSelector                                    │
├──────────────────────────────────────────────────────────────────────┤
│  ASYNC       RenewalGenerationBatch + RenewalGenerationScheduler       │
│  UOW/LOG     UnitOfWork · Logger + Log__c                             │
├──────────────────────────────────────────────────────────────────────┤
│  CONFIG      Renewal_Setting__mdt (lead time · grace · default term)   │
│  DATA        Customer__c (roll-up target) · Subscription__c            │
└──────────────────────────────────────────────────────────────────────┘
```

## The two distinctive patterns

**1. Scheduled record-generation.** `RenewalGenerationBatch` runs nightly over active subscriptions. For anything expiring within the lead time (auto-renew on), `RenewalService` builds a **new** subscription — the renewal — starting the day after the current term ends, linked back via `Renewal_Of__c`. For anything past its grace period, `ChurnService` marks it **Churned**. Both are committed together through the Unit of Work.

**2. Financial roll-up maintained by a trigger.** `MrrRollupService` keeps `Customer__c.Total_MRR__c` and `Active_Subscriptions__c` equal to the SUM/COUNT of *active* subscriptions — recomputed on every insert, status change, reparent, and delete (bulk-safe: one aggregate query + one update per affected customer set). So MRR is always live, not a nightly report.

## The renewal lifecycle

```
Active ──(within lead time)──► batch creates a linked "Pending Renewal"
   │                                      │
   │                          ops activates the renewal
   │                                      ▼
   └──(past grace, no renew)──► Churned   renewal → Active,  original → Renewed
                                          (the Lifecycle service retires the prior term)
```

Activating a renewal fires the trigger's cascade: the prior subscription is set to **Renewed** (dropping out of the MRR roll-up), and the new one carries the MRR forward.

---

## Deploy

```powershell
sf org login web --alias renew-org
sf project deploy start --source-dir force-app --target-org renew-org --test-level RunLocalTests
sf org assign permset --name Renewals_Manager --target-org renew-org
```

Schedule the sweep once, from anonymous Apex:

```apex
System.schedule('Renewal Sweep Daily', '0 0 4 * * ?', new RenewalGenerationScheduler());
```

## Use it

1. App Launcher → **Revenue & Renewals** (custom tab), or drop the component on any Lightning page.
2. **Seed demo data** — three customers with subscriptions: one healthy, two due for renewal, one lapsed. Watch **Total MRR / ARR** populate from the roll-up.
3. **Run renewal sweep** → the two due subscriptions get **Pending Renewal** records; the lapsed one flips to **Churned**. Refresh to see the tiles move.
4. **Activate** a Pending Renewal → it becomes Active and the original flips to **Renewed** (MRR carries forward, roll-up stays correct).
5. **Tune the timing:** Setup → Custom Metadata Types → **Renewal Setting** → *Default* → change the lead time from 60 to 90 days → the next sweep honours it.

## Testing

```powershell
sf apex run test --target-org renew-org --test-level RunLocalTests --result-format human --code-coverage
```

Tests cover the MRR roll-up (insert / churn / delete), renewal generation + churn (service + batch), the scheduler, the renewal-activation cascade, and the controller/metrics. `RenewTestData` injects settings via a `@TestVisible` seam.

## Project layout

```
force-app/main/default/
├── customMetadata/  Renewal_Setting.Default
├── objects/  Renewal_Setting__mdt · Customer__c · Subscription__c · Log__c
├── triggers/  SubscriptionTrigger
├── classes/
│   ├── TriggerHandler · UnitOfWork · Logger                    (framework)
│   ├── RenewalSettingService                                  (config accessor)
│   ├── MrrRollupService · RenewalService · ChurnService ·
│   │   SubscriptionLifecycleService · MrrService              (service)
│   ├── SubscriptionSelector · SubscriptionTriggerHandler      (selector · domain)
│   ├── RenewalGenerationBatch · RenewalGenerationScheduler    (async)
│   ├── RevenueDashboardController                             (UI)
│   └── *Test + RenewTestData                                  (tests)
├── lwc/  revenueDashboard
├── tabs/  Revenue_Renewals
└── permissionsets/  Renewals_Manager
```

## Notes & caveats

- Metadata-only project — deploy to a Salesforce org (a free [Developer Edition](https://developer.salesforce.com/signup) works). Not runnable locally.
- Uses a custom `Customer__c` as the roll-up parent to stay self-contained; a real org might roll MRR onto the standard Account instead — the layered design would be identical.
- Validated all metadata is well-formed and the Apex is structurally sound, but this hasn't been deployed to a live org — `sf project deploy start --test-level RunLocalTests` is the final confirmation.
