# Salesforce Configuration

Eventify uses two **custom objects** — `Event__c` and its master-detail child `Registration__c` — plus a permission set granting access to them. The metadata is included in this folder as deployable source; deploy it once before running the app.

## Option A — Deploy with the Salesforce CLI (recommended)

Requires the [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) (`sf`).

```powershell
# 1. Authenticate the CLI with your org (opens a browser)
sf org login web --alias eventify-org

# 2. Deploy the objects + permission set (run from this folder)
sf project deploy start --source-dir force-app --target-org eventify-org

# 3. Grant yourself access to the new objects
sf org assign permset --name Eventify_Admin --target-org eventify-org
```

## Option B — Create the objects manually (no CLI)

In **Setup → Object Manager → Create → Custom Object**:

### 1. Event object

- Label **Event** / Plural **Events** → API name becomes `Event__c`
- Record Name: `Event Name`, type **Text**

Then add fields (Object Manager → Event → Fields & Relationships → New):

| Field label | Type | Notes |
|---|---|---|
| Event Date | Date | API name `Event_Date__c` |
| Location | Text (255) | `Location__c` |
| Capacity | Number (18, 0) | `Capacity__c` |
| Description | Long Text Area | `Description__c` |

### 2. Registration object

- Label **Registration** / Plural **Registrations** → `Registration__c`
- Record Name: `Registration #`, type **Auto Number**, format `REG-{0000}`

Fields:

| Field label | Type | Notes |
|---|---|---|
| Event | **Master-Detail → Event** | `Event__c`; related list name **Registrations** |
| Attendee Name | Text (255), required | `Attendee_Name__c` |
| Email | Email, required | `Email__c` |
| Checked In | Checkbox, default unchecked | `Checked_In__c` |

> When creating fields manually, grant field visibility to your profile on the
> field-security step of the wizard — then no permission set is needed.

## 3. Integration user (public site)

The public page (event list + registrations) is served through a server-held Salesforce connection. Set its credentials in `server/.env`:

```
SF_USERNAME=you@yourorg.com
SF_PASSWORD=...
SF_TOKEN=...        # Settings → Reset My Security Token
```

In a Developer org your own credentials are fine. In production, use a dedicated least-privilege integration user whose access comes from the `Eventify_Admin` permission set (or a read/create-only variant).

## 4. Verification

- Create an event in the Eventify admin console → **App Launcher → Events** shows the record.
- Register from the public page → the registration appears in the event's **Registrations** related list.
- Delete an event → its registrations are cascade-deleted (master-detail behavior).
