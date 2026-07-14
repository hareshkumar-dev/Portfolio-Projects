# Salesforce Configuration

ServiceDesk stores tickets as standard **Case** records, so no custom objects or fields are required. The steps below cover org access and API authentication.

## 1. Org access

Any Salesforce org with API access works. For evaluation, a free [Developer Edition org](https://developer.salesforce.com/signup) is sufficient — sign up, verify your email, and log in at `https://login.salesforce.com`.

For sandbox orgs, set `SF_LOGIN_URL=https://test.salesforce.com` in `server/.env`.

## 2. Security token

API logins from outside your org's trusted IP ranges require a **security token** appended to the password. The API layer handles the concatenation; users simply supply the token on the login screen.

To obtain it: **Avatar → Settings → Reset My Security Token → Reset Security Token**. The token is delivered by email.

> Alternatively, add your server's IP address under **Setup → Network Access → Trusted IP Ranges**, in which case no token is needed.

## 3. Verification

After signing in to the portal and creating a ticket, the record appears in Salesforce under **App Launcher → Service → Cases**. Status and priority changes are bidirectional — updates made in either interface are reflected in the other.

---

## Custom Apex REST service

The portal's API layer uses Salesforce's standard REST API for CRUD operations. For business logic that must execute on-platform, this package also includes a custom Apex REST service:

[`TicketManager.cls`](force-app/main/default/classes/TicketManager.cls)

```
GET   /services/apexrest/tickets     List the 50 most recent tickets
POST  /services/apexrest/tickets     Create a ticket (applies escalation rules)
```

The `POST` handler enforces a server-side rule: any ticket whose description contains "urgent" is automatically escalated to High priority — guaranteeing the rule regardless of which client created the record.

### Deployment

- **Salesforce CLI:** `sf project deploy start --source-dir force-app` (from this directory)
- **Developer Console:** Gear icon → Developer Console → File → New → Apex Class → paste the class body

### Standard REST API vs. custom Apex REST

| | Standard REST API | Custom Apex REST |
|---|---|---|
| Org changes required | None | Deploy Apex class |
| Best suited for | Straightforward CRUD | Validation, cross-object logic, platform-enforced rules |
| Used by ServiceDesk | ✅ Primary integration path | Included for platform-side business rules |
