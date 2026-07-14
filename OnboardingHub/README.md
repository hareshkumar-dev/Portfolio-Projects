# Onboarding Hub — Salesforce-Native Onboarding App

A **100% Salesforce** employee-onboarding application — no external frontend or server. Its signature is **declarative automation with a Record-Triggered Flow**: creating a New Hire record automatically generates their onboarding checklist. An Apex trigger rolls task completion back up to a **% complete**, and a Lightning Web Component gives HR a progress tracker.

---

## What it demonstrates (Flow + native Salesforce)

| Capability | Where |
|---|---|
| **Record-Triggered Flow** | `New Hire Onboarding Tasks` — on New Hire *create*, builds the standard checklist |
| **Apex roll-up trigger** | `OnboardingTaskTrigger` → `OnboardingRollupService` computes `Completion_Percent__c` + `Status__c` |
| **Apex controller for LWC** | `OnboardingController` |
| **Lightning Web Component** | `onboardingTracker` — progress rings, checklist, new-hire modal |
| **Custom objects + master-detail** | `New_Hire__c` ─◀ `Onboarding_Task__c` |
| **Apex tests** | `OnboardingRollupServiceTest`, `OnboardingControllerTest` |
| **Permission set + custom tab** | `Onboarding Hub User`, `Onboarding Tracker` |

## How the automation splits between Flow and Apex

This is a deliberate, real-world division of labour:

- **Flow creates** — declarative record creation is exactly what Flow is best at, and keeps the checklist template editable by an admin without code. The Record-Triggered Flow fires *after save* on New Hire creation and inserts five `Onboarding_Task__c` records (Paperwork, IT Setup, Training, two Introductions).
- **Apex rolls up** — a percentage across a variable number of child records is cleaner and more testable in Apex. The trigger recomputes `Completion_Percent__c` and moves `Status__c` through Pre-boarding → In Progress → Completed.

```
New_Hire__c (parent)                    Onboarding_Task__c (child)
├── Name              Employee name     ├── Name        Auto Number TASK-{0000}
├── Start_Date__c                       ├── New_Hire__c Master-Detail
├── Department__c                       ├── Subject__c  The checklist item
├── Role__c / Email__c                  ├── Category__c Paperwork / IT Setup / …
├── Status__c         ◄── rolled up ────┤ Status__c     Not Started / In Progress / Completed
├── Completion_Percent__c ◄─────────────┘ Due_Date__c
└── Manager__c        Lookup(User)

   [Record-Triggered Flow]  New Hire created ──► creates the five tasks above
```

---

## Deploy

Requires the [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) (`sf`).

```powershell
# 1. Authenticate with your org
sf org login web --alias onboarding-org

# 2. Deploy everything (objects, flow, Apex) and run the tests
sf project deploy start --source-dir force-app --target-org onboarding-org --test-level RunLocalTests

# 3. Grant yourself access
sf org assign permset --name Onboarding_Hub_User --target-org onboarding-org
```

The flow deploys **Active** (its `<status>` is Active), so no manual activation is needed — unlike an approval process.

---

## Use it

1. App Launcher → **Onboarding Tracker** (custom tab) — or drop the *Onboarding Tracker* component on any Lightning App/Home page.
2. Click **New hire**, fill in the details, and **Create hire**.
3. The Record-Triggered Flow fires immediately and builds the five-item checklist — open the hire to see it, already populated.
4. **Mark complete** on tasks; the progress ring and status update as the roll-up trigger recalculates (In Progress at partial, Completed at 100%).

You can edit the checklist template by opening the flow in **Setup → Flows → New Hire Onboarding Tasks** and adding/removing Create Records elements — no code change required.

---

## Testing

```powershell
sf apex run test --target-org onboarding-org --test-level RunLocalTests --result-format human --code-coverage
```

`OnboardingRollupServiceTest` covers 0% / partial / 100% and task deletion (each test clears any flow-generated tasks first, so it's deterministic whether or not the flow is active). `OnboardingControllerTest` covers hire creation and task status updates.

## Project layout

```
force-app/main/default/
├── objects/
│   ├── New_Hire__c/          (object + 7 fields)
│   └── Onboarding_Task__c/   (object + 5 fields)
├── flows/       New_Hire_Onboarding_Tasks   (Record-Triggered)
├── triggers/    OnboardingTaskTrigger
├── classes/     OnboardingRollupService · OnboardingController (+ tests)
├── lwc/         onboardingTracker  (html · js · css · meta)
├── tabs/        Onboarding_Tracker
└── permissionsets/  Onboarding_Hub_User
```

## Notes

- Metadata-only project — deploy it to a Salesforce org (a free [Developer Edition](https://developer.salesforce.com/signup) works). It can't be "run" locally like a Node app.
- Because the flow runs on New Hire creation, it also runs during Apex tests; the roll-up tests account for that by clearing flow-created tasks before asserting.
