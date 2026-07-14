# Salesforce Configuration

ShopTrack runs on Salesforce's standard commerce objects — `Product2`, `PricebookEntry`, `Order`, and `OrderItem` — plus **two custom fields** on the `Order` object for storefront fulfillment tracking. Only the custom fields need to be deployed; the standard objects already exist in every org.

## Option A — Deploy with the Salesforce CLI (recommended)

Requires the [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) (`sf`).

```powershell
# 1. Authenticate the CLI with your org (opens a browser)
sf org login web --alias shoptrack-org

# 2. Deploy the custom fields + permission set (run from this folder)
sf project deploy start --source-dir force-app --target-org shoptrack-org

# 3. Grant yourself access to the new fields
sf org assign permset --name ShopTrack_Admin --target-org shoptrack-org
```

## Option B — Create the fields manually (no CLI)

In **Setup → Object Manager → Order → Fields & Relationships → New**:

| Field label | Type | Values / notes |
|---|---|---|
| Fulfillment Status | Picklist | Values: `Placed` (default), `Packed`, `Shipped`, `Delivered`, `Cancelled` |
| Customer Name | Text (255) | — |
| Customer Email | Email | Mark as External ID |

Grant your profile edit access to all three fields on the field-security step.

## About the standard Price Book

Orders and their items must reference a **Price Book**. ShopTrack uses the org's **standard** Price Book and **activates it automatically** on first use — no manual step needed. When you seed the catalog, each product gets a `PricebookEntry` on that standard Price Book, which is what makes it sellable.

## Seeding a demo catalog

You don't need to create products by hand. In the app: sign in as an operator and click **Seed sample catalog**. This creates eight `Product2` records, each with a standard `PricebookEntry`, if the catalog is empty. (Creating a sellable product is itself a two-object operation — Product2 plus PricebookEntry — which the seeder encapsulates.)

## Verification

- Seed the catalog, then place an order from the storefront.
- **App Launcher → Orders** shows the order; open it to see the **Order Products** (OrderItems) related list and the `Fulfillment Status` field.
- Advance the status in the operator console → the `Fulfillment_Status__c` value updates on the Salesforce record.
- All web orders are attached to the auto-created **ShopTrack Online Store** account (App Launcher → Accounts).
