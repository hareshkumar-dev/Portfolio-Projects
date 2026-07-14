# Salesforce Configuration

EstateHub uses one **custom object** — `Property__c` — for listings, and adds **one custom field to the standard `Lead` object** (`Property_Interest__c`) so an inquiry records which listing it came from. Inquiries themselves are standard Leads. The metadata is included as deployable source.

## Option A — Deploy with the Salesforce CLI (recommended)

Requires the [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) (`sf`).

```powershell
# 1. Authenticate the CLI with your org (opens a browser)
sf org login web --alias estatehub-org

# 2. Deploy the object + Lead field + permission set (run from this folder)
sf project deploy start --source-dir force-app --target-org estatehub-org

# 3. Grant yourself access
sf org assign permset --name EstateHub_Admin --target-org estatehub-org
```

## Option B — Create manually (no CLI)

### 1. Property object (Setup → Object Manager → Create → Custom Object)

Label **Property** / Plural **Properties** → `Property__c`. Record Name **Property Title** (Text). Fields:

| Field label | Type | API name |
|---|---|---|
| City | Text (120) | `City__c` |
| Address | Text (255) | `Address__c` |
| Price | Currency (14, 0) | `Price__c` |
| Bedrooms | Number (2, 0) | `Bedrooms__c` |
| Bathrooms | Number (2, 0) | `Bathrooms__c` |
| Area (sq ft) | Number (9, 0) | `Area_SqFt__c` |
| Property Type | Picklist: Apartment (default), Villa, Independent House, Plot | `Property_Type__c` |
| Listing Status | Picklist: Available (default), Under Offer, Sold | `Listing_Status__c` |
| Image URL | URL | `Image_URL__c` |
| Featured | Checkbox | `Featured__c` |
| Description | Long Text Area | `Description__c` |

### 2. Lead field (Setup → Object Manager → Lead → Fields & Relationships → New)

| Field label | Type | API name |
|---|---|---|
| Property Interest | Text (255) | `Property_Interest__c` |

Grant your profile edit access to all fields on the field-security step.

## How inquiries map to Salesforce

Submitting the inquiry form creates a **standard Lead**:

- `LeadSource = 'Web'`, `Property_Interest__c` = the listing's title and city
- Buyer name split into First/Last; `Company` set to "<name> (Individual Buyer)" because Salesforce requires a Company on every Lead
- The message goes into the Lead `Description`

Agents then work these leads with the org's normal Lead tools (queues, assignment rules, conversion) — the same pattern the PipelinePro project builds on.

## Verification

- Add a listing in the agent console → **App Launcher → Properties** shows the record.
- Use the public filter bar (city/price/beds/type) → results reflect the SOQL query.
- Send an inquiry → **App Launcher → Leads** shows a new Web lead with **Property Interest** populated, and it appears in the console's **Inquiries** tab.
