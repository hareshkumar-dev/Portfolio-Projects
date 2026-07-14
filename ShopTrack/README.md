# ShopTrack — Store & Order Tracking

A full-stack e-commerce application built with **React** and **Salesforce**, connected through a **Node.js REST API** layer.

Shoppers browse a product catalog, add items to a cart, and check out — with no account required — then track their orders through fulfillment (Placed → Packed → Shipped → Delivered). Store operators sign in to a console to manage and advance every order. All commerce data lives in Salesforce using the standard **Product2 / PricebookEntry / Order / OrderItem** model.

---

## Why this project is interesting

Placing an order is a **multi-object transaction**: a single `Order` header plus one `OrderItem` per cart line, created together and rolled back as a unit if any line fails. Prices are re-read from Salesforce at checkout so the client can never set its own price. This is the commerce data model real Salesforce implementations use.

```
Product2 ──< PricebookEntry >── Pricebook2 (Standard)
                  │
                  ▼
   Account ──< Order ──< OrderItem
```

## Architecture

```
┌──────────────────┐        ┌───────────────────────┐        ┌──────────────────┐
│     FRONTEND     │        │       API LAYER       │        │     BACKEND      │
│    React SPA     │  HTTPS │    Node / Express     │  REST  │    Salesforce    │
│                  │ ─────► │                       │ ─────► │                  │
│  Storefront+cart │  JSON  │  /api/public/* ────── │ ─────► │  integration     │
│  Order tracking  │        │  (integration user)   │        │  user session    │
│  (no login)      │ ◄───── │                       │ ◄───── │                  │
│                  │        │  /api/admin/*  ────── │ ─────► │  per-operator    │
│  Operator console│        │  (session per admin)  │        │  session         │
│      :3003       │        │        :5003          │        │  Product2/Order… │
└──────────────────┘        └───────────────────────┘        └──────────────────┘
```

Two access tiers, one API:

- **Public tier** (`/api/public/*`) — catalog, checkout, and order lookup run under a dedicated **integration user**. Shoppers never authenticate. Order totals and line prices are computed server-side from live Salesforce data.
- **Admin tier** (`/api/admin/*`) — operators authenticate with their own Salesforce credentials to view all orders and advance fulfillment status.

## Tech Stack

| Tier | Technology |
|---|---|
| Frontend | React 18, Vite, localStorage cart |
| API layer | Node.js, Express, jsforce |
| Backend | Salesforce commerce objects — `Product2`, `PricebookEntry`, `Order`, `OrderItem`; two custom `Order` fields |
| Auth | Integration-user connection (public) + credential-based sessions (admin) |

## Repository Structure

| Path | Description |
|---|---|
| [client/](client/) | React SPA — storefront, cart/checkout, order tracking, operator console |
| [server/](server/) | Express REST API — catalog, multi-object checkout, order management, catalog seeder |
| [salesforce/](salesforce/) | Deployable custom-field metadata, permission set, setup guide |

---

## Getting Started

### 1. Deploy the Salesforce customizations (one-time)

Two custom fields on the standard `Order` object drive fulfillment tracking. Follow [salesforce/README.md](salesforce/README.md) — with the Salesforce CLI:

```powershell
cd salesforce
sf project deploy start --source-dir force-app --target-org <your-org>
sf org assign permset --name ShopTrack_Admin --target-org <your-org>
```

### 2. Run the API server

```powershell
cd server
copy .env.example .env    # then fill in SF_USERNAME / SF_PASSWORD / SF_TOKEN
npm install
npm run dev
```

The API starts on `http://localhost:5003`.

### 3. Run the frontend

```powershell
cd client
npm install
npm run dev
```

The app is served at `http://localhost:3003`.

### 4. Seed the catalog, then shop

1. Click **Operator sign in**, authenticate, and click **Seed sample catalog** (creates eight demo products with prices — a `Product2` + `PricebookEntry` per item).
2. Back on the storefront, add products to the cart and check out with any name/email.
3. Track the order from **Track Order** using that email.
4. As the operator, advance the order's status and watch the shopper's timeline update.
5. In Salesforce, open **App Launcher → Orders** to see the order with its OrderItems, and the storefront account it's attached to.

---

## API Reference

### Public (no authentication)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/public/catalog` | Active products (PricebookEntry × Product2) |
| `POST` | `/api/public/orders` | Place an order — creates Order + OrderItems in one transaction |
| `GET` | `/api/public/orders?email=` | A shopper's orders, looked up by checkout email |

### Admin (`Authorization: Bearer <sessionId>`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate against Salesforce |
| `POST` | `/api/auth/logout` | Invalidate the session |
| `GET` | `/api/admin/orders` | Every storefront order with line items |
| `PATCH` | `/api/admin/orders/:id` | Advance fulfillment status |
| `GET` | `/api/admin/products` | Catalog (management view) |
| `POST` | `/api/admin/seed-catalog` | Create sample products if the catalog is empty |

### Integration notes

- **Server-side pricing**: checkout re-queries `PricebookEntry.UnitPrice` for every cart line; the client only sends `pricebookEntryId` + `quantity`.
- **Transaction integrity**: if any `OrderItem` insert fails, the `Order` header is deleted so no empty order is left behind.
- **Standard price book**: resolved and activated automatically on first use (`Pricebook2 WHERE IsStandard = true`).
- **Storefront account**: all web orders attach to one find-or-created "ShopTrack Online Store" Account; shopper identity is stored on the Order's custom fields.
- **SOQL injection** is guarded by record-ID validation and string-literal escaping on all interpolated values.

## Custom Fields (deployed metadata)

| Field | Type | Purpose |
|---|---|---|
| `Order.Fulfillment_Status__c` | Picklist (Placed/Packed/Shipped/Delivered/Cancelled) | Storefront fulfillment stage, independent of the standard Order Status |
| `Order.Customer_Name__c` | Text | Shopper name captured at checkout |
| `Order.Customer_Email__c` | Email (external ID) | Shopper email; keys the public order lookup |

## Security Notes

- Salesforce tokens (both tiers) exist only server-side; browsers hold at most an opaque session ID.
- The integration user should be a **least-privilege account** in production, not a full admin.
- Sessions are in-memory; use a shared store (e.g. Redis) and HTTPS end-to-end for production deployment.

## Roadmap

- Inventory tracking and stock-based availability
- Order confirmation emails (Apex trigger or platform events)
- Real per-customer Accounts + Contacts instead of a shared storefront account
- OAuth 2.0 Connected App for operator login
