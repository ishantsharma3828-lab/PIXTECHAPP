# PixTech POS — Complete System Documentation

<div align="center">
  <img src="public/icon.png" alt="PixTech Logo" width="80"/>
  
  **A full-featured Point of Sale & Business Management Platform**
  
  Built with React + TypeScript · Offline-first · Multi-role · ZR Express integrated
</div>

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Frontend Structure](#3-frontend-structure)
4. [Backend & Database](#4-backend--database)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [Every Tab — Detailed Breakdown](#6-every-tab--detailed-breakdown)
   - [Storefront (Customer Website)](#storefront-customer-website)
   - [Dashboard](#dashboard)
   - [Inventory](#inventory)
   - [Billing / POS](#billing--pos)
   - [Sales Log](#sales-log)
   - [Service Desk](#service-desk)
   - [PC Configurator](#pc-configurator)
   - [Expenses](#expenses)
   - [Contacts (CRM)](#contacts-crm)
   - [RMA / Returns](#rma--returns)
   - [Delivery Manager (ZR Orders)](#delivery-manager-zr-orders)
   - [Debt Manager](#debt-manager)
   - [User Management](#user-management)
   - [Business Rules](#business-rules)
   - [Settings](#settings)
7. [Key Services — How Data Flows](#7-key-services--how-data-flows)
8. [Printing & Documents](#8-printing--documents)
9. [How to Run Locally](#9-how-to-run-locally)
10. [Default Accounts](#10-default-accounts)

---

## 1. System Overview

**PixTech POS** is a complete business management platform designed for tech retail stores and repair centers. It combines:

- A **customer-facing storefront** (public website for browsing products & booking repairs)
- A **staff POS back-office** (inventory, billing, service desk, reports, and more)
- **Offline-first** data persistence (everything works without internet via `localStorage`)
- **Cloud sync** (optional Supabase backend for multi-device synchronization)
- **ZR Express courier integration** for delivery & shipping management

The application runs in the browser as a **React SPA (Single Page Application)** and can also be packaged as a **desktop app via Electron**.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PixTech POS                                 │
│                                                                     │
│  ┌─────────────────────┐        ┌──────────────────────────────┐   │
│  │  Customer Storefront │        │       Staff POS Panel        │   │
│  │  (Public Routes)     │        │  (Protected /pos/* routes)   │   │
│  │  /  /products        │        │  /pos/dashboard              │   │
│  │  /cart  /repair      │        │  /pos/billing                │   │
│  │  /pc-builder         │        │  /pos/inventory  etc.        │   │
│  └──────────┬──────────┘        └────────────┬─────────────────┘   │
│             │                                 │                      │
│             └──────────────┬──────────────────┘                     │
│                            │                                         │
│                    ┌───────▼────────┐                               │
│                    │   Services Layer│                               │
│                    │  (localStorage) │                               │
│                    │  + API Bridge   │                               │
│                    └───────┬────────┘                               │
│                            │                                         │
│              ┌─────────────┼──────────────┐                         │
│              │             │              │                          │
│      ┌───────▼──┐  ┌───────▼──┐  ┌───────▼──┐                     │
│      │localStorage│  │Supabase  │  │ZR Express│                     │
│      │(Offline)  │  │(Cloud DB)│  │  API     │                     │
│      └───────────┘  └──────────┘  └──────────┘                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Routing | React Router DOM v7 (HashRouter) |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| Icons | Lucide React |
| Build Tool | Vite 6 |
| Desktop | Electron 41 |
| Database (cloud) | Supabase (PostgreSQL + Row Level Security) |
| Database (local) | Browser `localStorage` (offline-first) |
| Courier API | ZR Express REST API |
| Exports | ExcelJS (spreadsheets) |

### Why This Technology Stack Was Chosen

This stack was carefully selected to meet the demanding requirements of a high-performance, cost-effective, and highly scalable retail and repair business:

- **Frontend (React 19 + TypeScript + Vite 6)**: Chosen for maximum speed, fast UI updates, and robust typing. React 19 provides modern state management, and Vite 6 ensures instant loading times and clean production bundles.
- **Local Database (Browser `localStorage`)**: Provides sub-millisecond response times for POS operations. By caching everything locally, we achieve an **offline-first** design where sales and repairs can be processed without waiting for network calls or facing internet downtime.
- **Cloud Sync Database (Supabase / PostgreSQL)**: Supabase is built on top of **PostgreSQL**, the gold standard for relational database performance. It was specifically selected to ensure the application is **fully scalable**, has **excellent query performance**, and remains **completely free** even when handling huge datasets (thanks to Supabase's generous free tier and PostgreSQL's efficient indexing and storage).

---

## 3. Frontend Structure

```
e:/pt app/
├── App.tsx                  ← Root router: splits Storefront vs POS routes
├── index.tsx                ← React entry point
├── index.css                ← Global styles & CSS variables
│
├── pages/                   ← Full page components (one per tab)
│   ├── Auth/                ← Login, Signup, ForgotPassword
│   ├── StoreFront/          ← Customer-facing pages
│   ├── Dashboard.tsx
│   ├── Billing.tsx
│   ├── Inventory.tsx
│   ├── SalesLog.tsx
│   ├── ServiceDesk.tsx
│   ├── Expenses.tsx
│   ├── Contacts.tsx
│   ├── RMA.tsx
│   ├── DeliveryManager.tsx
│   ├── DebtManager.tsx
│   ├── UserManagement.tsx
│   ├── BusinessRules.tsx
│   ├── Settings.tsx
│   └── ZROrdersPage.tsx
│
├── components/              ← Reusable UI components (organized by feature)
│   ├── Layout/              ← Sidebar, Header, TitleBar
│   ├── Billing/             ← Cart, Invoice, Payment modals
│   ├── Inventory/           ← Product card, product modal, import modal
│   ├── ServiceDesk/         ← Ticket creation, ticket workspace
│   ├── Expenses/            ← Expense form, details panel
│   ├── RMA/                 ← RMA list, workspace, creation panel
│   ├── ZRExpress/           ← Delivery order cards, status modals
│   ├── Dashboard/           ← Charts, KPI cards
│   ├── Sales/               ← Sales table, transaction details
│   ├── Contacts/            ← Customer/supplier cards
│   ├── PCConfigurator/      ← Build workspace, component selector
│   ├── UserManagement/      ← User list, user form
│   ├── StoreFront/          ← Product grid, cart, PC builder
│   └── SettingsPanel.tsx    ← Giant settings form
│
├── services/                ← All business logic & data access
├── contexts/                ← React Context providers (Settings, Cart, Toast, UI, Theme)
├── hooks/                   ← usePermissions (RBAC), etc.
├── constants/               ← TypeScript types & enums for every entity
├── db/                      ← WatermelonDB schema & model definitions
├── electron/                ← Electron main process & preload scripts
├── data/                    ← Static JSON (Algeria states & communes)
└── utils/                   ← Search & filter helpers
```

---

## 4. Backend & Database

### Offline-First (localStorage)

Every module stores its data in **browser localStorage** under specific keys:

| Key | What's stored |
|-----|--------------|
| `pos_products` | Full product catalog |
| `pos_sales_history` | All completed sales |
| `pos_service_tickets` | Repair & service tickets |
| `pos_expenses` | Expense records |
| `pos_rma_db` | RMA / return cases |
| `pos_users_db` | Staff user accounts |
| `pos_contacts` | Customer & supplier contacts |
| `pos_activity_log` | Audit log of all actions |
| `pos_notifications` | In-app notification queue |
| `pos_user` | Currently logged-in user session |
| `pos_settings` | Store configuration |
| `pos_purchase_orders` | Incoming stock / purchase orders |
| `pos_debt_db` | Outstanding debt records |

This means **the app works 100% offline** — no internet connection required. Data is instantly available, and all operations (sales, repairs, inventory edits) work without a server.

### Cloud Sync (Supabase)

When a backend is connected, data syncs to **Supabase (PostgreSQL)**. The `syncService.ts` runs a background polling loop every 15 seconds via `startAutoSync()`.

#### Database Tables (supabase_schema.sql)

```sql
organizations   → Multi-tenant: each store is one organization
profiles        → Staff users, linked to org, with roles
products        → Inventory catalog with up to 4 price tiers
customers       → Customer CRM with loyalty points & tier
sales           → Sales records with items + payments as JSONB
```

**Row Level Security (RLS)** ensures complete data isolation — each organization can only see its own data. A PostgreSQL function `get_my_org_id()` is used in every policy to enforce this.

#### API Bridge (apiBridge.ts)

The `apiBridge.ts` service is the single gateway between the frontend and the backend. If the backend returns `null` (offline), all modules gracefully fall back to localStorage. This makes the app resilient to connectivity loss.

```
apiBridge.auth.login()    → POST /api/auth/login
apiBridge.auth.register() → POST /api/auth/register
apiBridge.auth.me()       → GET  /api/auth/me
apiBridge.sync.push()     → POST /api/sync/push  (batch upload)
apiBridge.sync.pull()     → GET  /api/sync/pull  (fetch changes)
```

### Database Selection Rationale: Performance, Scalability & Zero-Cost

The database architecture employs a hybrid strategy combining local **`localStorage`** and cloud **Supabase (PostgreSQL)**. This was designed specifically with these priorities:

#### 1. Scalability for Huge Datasets
* **PostgreSQL Engine**: Supabase uses PostgreSQL, the most robust open-source relational database in the world. It uses B-Tree indexing, optimized query plans, and supports complex relational operations. Even with millions of products, customers, and sales logs, query performance remains top-tier.
* **JSONB Storage**: Payments and cart items are stored in PostgreSQL's native binary JSON (`JSONB`) columns, allowing quick, indexable document querying without database slowdowns.

#### 2. Speed and Best Performance
* **Zero Network Latency**: In-store sales require speed. By prioritizing `localStorage` for immediate reads and writes, transaction processing is instant.
* **Non-Blocking Background Sync**: Data is synced to the cloud asynchronously. If the network is slow or down, the cashiers and technicians never experience lag.

#### 3. 100% Fully Free (No Monthly Server Costs)
* **Supabase Free Tier**: Host your production database for free. Supabase provides a very generous free tier that easily hosts thousands of products and sales.
* **Zero Maintenance Costs**: Since the database is managed by Supabase, there is no need for costly DevOps or hosting services.
* **Offline-First Resilience**: If the internet goes down, operations continue uninterrupted, saving local data until a connection is restored.

---

## 5. User Roles & Permissions

The app uses a **Role-Based Access Control (RBAC)** system defined in `hooks/usePermissions.ts`. Roles are **additive** — a user can have multiple roles and gets the union of all their permissions.

### Roles

| Role | Description |
|------|-------------|
| **admin** | Full access to everything — all tabs, all actions, all price tiers, can void sales, manage users, change settings |
| **manager** | Same as admin (treated identically in the codebase) |
| **cashier** | Can use billing, inventory (view), service desk, expenses, contacts, delivery, RMA. Cannot void sales, edit products, manage users, or access settings |
| **technician (repairman)** | Access to dashboard, inventory (view), and service desk only. Can create and update repair tickets |
| **commission_commercial** | Salesperson with access to billing, sales log, inventory (view prices 1–3), PC configurator. Only sees their own sales |
| **commission_commercial2** | Senior salesperson — same as commercial but sees price tiers 1–4 |
| **special_client** | VIP customer with access to dashboard and inventory (view only, no stock quantities shown) |
| **customer** | Website-only user. Can browse storefront, add to cart, book repairs |

### Tab Access Matrix

| Tab | Admin | Manager | Cashier | Technician | Commercial | Customer |
|-----|-------|---------|---------|-----------|-----------|---------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Inventory | ✅ | ✅ | ✅ (view) | ✅ (view) | ✅ (view) | ❌ |
| Billing / POS | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Sales Log | ✅ | ✅ | ✅ | ❌ | ✅ (own) | ❌ |
| Service Desk | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| PC Configurator | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Expenses | ✅ | ✅ | ✅ (submit) | ❌ | ❌ | ❌ |
| Contacts | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| RMA / Returns | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delivery Manager | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Debt Manager | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| User Management | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Business Rules | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Price Tier Visibility

| Role | Cost Price | Price 1 | Price 2 | Price 3 | Price 4 |
|------|-----------|---------|---------|---------|---------|
| Admin / Manager | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cashier | ❌ | ✅ | ❌ | ❌ | ❌ |
| Commercial | ❌ | ✅ | ✅ | ✅ | ❌ |
| Commercial 2 | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## 6. Every Tab — Detailed Breakdown

---

### Storefront (Customer Website)

**Routes:** `/`, `/products`, `/products/:id`, `/cart`, `/pc-builder`, `/repair`, `/support`, `/favorites`

The public customer-facing website that runs on the same app. No login required.

**What customers can do:**
- **Home page** — Featured products, promotions banner, categories
- **Products catalog** — Browse all products with search, filter by category, price range. Shows product images, descriptions, and prices (Price 1 only)
- **Product details** — Full product page with specs, images, warranty info, add to cart / favorites
- **PC Builder** — Interactive PC configurator for customers. Select CPU, motherboard, RAM, GPU, storage, cooling, PSU, case. System checks compatibility and shows total build cost
- **Repair service** — Fill in a repair request form (device type, problem description, contact info). Submits directly into the Service Desk queue
- **Support** — FAQ and contact form
- **Cart** — Review selected items, proceed to checkout (COD / pay in-store)
- **Favorites** — Saved products list (stored in localStorage)
- **Profile** — Customer account: order history, repair status tracking

---

### Dashboard

**Route:** `/pos/dashboard`  
**Access:** All staff roles

The command center for the store. Shows a live overview of business performance.

**Widgets & KPIs:**
- **Total Revenue** today, this week, this month (with % change vs prior period)
- **Number of sales** and average basket size
- **Low stock alerts** — products below minimum stock level with a direct link to edit them
- **Service desk summary** — open tickets, in-repair, waiting for parts
- **Recent transactions** — last 10 sales with customer name, amount, payment method
- **Revenue chart** — bar chart showing daily revenue for the last 7 or 30 days
- **Top-selling products** — ranked by quantity sold this month
- **Payment method breakdown** — pie/donut chart (cash vs card vs transfer vs COD)
- **Activity feed** — real-time stream of all staff actions (sales, edits, ticket updates)

**Access control:** Cashiers see the dashboard but revenue/financial summaries are hidden. Only managers see the revenue numbers.

---

### Inventory

**Route:** `/pos/inventory`  
**Access:** All staff (edit restricted to Admin/Manager)

Full product catalog management.

**Features:**
- **Product list** — searchable, filterable by category, brand, stock status. Toggle between grid cards and table rows
- **Add product** — modal form with: name, SKU, brand, category, description, up to 4 price tiers (cost price, price 1-4), stock quantity, minimum stock level, warranty settings, custom fields, images (upload multiple, set primary)
- **Edit product** — full edit form. Only Admin/Manager can edit
- **Delete / Archive** — soft delete (products go to trash, can be restored). Bulk delete available
- **Import** — import products from Excel spreadsheet (`.xlsx`). Column mapping supported
- **Export** — export full catalog or filtered selection to Excel
- **Barcode** — generate and print barcode labels for any product
- **Stock adjustment** — manual stock in/out with reason tracking
- **Batch edit** — select multiple products and edit their category, brand, or price all at once
- **Purchase Orders (Incoming Stock)** — create a PO for a supplier, receive items against it. Stock automatically increases when items are received

**Price tiers:** Each product has up to 4 selling prices. Which tiers are visible depends on the logged-in user's role.

---

### Billing / POS

**Route:** `/pos/billing`  
**Access:** Admin, Manager, Cashier, Commercial

The main point of sale screen. Classic POS layout.

**Left panel — Product search & cart:**
- Search products by name, SKU, or barcode scan
- Product quick-add tiles (category shortcuts)
- Cart: add items, change quantity, remove items
- Apply item-level or order-level discounts (Manager only)
- Select price tier (1-4) per item based on role
- Add a customer (existing or create new)

**Right panel — Payment & checkout:**
- **Payment methods:** Cash, Card, Bank Transfer, COD (Cash on Delivery), Cheque, split payment (multiple methods for one order)
- **Cash rounding** (optional, configured in settings)
- **Delivery toggle** — if COD is selected, prompts for delivery details (name, phone, address, city via ZR Express territory search). Automatically creates a ZR Express shipping order
- **Customer discount/loyalty** — apply loyalty points, view customer tier (Bronze/Silver/Gold/Platinum)
- **Invoice preview** — live preview of the invoice before confirming
- **Print options** — after sale: print thermal receipt (80mm), print A4 invoice, or print both

**After a sale:**
- Sale is saved to `pos_sales_history`
- Customer's total spent and loyalty points are updated
- If COD + delivery: ZR Express order is created automatically
- Activity log entry is created
- Notification sent to manager

---

### Sales Log

**Route:** `/pos/sales-log`  
**Access:** Admin, Manager, Cashier (own only for Commercial roles)

Complete history of all sales transactions.

**Features:**
- **Filter** by date range, cashier, payment method, status (completed/void/refunded)
- **Search** by customer name, invoice number, or amount
- **Transaction details panel** — click any sale to see full itemized breakdown: products sold, quantities, prices, discounts, payment split, customer info
- **Void sale** — cancel a completed sale (Manager only). Creates a void record and restores stock
- **Refund** — process a full or partial refund
- **Reprint** — reprint any past invoice (thermal or A4)
- **Revenue summary** — top-bar totals for the filtered period (Manager only): total revenue, total transactions, average basket

**Commercial role:** Salespeople only see their own sales — the filter is automatically scoped to their user ID.

---

### Service Desk

**Route:** `/pos/service-desk`  
**Access:** Admin, Manager, Cashier, Technician (Repairman)

Repair shop ticket management system.

#### 1. Three-Panel Layout
* **Left Panel:** List of all service tickets with status badges and quick search.
* **Center Panel:** Ticket creation form (for new devices) or the detailed Ticket Details Workspace.
* **Right Panel:** Customer CRM info, device specifications, and history of past repairs for that customer.

#### 2. Ticket Lifecycle
```
Intake ──> Diagnosis ──> Pending Admin ──> Pending Customer ──> Repair ──> Quality Control ──> Ready ──> Closed
```

#### 3. Creating a Ticket
* Customer info (link to CRM or create on the fly).
* **Multi-device support:** One ticket can cover multiple devices (e.g., laptop + monitor).
* Device details: Type, brand, model, serial number, password/unlock code, condition checks (Screen/Ports/Body/Battery OK status), and accessories left behind (cables, bags, etc.).
* Intake photos: Upload snapshots of the device's condition upon arrival.

#### 4. The Repairman (Technician) Account Mechanism & Pricing
The Repairman account (default login: `repairman@pos.com` / `repair123`) is strictly tailored for diagnostic and repair tasks:
* **Interface Restraints:** Restricted to **Dashboard**, **Inventory (read-only)**, and **Service Desk**. They cannot access POS billing, CRM, RMA, expenses, or settings.
* **Price Visibility:** Only sees **Price 1 (Retail)**. Tiered prices (Price 2–4) and the raw **Cost Price** of parts are hidden.
* **Tech Quote Entry:** In the `diagnosis` stage, the technician documents findings and logs the raw estimate (Labor Cost + required Parts from inventory).
* **Submit for Approval:** Clicking "Submit for Approval" locks the ticket for the technician and moves it to `pending_admin`.

#### 5. Admin Review & Pricing Separation
* **Internal vs. External Pricing:** The `pending_admin` and `pending_customer` stages are **hidden** from pure technicians.
* **Admin Markup:** An Admin or Manager reviews the ticket and can adjust prices in `ticket.adminReview` (e.g., adding markup to labor or parts).
* **Workflow Resumption:** Once the customer approves, the ticket returns to the technician in `repair` status.
* **Document Printing Rules:**
  * **Printed by Tech:** Outputs the **Tech Quote** (their original internal numbers).
  * **Printed by Admin / Cashier:** Outputs the **Admin-Adjusted Quote** (the client-facing final prices). The customer never sees the internal technician costs.

---

### PC Configurator

**Route:** `/pos/pc-configurator`  
**Access:** Admin, Manager, Cashier, Commercial

A tool to assemble custom PC builds for customers.

**Component categories:**
- CPU, Motherboard, RAM, GPU, Storage (SSD/HDD), Cooling, Power Supply (PSU), Case, Fans

**Features:**
- **Component selector** — search and pick from inventory for each slot
- **Compatibility warnings** — flags obvious mismatches (e.g., wrong socket)
- **Build summary** — shows total cost at each price tier (Price 1–4 depending on role)
- **Proforma invoice** — generate a formal quotation PDF/printout for the customer with all components listed and the total price
- **Save build** — save a configuration for later or as a template

---

### Expenses

**Route:** `/pos/expenses`  
**Access:** Admin, Manager, Cashier (submit only)

Track all store operating expenses.

**Multi-step approval workflow:**
```
Pending → Approved → Paid
         ↓
       Rejected
```

**Expense fields:**
- Date, Category (Office, Rent, Salary, Maintenance, Shipping, Marketing, Other), Subcategory
- Description, Amount
- Tax (included or excluded, with rate)
- Payment method (Cash, Card, Bank, Cheque)
- Paid from (Cash Drawer, Main Account, Petty Cash)
- Responsible person
- Receipt photo (upload)

**Roles:**
- **Cashier** — can submit new expenses (status starts as `pending`)
- **Admin/Manager** — can Approve, Reject, or mark as Paid. Can cancel any expense
- **Repairman** — cannot access expenses tab

**Printing:** Print expense voucher (A4 or thermal)

---

### Contacts (CRM)

**Route:** `/pos/contacts`  
**Access:** Admin, Manager, Cashier

Customer and supplier relationship management.

**Two types of contacts:**
- **Customers** — full CRM: name, phone, email, address, notes, loyalty tier, total spent, purchase history
- **Suppliers** — vendor details: name, contact, address, tax number, bank details, linked purchase orders

**Features:**
- Search & filter contacts
- View full purchase/transaction history for each customer
- Customer loyalty tiers: Bronze (0–5,000), Silver (5,000–15,000), Gold (15,000–30,000), Platinum (30,000+)
- Loyalty points balance and redemption history
- Add notes / tags per contact
- Export contact list

---

### RMA / Returns

**Route:** `/pos/rma`  
**Access:** Admin, Manager, Cashier

Return Merchandise Authorization — manages product returns from customers and warranty claims to suppliers.

**Two RMA types:**
- **Customer Return** — customer returning a purchased product
- **Supplier Warranty** — sending a defective product back to the supplier

**RMA workflow:**
```
Requested → Approved → Received → Inspecting → Pending Admin → Awaiting Supplier / Refunded / Replaced → Closed
```

**Creating an RMA:**
- Link to original sale or purchase order
- Select customer or supplier
- Product details: name, serial number, quantity
- Reason: DOA, Defective, Wrong Item, Buyer's Remorse, Warranty Claim
- Condition on return: New, Opened, Damaged
- Policy status: In Policy / Out of Policy
- Customer notes & photos

**Workspace (technician):**
- Inspection findings notes
- Technical result: Pass / Fail / No Trouble Found (NTF)
- Submit for Admin Approval (after inspection)

**Admin resolution:**
- Issue Refund → triggers refund record
- Replace Product → new item dispatched, inventory updated
- Send to Supplier → creates supplier warranty claim
- Close RMA

---

### Delivery Manager (ZR Orders)

**Route:** `/pos/delivery-manager`  
**Access:** Admin, Manager, Cashier

Manages all COD (Cash on Delivery) shipments via ZR Express courier integration.

**Two tabs:**
1. **Deliveries** — Kanban board with 4 columns: Pending → Shipped → Delivered / Returned
2. **Claims** — List of claims raised on ZR Express (lost/damaged parcels)

**Delivery card shows:**
- Customer name & address
- Order amount (COD value)
- ZR Express tracking number
- Parcel ID
- City / territory

**Actions per status:**
- **Pending** → Mark Shipped (updates ZR Express + local status)
- **Shipped** → Confirm Delivery or Mark as Returned
- **Delivered** → Mark COD as Collected (records cash received)
- Print Borderaux (shipping label PDF fetched from ZR Express)
- Cancel parcel on ZR Express
- Request refund on ZR Express

**ZR Express API Integration:**
- `POST /api/v1/parcels` — create shipping order
- `POST /api/v1/parcels/search` — fetch all orders
- `POST /api/v1/parcels/labels/individual/pdf` — get shipping label
- `DELETE /api/v1/parcels/:id` — cancel order
- `PATCH /api/v1/parcels/:id/state/refund` — request refund
- `POST /api/v1/territories/search` — search cities for delivery address
- `POST /api/v1/claims/search` — fetch claims

---

### Debt Manager

**Route:** `/pos/debt-manager`  
**Access:** Admin, Manager only

Tracks outstanding debts — customers who bought on credit.

**Features:**
- Add debt records (link to a customer, set amount owed, due date)
- Mark full or partial payments
- Payment history per debt
- Filter by status: Active, Partially Paid, Paid, Overdue
- Overdue highlighting (red when past due date)
- Notes per debt entry
- Export to Excel

---

### User Management

**Route:** `/pos/user-management`  
**Access:** Admin, Manager only

Manage all staff accounts for the store.

**Features:**
- **User list** — shows all staff with role badge, status, last login, risk score
- **Create user** — form: full name, username, email, phone, role, branch, password
- **Edit user** — change any user's details or role
- **Suspend / Activate** — toggle user account status
- **Reset password** — generate password reset
- **User profile panel** — shows performance stats: total sales volume, void rate, refund ratio, average basket size
- **Activity timeline** — chronological log of everything that user has done

**Risk score:** Automatically calculated based on number of voids and refunds. High risk score flags suspicious activity.

---

### Business Rules

**Route:** `/pos/business-rules`  
**Access:** Admin, Manager only

Configure automated pricing and sales rules.

**Rule types:**
- **Discount rules** — automatically apply a % discount when conditions are met (e.g., customer tier = Gold, or quantity > 10)
- **Tax rules** — apply different tax rates by category or product type
- **Loyalty rules** — define how many points per currency unit, redemption rate
- **Price override rules** — set a special price for a specific customer segment

Rules are evaluated at the billing screen when items are added to the cart.

---

### Settings

**Route:** `/pos/settings`  
**Access:** Admin, Manager only

Full store configuration. Divided into sections:

| Section | What you configure |
|---------|-------------------|
| **General** | Store name, address, phone, email, tax number, logo |
| **Currency & Tax** | Currency symbol, default tax rate, tax-inclusive vs exclusive |
| **Receipts** | Header text, footer text, show/hide fields on receipt |
| **Printing** | Default paper size (thermal 80mm vs A4), auto-print on sale |
| **Loyalty** | Points per DA, minimum redemption, tier thresholds |
| **Inventory** | Low stock threshold, default category, barcode format |
| **Billing** | Allow discounts, max discount %, allow price tier change |
| **Staff Roles** | Which tabs each role can access (tab-level override) |
| **ZR Express** | API key, tenant ID, base URL |
| **Supabase** | Backend URL & anon key for cloud sync |
| **Language** | Arabic / French / English (full UI translation system) |
| **Theme** | Light / Dark mode toggle |

---

## 7. Key Services — How Data Flows

### billingService.ts
Handles all sale transactions. `completeSale()` is the core function — it:
1. Generates a sale ID and friendly invoice number
2. Deducts stock from `pos_products`
3. Saves sale to `pos_sales_history`
4. Updates customer loyalty points in `pos_contacts`
5. If COD with delivery: calls `shippingService.createZRExpressOrder()`
6. Logs activity via `activityLogService.logSale()`
7. Fires notification to manager

### inventoryService.ts
CRUD for products. `adjustStock()` creates an in/out record and updates the quantity. `importFromExcel()` parses an `.xlsx` file and batch-saves products.

### receiptService.ts
The printing engine. `printReceipt()` generates HTML styled for thermal 80mm printing. `printA4Invoice()` generates a full A4-sized invoice. Uses `window.print()` with dynamically injected `@media print` CSS. Supports Arabic (RTL), French, and English. Handles both sale receipts and service desk repair receipts.

### serviceDeskService.ts
Manages repair tickets. Enforces the status machine. `updateTicketStatus()` validates that only allowed transitions are performed (e.g., cannot jump from New to Delivered). Supports multi-device tickets.

### syncService.ts
Background 15-second polling loop. Compares local `updated_at` timestamps with server. Pushes new local records up, pulls remote changes down. Handles conflict resolution (server wins on conflict).

### activityLogService.ts
Appends timestamped entries to `pos_activity_log`. Every significant action (login, sale, ticket update, expense approval, RMA status change, ZR sync) creates an entry. Entries include: user ID, username, action type, description, timestamp.

### notificationService.ts
In-app notification bell. `addNotification()` pushes a notification to `pos_notifications`. Notifications are targeted by role (e.g., only show to `admin` and `manager`). The header bell icon shows unread count.

### reportService.ts
Generates aggregated business reports from raw data in localStorage. Revenue by day/week/month, top products, cashier performance, category breakdown. Data is exported via `exportService.ts` to Excel.

### exportService.ts
Uses ExcelJS to generate formatted `.xlsx` spreadsheets for: sales log, inventory, expenses, contacts, debt report. Applies column formatting, headers, and filters.

---

## 8. Printing & Documents

The app supports two printing modes:

### Thermal Receipt (80mm)
- Auto-detects if thermal printer is connected
- Generates compact receipt: store name/logo, items, subtotal, tax, total, payment method, cashier name, date, QR code (optional)
- Service desk version: ticket number, customer info, device description, estimated pickup date

### A4 Invoice
- Full-page professional invoice layout
- Company header (logo, address, tax number)
- Itemized table with unit prices, quantities, line totals
- Tax breakdown
- Payment terms
- Footer with thank-you message and bank details (if configured)

### Proforma Quotation (PC Configurator)
- Component-by-component listing
- Build total at selected price tier
- Customer name and date
- "Valid for 7 days" disclaimer

---

## 9. How to Run Locally

### Prerequisites
- Node.js 18+
- npm

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/ishantsharma3828-lab/PIXTECHAPP.git
cd PIXTECHAPP

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev
```

The app will start at **http://localhost:3000**

The app works 100% offline — no backend or database setup required. All data is saved to your browser's localStorage.

### Optional: Cloud Backend (Supabase)
1. Create a free project at [supabase.com](https://supabase.com)
2. Run `supabase_schema.sql` in the Supabase SQL editor
3. Copy your Project URL and Anon Key into the app's Settings → Supabase section

### Build for Production
```bash
npm run build
# Output in /dist
```

---

## 10. Default Accounts

> **Important:** These accounts are pre-loaded into the app on first launch. You can log in using either the **email** or the **username**.  
> To reset accounts, clear your browser's localStorage and refresh.

### 👤 POS Staff Accounts

| Role | Email | Username | Password | Access Level |
|------|-------|----------|----------|--------------|
| **Admin** | admin@pos.com | admin | `admin123` | Full access — all tabs, all settings, all prices, void sales, manage users |
| **Manager** | manager@pos.com | manager | `manager123` | Same as admin — full access |
| **Cashier** | cashier@pos.com | cashier | `cashier123` | Billing, inventory (view), service desk, expenses, contacts, delivery, RMA |
| **Repairman** | repairman@pos.com | repairman | `repair123` | Dashboard, inventory (view), service desk only |
| **Commercial 1** | commercial1@pos.com | commercial1 | `commercial123` | Billing, sales log (own only), inventory (prices 1–3), PC configurator |
| **Commercial 2** | commercial2@pos.com | commercial2 | `commercial456` | Same as Commercial 1 but with access to price tier 4 as well |

### 🗄️ Database Accounts

#### Local (Offline Mode — no setup needed)
The app works fully offline. All data is stored in your **browser's localStorage**. No database credentials required.

#### Cloud Database (Supabase / PostgreSQL)

If you want cloud sync across multiple devices, set up a free Supabase project:

| Setting | Value |
|---------|-------|
| **Platform** | [supabase.com](https://supabase.com) — free tier available |
| **Database** | PostgreSQL (managed by Supabase) |
| **Schema file** | `supabase_schema.sql` (run this in Supabase SQL Editor) |
| **Default DB user** | `postgres` (Supabase managed — you don't set this manually) |
| **Default DB password** | Set during Supabase project creation |

**Steps to connect:**
1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a project name, database password, and region
3. In the SQL Editor, paste and run the contents of `supabase_schema.sql`
4. Go to **Project Settings → API** and copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **Anon/Public Key**
5. Open the app → Settings → Supabase → paste both values → Save

#### Environment Variables (.env)

```env
# Backend API (local dev server if using custom backend)
VITE_API_URL=http://localhost:4000

# Supabase (cloud PostgreSQL)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# WatermelonDB (offline local DB name)
VITE_DB_NAME=posdb_v1
```

---

<div align="center">
  Built for tech retail & repair businesses.<br/>
  Offline-first · Multi-role · Print-ready · ZR Express integrated
</div>

