# Salesforce + React — Portfolio (22 Apps)

A collection of 22 apps I built on the **Salesforce Platform** — from Lightning Web Components &
Apex inside the org, to full-stack **React + Node** integrations over the Salesforce API, to
flagship systems combining AI (Gemini), real-time Change Data Capture, custom REST APIs, and
recurring billing engines. Every app runs on live Salesforce data with production-quality UI.

**Live portfolio:** https://hareshkumar-dev.github.io/Portfolio-Projects/ · **Demos:** every project below links to a video walkthrough.

🏅 **Salesforce Certified** — Platform Developer I · Associate · [Trailblazer profile](https://www.salesforce.com/trailblazer/hareshprajapati44)

> **Stack across the repo:** LWC · Apex (triggers, batch, schedulers, Platform Events, state machines) ·
> custom objects · React (Vite) · Node/Express · jsforce · OAuth 2.0 (PKCE) · SOQL

---

## 🚀 Flagship — AI, real-time, and integration systems
The most complex builds in this repo — each pushes past a single pattern into a real, multi-part system.

| # | Project | What it does | Demo |
|---|---------|--------------|------|
| 21 | **[BillingHub](BillingHub/)** | Subscription billing + RevOps: batch invoicing, dunning-to-suspension, AI churn analysis, live CDC dashboard, approval-gated refunds | [▶](https://youtu.be/j1yAtB5J2ik) |
| 22 | **[QuoteEngine](QuoteEngine/)** | CPQ-lite quote builder — bundle pricing, volume discount tiers, approval gate, real downloadable PDF | [▶](https://youtu.be/azfDTfFNKp8) |
| 20 | **[IntegrationHub](IntegrationHub/)** | Externally-callable REST API for order intake with database-level idempotency + live monitoring console | [▶](https://youtu.be/84Wr9SD3XR0) |
| 19 | **[OpsPulse](OpsPulse/)** | Real-time case ops board — Change Data Capture pushes updates to every open dashboard instantly | [▶](https://youtu.be/GU31cxDjeiY) |
| 18 | **[CaseCopilot](CaseCopilot/)** | AI case assistant (Google Gemini) — live summarize / draft reply / suggest next action on a Case | [▶](https://youtu.be/0o-2QXtOZJc) |

## 🌐 Full-Stack — Salesforce + React + Node
React front ends talking to Salesforce through a Node/Express API (jsforce), with OAuth 2.0 (PKCE) login.

| # | Project | What it does | Demo |
|---|---------|--------------|------|
| 08 | **[PipelinePro](PipelinePro/)** | Sales-pipeline CRM with a live pipeline-by-stage dashboard & lead conversion | [▶](https://youtu.be/0L7V5gsDOWQ) |
| 12 | **[EstateHub](EstateHub/)** | Property marketplace with server-side search filters & inquiry→Lead capture | [▶](https://youtu.be/O6DX50CsFI8) |
| 11 | **[HireFlow](HireFlow/)** | Applicant tracking system with a recruiter kanban & auto-closing roles | [▶](https://youtu.be/wE-qk_VZ2r0) |
| 10 | **[ShopTrack](ShopTrack/)** | E-commerce storefront + fulfillment console on standard SF Orders/Products | [▶](https://youtu.be/krg-eNJN6o4) |
| 09 | **[Eventify](Eventify/)** | Event registration with live seat availability + organizer console | [▶](https://youtu.be/5acgQzWXq8A) |
| 06 | **[ServiceDesk](ServiceDesk/)** | Support portal; OAuth login; tickets read/write straight to Cases | [▶](https://youtu.be/c6_8GpB686g) |

## ⚡ Lightning Web Components + Apex (in-org)
| # | Project | What it does | Demo |
|---|---------|--------------|------|
| 04 | **[ClaimFlow](ClaimFlow/)** | Insurance claims lifecycle engine — config-driven state machine + audit trail | [▶](https://youtu.be/VU38bwMwzX4) |
| 03 | **[ServiceSLA](ServiceSLA/)** | SLA command center with live timers & automatic breach escalation | [▶](https://youtu.be/4UEFqcJaazQ) |
| 01 | **[DispatchFlow](DispatchFlow/)** | Field-service dispatch — best-fit technician auto-matching (scoring engine) | [▶](https://youtu.be/_jfx6uZi_zU) |
| 02 | **[LoanFlow](LoanFlow/)** | Loan origination with automated risk scoring & auto-decisioning | [▶](https://youtu.be/cSrA7TNs2D8) |
| 05 | **[RenewFlow](RenewFlow/)** | Subscription revenue & renewals dashboard (MRR/ARR, churn) | [▶](https://youtu.be/p0z3XBGUbN8) |
| 16 | **[EventRelay](EventRelay/)** | Event-sourced order audit history via Platform Events (pub/sub) | [▶](https://youtu.be/Y6U0b2wRAlk) |
| 15 | **[OnboardingHub](OnboardingHub/)** | New-hire checklists with automatic progress (record-triggered flow) | [▶](https://youtu.be/Msbqaj4Jbcc) |
| 14 | **[AssetTracker](AssetTracker/)** | Inventory dashboard with automatic reorder-point detection | [▶](https://youtu.be/pNPTth9Zfxs) |
| 13 | **[ExpenseManager](ExpenseManager/)** | Expense reports with itemized lines & roll-up totals | [▶](https://youtu.be/9zTwGS_E7iQ) |

## 🔀 React embedded in Lightning
React bundles mounted inside a Lightning page via a light-DOM bridge to Apex.

| # | Project | What it does | Demo |
|---|---------|--------------|------|
| 07 | **[ProjectBoard](ProjectBoard/)** | Drag-and-drop project kanban inside a Lightning page | [▶](https://youtu.be/6F_RijDx6nA) |
| 17 | **[MeetSlot](MeetSlot/)** | Team-scheduling calendar embedded in Lightning | [▶](https://youtu.be/w8g1pQIpkQ0) |

---

## Repository layout
```
<each project>/          # self-contained app (see its own README where present)
   ├─ force-app/ …       # Salesforce metadata (LWC / Apex / objects), or
   ├─ salesforce/ …      # for full-stack apps
   ├─ client/  server/   # React + Node tiers (full-stack apps)
   └─ docs/screenshot.png
docs/                    # the static portfolio website (served by GitHub Pages)
```

## Running an app locally
Each project is independent. In general:

```bash
# Salesforce-only (LWC/Apex):
sf org create scratch -f config/project-scratch-def.json -a myscratch
sf project deploy start -o myscratch && sf org open -o myscratch

# Full-stack:
cd <project>/server && cp .env.example .env && npm install && npm start
cd <project>/client && npm install && npm run dev
```

> Secrets live in `.env` files, which are git-ignored. Copy `.env.example` and fill in your own
> Salesforce Connected App consumer key.

---

*Built by Haresh Prajapati — Salesforce Developer. Open to freelance & contract work.*
