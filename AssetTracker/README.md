# Asset Tracker — Salesforce-Native Inventory App

A **100% Salesforce** inventory application — no external frontend or server. It showcases **asynchronous Apex**: a Batchable job that scans every stock item and classifies it against its reorder point, a Schedulable that runs the job nightly, and a Lightning Web Component dashboard to view stock health and trigger a scan on demand.

---

## What it demonstrates (asynchronous + native Salesforce)

| Capability | Where |
|---|---|
| **Batch Apex** (`Database.Batchable`, `Stateful`) | `StockLevelBatch` — scans all stock items in chunks, classifies each, emails a reorder summary |
| **Scheduled Apex** (`Schedulable`) | `StockLevelScheduler` — runs the batch nightly |
| **Apex controller for LWC** | `StockController` — summary counts, reorder list, on-demand scan, demo seeder |
| **Lightning Web Component** | `stockDashboard` — KPI tiles + reorder table + action buttons |
| **Custom object + validation rules** | `Stock_Item__c`; quantity and reorder point cannot be negative |
| **Apex tests** | `StockLevelBatchTest` (batch + scheduler), `StockControllerTest` |
| **Permission set + custom tab** | `Asset Tracker User`, `Stock Dashboard` |

## The classification logic

The batch sets each item's status from its live numbers:

```
quantity <= 0                    → Out of Stock   (Needs Reorder ✓)
quantity <= reorder point        → Low Stock      (Needs Reorder ✓)
quantity  >  reorder point       → In Stock
```

It also stamps `Last_Checked__c` and, on completion, emails a reorder summary to whoever ran the job.

## Data model

```
Stock_Item__c
├── Name                Product name
├── SKU__c              Unique external id
├── Category__c         Electronics / Furniture / Stationery / Consumables / Other
├── Quantity_On_Hand__c Number
├── Reorder_Point__c    Number
├── Unit_Cost__c        Currency
├── Stock_Status__c     In Stock / Low Stock / Out of Stock   ◄── set by the batch
├── Needs_Reorder__c    Checkbox                              ◄── set by the batch
└── Last_Checked__c     DateTime                              ◄── set by the batch
```

---

## Deploy

Requires the [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) (`sf`).

```powershell
# 1. Authenticate with your org
sf org login web --alias asset-org

# 2. Deploy everything and run the Apex tests
sf project deploy start --source-dir force-app --target-org asset-org --test-level RunLocalTests

# 3. Grant yourself access
sf org assign permset --name Asset_Tracker_User --target-org asset-org
```

### Schedule the nightly scan

Run once in **Setup → Developer Console → Debug → Open Execute Anonymous Window**:

```apex
System.schedule('Nightly Stock Scan', '0 0 2 * * ?', new StockLevelScheduler());
```

That runs the batch every day at 02:00. (You can manage or cancel it under **Setup → Scheduled Jobs**.)

---

## Use it

1. App Launcher → **Stock Dashboard** (custom tab) — or drop the *Stock Dashboard* component on any Lightning App/Home page.
2. Click **Seed sample data** to create eight demo items (some deliberately low or out of stock).
3. Click **Run scan now** — this kicks off `StockLevelBatch` immediately. Because batch Apex is asynchronous, it runs in the background.
4. Wait a moment, click **Refresh** — the tiles (In / Low / Out) and the reorder table update from the scan.
5. Edit an item's quantity, scan again, and watch its status move between In Stock / Low Stock / Out of Stock.

---

## How the async pieces fit together

- **`StockLevelBatch`** implements `Database.Batchable<SObject>` so it processes the whole catalog in 200-record chunks, staying within governor limits at any scale. It's also `Database.Stateful` so the low/out counts and the reorder list accumulate across chunks for the `finish()` summary email.
- **`StockLevelScheduler`** implements `Schedulable`; scheduling it with a cron expression runs the batch on a recurring basis without any human involvement.
- **`StockController.runScanNow()`** calls `Database.executeBatch(...)` so the dashboard can trigger the same job on demand — useful for a demo, since you don't want to wait until 2 AM.

## Testing

```powershell
sf apex run test --target-org asset-org --test-level RunLocalTests --result-format human --code-coverage
```

`StockLevelBatchTest` runs the batch over seeded data and asserts each item's status (including the boundary case where quantity equals the reorder point), verifies the reorder flags and timestamps, and confirms the scheduler registers a cron job. `StockControllerTest` covers the dashboard controller.

## Project layout

```
force-app/main/default/
├── objects/Stock_Item__c/   (object + 8 fields + 2 validation rules)
├── classes/    StockLevelBatch · StockLevelScheduler · StockController (+ tests)
├── lwc/        stockDashboard  (html · js · css · meta)
├── tabs/       Stock_Dashboard
└── permissionsets/  Asset_Tracker_User
```

## Notes

- Metadata-only project — deploy it to a Salesforce org (a free [Developer Edition](https://developer.salesforce.com/signup) works). It can't be "run" locally like a Node app.
- The reorder summary email requires org email deliverability to be enabled (**Setup → Deliverability → Access to Send Email → All email**). If it's off, the batch still runs and classifies items; only the email is skipped.
