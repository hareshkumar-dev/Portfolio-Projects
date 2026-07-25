# Portfolio Media

Screenshots and recordings for each project, numbered in **showcase order (best first)**.
Drop images in each project's `screenshots/` folder and video in `recording/`.

## Suggested file names
- Screenshots: `01-hero.png`, `02-technicians.png`, `03-workorders.png`, `04-modal.png`
- Recording: `demo.mp4`

---

## Tier 0 — Flagship capstones (most complex, live-verified — lead with these)

| # | Project | Console | Signature element to capture | Status |
|---|---------|---------|------------------------------|--------|
| 18 | **CaseCopilot** | Case Copilot (on Case page) | Click Summarize/Draft Reply/Suggest Action → real AI response appears; history panel fills in | ✅ deployed + live AI verified |
| 19 | **OpsPulse** | Ops Pulse | Two browser tabs side by side — edit a Case in one, watch it update instantly in the other with no refresh | ✅ deployed |
| 20 | **IntegrationHub** | Integration Hub Console | Send a POST via Postman/curl → watch the KPI tiles and log table update live with the result | ✅ deployed + live REST calls verified |
| 21 | **BillingHub** | RevOps Console | MRR tile, live invoice board, a refund approval action, and the AI churn-risk panel on a canceled subscription | ✅ deployed + live dunning lifecycle verified |
| 22 | **QuoteEngine** | Quote Engine Console | Add a bundle + product to a quote, watch subtotal/discount/total compute live, then click "View PDF" for the real document | ✅ deployed + live quote verified |

## Tier 1 — Lead with these (enterprise solution architecture)

| # | Project | Console | Signature element to capture | Status |
|---|---------|---------|------------------------------|--------|
| 01 | **DispatchFlow** | Dispatch Console | Technician capacity bars + work-order match scores; live Rebalance | ✅ deployed |
| 02 | **LoanFlow** | Loan Origination Console | Risk-score meters + decision badges; live Submit + Audit trail | ✅ deployed |
| 03 | **ServiceSLA** | SLA Command Center | Breach banner + time-to-breach rows | ✅ deployed |
| 04 | **ClaimFlow** | Claims Command Center | Claim state machine | ⏳ deploy pending |
| 05 | **RenewFlow** | Revenue Renewals | Scheduled renewals + roll-ups | ⏳ deploy pending |

## Tier 2 — Integration / architecture flex

| # | Project | What it shows | Status |
|---|---------|---------------|--------|
| 06 | **ServiceDesk** | Full-stack React + Node + Salesforce API (login → CRUD) | full-stack (run locally) |
| 07 | **ProjectBoard** | React bundled *inside* Salesforce (static resource + LWC host) | ⏳ deploy pending |

## Tier 3 — Supporting depth

| # | Project | Type |
|---|---------|------|
| 08 | PipelinePro | Full-stack (standard objects, lead conversion) |
| 09 | Eventify | Full-stack |
| 10 | ShopTrack | Full-stack |
| 11 | HireFlow | Full-stack |
| 12 | EstateHub | Full-stack |
| 13 | ExpenseManager | Salesforce-only |
| 14 | AssetTracker | Salesforce-only |
| 15 | OnboardingHub | Salesforce-only |
| 16 | EventRelay | Salesforce-only |
| 17 | MeetSlot | React-in-Salesforce |

---

## General capture recipe (per Salesforce-UI project)
1. **Prep**: refresh tab · F11 full-screen · Ctrl+− to fit · collapse the left nav.
2. **Screenshots**: hero (whole console) → close-ups of the signature element → any modal.
3. **Video (~45s)**: rest on the board → narrate the engine → trigger the live moment → hold on the result.
