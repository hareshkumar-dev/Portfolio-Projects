# ServiceDesk — Customer Support Portal

A full-stack customer support ticketing application built with **React** and **Salesforce Service Cloud**, connected through a secure **Node.js REST API** layer.

Support agents authenticate with their Salesforce credentials and manage the complete ticket lifecycle — creation, triage, status updates, and resolution — from a modern web interface, while all data lives natively in Salesforce as standard **Case** records.

---

## Architecture

```
┌─────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│    FRONTEND     │        │    API LAYER     │        │     BACKEND      │
│    React SPA    │  HTTPS │  Node / Express  │  REST  │    Salesforce    │
│                 │ ─────► │                  │ ─────► │  Service Cloud   │
│  Auth screens   │  JSON  │  Session mgmt    │  API   │                  │
│  Ticket console │ ◄───── │  Salesforce      │ ◄───── │  Case object     │
│  CRUD workflows │        │  integration     │        │  SOQL / DML      │
│                 │        │  (jsforce)       │        │                  │
│    :3000        │        │      :5000       │        │  *.salesforce.com│
└─────────────────┘        └──────────────────┘        └──────────────────┘
```

The frontend is fully decoupled from Salesforce — it consumes only the internal REST API. All Salesforce credentials, access tokens, and API communication are confined to the server tier, following standard enterprise integration practice:

- **Security** — tokens never reach the browser; the client holds only an opaque session ID.
- **Abstraction** — the UI is backend-agnostic; the CRM could be replaced without touching the frontend.
- **No CORS exposure** — the browser communicates exclusively with the application's own API.

## Tech Stack

| Tier | Technology |
|---|---|
| Frontend | React 18, Vite |
| API layer | Node.js, Express, jsforce |
| Backend / CRM | Salesforce (Service Cloud, Case object), Apex REST |
| Auth | Salesforce credential-based session auth (OAuth 2.0-ready) |

## Repository Structure

| Path | Description |
|---|---|
| [client/](client/) | React single-page application (login, ticket console, forms) |
| [server/](server/) | Express REST API — authentication, session management, Salesforce integration |
| [salesforce/](salesforce/) | Salesforce configuration guide and custom Apex REST service |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Salesforce org (a free [Developer Edition](https://developer.salesforce.com/signup) works) and your API **security token** — see [salesforce/README.md](salesforce/README.md)

### 1. Run the API server

```powershell
cd server
copy .env.example .env
npm install
npm run dev
```

The API starts on `http://localhost:5000`.

### 2. Run the frontend

```powershell
cd client
npm install
npm run dev
```

The app is served at `http://localhost:3000` (API requests are proxied to port 5000 in development).

### 3. Sign in

Authenticate with your Salesforce username, password, and security token. All tickets created in the portal are immediately visible in Salesforce under **Service → Cases**, and vice versa.

---

## API Reference

All ticket endpoints require an `Authorization: Bearer <sessionId>` header obtained from the login endpoint.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate against Salesforce; returns a session ID and user profile |
| `POST` | `/api/auth/logout` | Invalidate the current session |
| `GET` | `/api/tickets` | List tickets (Salesforce Cases, newest first) |
| `POST` | `/api/tickets` | Create a ticket |
| `PATCH` | `/api/tickets/:id` | Update subject, description, priority, or status |
| `DELETE` | `/api/tickets/:id` | Delete a ticket |
| `GET` | `/api/health` | Service health check |

### Request flow

```
Client                     API layer                        Salesforce
  │  POST /api/tickets        │                                 │
  │ ─────────────────────────►│  resolve session → connection   │
  │                           │ ───────────────────────────────►│  INSERT Case
  │                           │ ◄───────────────────────────────│  record Id
  │ ◄─────────────────────────│  201 { id, success }            │
```

| Portal action | API call | Salesforce operation |
|---|---|---|
| View ticket queue | `GET /api/tickets` | SOQL `SELECT` on Case |
| Raise ticket | `POST /api/tickets` | `INSERT` Case |
| Update / change status | `PATCH /api/tickets/:id` | `UPDATE` Case |
| Remove ticket | `DELETE /api/tickets/:id` | `DELETE` Case |

---

## Salesforce Integration

- Tickets are standard **Case** records — the same object used by Salesforce Service Cloud — so the portal interoperates cleanly with native Salesforce consoles, assignment rules, and reporting.
- The API layer uses [jsforce](https://jsforce.github.io/) for authentication, SOQL queries, and DML operations against the Salesforce REST API.
- A custom **Apex REST service** ([TicketManager.cls](salesforce/force-app/main/default/classes/TicketManager.cls)) is included, exposing `/services/apexrest/tickets` with server-side business rules (automatic priority escalation) for use cases that require logic to run inside the platform.

## Security Notes

- Salesforce access tokens are held in server-side session state only; the browser receives an opaque, randomly generated session ID.
- Sessions are stored in memory for simplicity — for production deployment, substitute a shared store (e.g. Redis) and enable HTTPS end-to-end.
- The current credential-based login can be upgraded to an **OAuth 2.0 Connected App** (Authorization Code + PKCE or JWT Bearer flow) without changes to the frontend, as the auth contract is confined to `/api/auth/*`.

## Roadmap

- OAuth 2.0 Connected App authentication (JWT Bearer flow)
- Case comments and attachment support
- Server-side pagination and search
- Role-based views (agent vs. customer portal)
