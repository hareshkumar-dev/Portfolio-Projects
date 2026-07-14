# Salesforce Configuration

HireFlow uses two **custom objects** — `Job__c` and its master-detail child `Application__c` — plus an **Apex trigger** that enforces hiring rules. The metadata is included as deployable source.

> **Apex requires the CLI or Developer Console.** Unlike custom objects, an Apex trigger and its classes cannot be created through Setup point-and-click. Use Option A, or paste the classes in the Developer Console (Option B).

## Option A — Deploy with the Salesforce CLI (recommended)

Requires the [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) (`sf`).

```powershell
# 1. Authenticate the CLI with your org (opens a browser)
sf org login web --alias hireflow-org

# 2. Deploy objects + Apex + permission set, running the Apex tests
sf project deploy start --source-dir force-app --target-org hireflow-org --test-level RunLocalTests

# 3. Grant yourself access to the new objects
sf org assign permset --name HireFlow_Admin --target-org hireflow-org
```

## Option B — Manual (objects in Setup, Apex in Developer Console)

### 1. Custom objects (Setup → Object Manager → Create → Custom Object)

**Job** (`Job__c`) — Record Name **Job Title** (Text). Fields:

| Field label | Type | API name |
|---|---|---|
| Department | Text (255) | `Department__c` |
| Location | Text (255) | `Location__c` |
| Openings | Number (4, 0) | `Openings__c` |
| Status | Picklist: Open (default), On Hold, Closed | `Status__c` |
| Description | Long Text Area | `Description__c` |

**Application** (`Application__c`) — Record Name **Application #** (Auto Number, `APP-{0000}`). Fields:

| Field label | Type | API name |
|---|---|---|
| Job | **Master-Detail → Job** | `Job__c` |
| Candidate Name | Text (255), required | `Candidate_Name__c` |
| Email | Email, required | `Email__c` |
| Phone | Phone | `Phone__c` |
| Stage | Picklist: Applied (default), Screening, Interview, Offer, Hired, Rejected | `Stage__c` |
| Stage Changed Date | Date | `Stage_Changed_Date__c` |
| Cover Note | Long Text Area | `Cover_Note__c` |

### 2. Apex (Developer Console → File → New → Apex Class / Apex Trigger)

Paste the bodies from `force-app/main/default/`:

- `classes/ApplicationTriggerHandler.cls` — the hiring rules
- `classes/ApplicationTriggerHandlerTest.cls` — the tests
- `triggers/ApplicationTrigger.trigger` — on `Application__c` (before insert, before update)

## What the trigger does

`ApplicationTriggerHandler`:

1. **Date stamping** — sets `Stage_Changed_Date__c = TODAY` whenever `Stage__c` changes (or on insert).
2. **Openings enforcement** — before an application is saved as `Hired`, it counts existing hires for the job and compares to `Openings__c`; if the role is full, it calls `addError()` and the save is rejected. The logic is bulk-safe (fixed number of SOQL queries for any batch size).

## Verification

- Post a job with **Openings = 1**, then submit two applications from the careers page.
- Move the first applicant to **Hired** → succeeds; `Stage Changed Date` is set on the record.
- Move the second to **Hired** → rejected with *"Cannot hire: … has only 1 opening(s), which are already filled."*
- Run the tests: `sf apex run test --tests ApplicationTriggerHandlerTest --target-org hireflow-org --result-format human`.
