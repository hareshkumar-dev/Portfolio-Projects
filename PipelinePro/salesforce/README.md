# Salesforce Configuration

PipelinePro is built entirely on standard **Sales Cloud** objects — Lead, Opportunity, Account, and Contact — so no custom objects, fields, or code need to be deployed to the org.

## 1. Org access

Any Salesforce org with API access works. For evaluation, a free [Developer Edition org](https://developer.salesforce.com/signup) is sufficient — sign up, verify your email, and log in at `https://login.salesforce.com`.

For sandbox orgs, set `SF_LOGIN_URL=https://test.salesforce.com` in `server/.env`.

## 2. Security token

API logins from outside your org's trusted IP ranges require a **security token** appended to the password. The API layer handles the concatenation; users simply supply the token on the login screen.

To obtain it: **Avatar → Settings → Reset My Security Token → Reset Security Token**. The token is delivered by email.

> Alternatively, add your server's IP address under **Setup → Network Access → Trusted IP Ranges**, in which case no token is needed.

## 3. Objects used

| Object | Role in PipelinePro |
|---|---|
| `Lead` | Captured from the web form; qualified via Status; converted from the Leads console |
| `Opportunity` | The deals on the Kanban board; `StageName` drives the columns |
| `Account` / `Contact` | Created automatically on lead conversion |

### Opportunity stages

The board's columns map to the default Opportunity stage picklist (Prospecting, Qualification, Proposal/Price Quote, Negotiation/Review, Closed Won, Closed Lost). If your org uses custom stages, deals in those stages appear as additional columns automatically; to align the primary columns, edit `STAGES` in `client/src/components/PipelineBoard.jsx`.

### Lead conversion

The **Convert** action calls the Salesforce SOAP API's `convertLead` operation with the org's converted-status value (queried from `LeadStatus`). This is the same transaction the native Convert button performs: it creates an Account and Contact from the lead and opens a new Opportunity, which then appears on the Pipeline board.

## 4. Verification

- Create a deal in PipelinePro → **App Launcher → Sales → Opportunities** shows the record.
- Drag the deal to another column → the record's Stage updates in Salesforce.
- Convert a lead → the new Account, Contact, and Opportunity are visible in Salesforce, and the deal appears on the board.
