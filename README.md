# KiranaWala

**Hyperlocal Smart Grocery Commerce Platform**

KiranaWala is a full-stack grocery commerce application designed to connect customers with neighbourhood stores. It brings store discovery, product catalogues, cart and checkout, payments, inventory operations, order fulfilment, and AI-assisted shopping into one platform.

- **Live application:** https://kirana-wala-1nhp.vercel.app
- **Backend deployment:** https://kiranawala-api.onrender.com
- **Source code:** https://github.com/Jyatin/KiranaWala
- **QA matrix:** [TEST_CASES.md](./TEST_CASES.md)

> **Project scope:** KiranaWala is a deployed portfolio project. The repository includes demo-seeding utilities and some integrations that depend on external credentials. A feature being present in the code does not, by itself, mean every production-scale failure path has been verified.

---

## Contents

- [Product overview](#product-overview)
- [Features](#features)
- [Architecture](#architecture)
- [Core workflows](#core-workflows)
- [Engineering decisions and limitations](#engineering-decisions-and-limitations)
- [Technology stack](#technology-stack)
- [API overview](#api-overview)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Demo data](#demo-data)
- [Testing and QA](#testing-and-qa)
- [Deployment](#deployment)
- [Known limitations and next steps](#known-limitations-and-next-steps)
- [What this project demonstrates](#what-this-project-demonstrates)
- [Author](#author)

---

## Product overview

Traditional neighbourhood grocery stores may lack integrated digital catalogues, online ordering, inventory visibility, and customer-facing fulfilment tools. KiranaWala explores how a shared digital platform can support both sides of local commerce.

### Customer experience

Customers can discover stores, search and filter grocery products, review product details, manage a cart, apply eligible coupons, place orders, complete payment flows, and follow order status. An AI-assisted shopping experience helps translate natural-language requests into relevant catalogue discovery.

### Store and fulfilment operations

Store-owner routes support store and product management, inventory updates, and order workflows. Dedicated delivery routes support delivery partners in finding available orders, claiming work, and advancing fulfilment status.

### Demo catalogue

The repository's seed script is designed to populate **20 Bengaluru demo stores and 200+ grocery products**. This is seeded sample data, not a claim that 20 independent merchants are actively operating on the live deployment.

---

## Features

### Customer shopping

- Store and product discovery, including search and category filtering.
- Store-level product browsing and product detail views.
- Cart and checkout workflows with server-side validation.
- Coupon discovery and validation for eligible orders.
- Customer order history, status tracking, and dashboard views.
- Responsive layouts and loading, empty, and error states documented in the QA matrix.

### Store-owner operations

- Store-owner authentication and protected management routes.
- Store profile and product catalogue management.
- Inventory updates and order fulfilment workflows.
- Server-side role and ownership checks for protected operations.

### Delivery-partner workflow

- View orders available for pickup and orders assigned to the logged-in delivery partner.
- Claim eligible orders that are ready and unassigned.
- Progress orders through supported fulfilment states.
- Validate a delivery OTP when the delivery route transitions an order to delivered.

The delivery routes and order model implement workflow primitives; do not interpret them as proof of live courier dispatch, route optimisation, or GPS navigation.

### Payments and promotions

- Razorpay order creation and server-side payment verification.
- Payable amount derived on the backend rather than trusted from client input.
- HMAC-SHA256 verification for payment signatures.
- Coupon validation for validity dates, minimum order value, store applicability, and usage limits.
- Webhook event ledger with duplicate-event detection and retry-aware processing.
- Refund event handling in the webhook workflow.

The webhook ledger reduces duplicate event processing but does not make all order and inventory side effects one atomic distributed transaction. See [Engineering decisions and limitations](#engineering-decisions-and-limitations).

### AI-assisted shopping

KiranaWala integrates Google's Gemini SDK through a server-side provider adapter. The AI service can interpret shopping requests and invoke declared tools for catalogue and store discovery.

The AI implementation is separated into:
- **Provider adapter:** contains the Gemini-specific integration and reads the API key from the server environment.
- **Orchestration service:** manages the conversation and bounded tool-calling loop.
- **Prompt configuration:** supplies the application's shopping-oriented system instructions.
- **Tool layer:** validates inputs, limits result sizes, uses safe data projections, and exposes read-only database operations to the model.

The AI does not receive unrestricted database-write tools. The backend remains responsible for authoritative commerce state and must validate any subsequent cart or checkout action.

### Reviews, notifications, and subscriptions

- **Reviews:** endpoints support product/store reviews and ratings, with purchase-history checks used to identify verified-purchase reviews.
- **In-app notifications:** retrieve a user's notifications, calculate unread counts, and mark one or all notifications as read.
- **Recurring subscriptions:** create and list recurring grocery subscription records and update their status (active, paused, or cancelled), with frequency and delivery preferences.

The subscription endpoints establish subscription records and status management. Automatic generation and fulfilment of every future recurring order should not be assumed unless a scheduler/worker and its end-to-end behaviour are separately verified.

### Location-aware discovery

Store documents support GeoJSON point coordinates and a MongoDB 2dsphere index. Location-aware discovery and distance-based results are used in parts of the application. This is not a claim of continuous customer tracking or turn-by-turn navigation.

---

## Architecture

```text
Customer / Store Owner / Delivery Partner
                    |
                    v
        Next.js + React + TypeScript
         Customer and store interfaces
                    |
                 REST API
                    |
                    v
           Node.js + Express
     Authentication / Authorization
     Validation / Commerce workflows
       |          |           |
       v          v           v
    MongoDB    Razorpay    Gemini API
  users, stores, payments   AI-assisted
  products, orders,         discovery
  inventory, coupons,
  reviews, subscriptions,
  notifications, webhook events
       |
       v
 Inventory, order and fulfilment
 state transitions
```

The frontend handles presentation and interaction. The backend is responsible for validating requests and making authoritative decisions about prices, inventory, permissions, payment state, and order state.

### Main domain models

The backend contains Mongoose models for users, stores, products, carts, orders, coupons, deliveries, reviews, notifications, subscriptions, and webhook events. Exact relationships and fields are defined in the model files under `server/models/`.

---

## Core workflows

### 1. Browse and build a basket

1. A customer opens store discovery or the product catalogue.
2. The application retrieves relevant stores/products and applies search or category filters.
3. The customer adds items to a cart and selects quantities.
4. The backend validates product and quantity information before accepting commerce operations.

### 2. Checkout and payment

1. The backend validates the order/cart data and calculates the authoritative payable amount.
2. Inventory reservation logic uses conditional database updates to check availability while reserving stock.
3. The payment service creates a Razorpay order when configured for the real provider, or uses its development mock provider only in non-production environments when credentials are unavailable.
4. The backend verifies the payment signature before accepting a successful payment transition.
5. Payment webhooks are checked against the configured webhook secret and recorded in a persistent event ledger.

### 3. Store and delivery fulfilment

1. Store-side workflows move an order through preparation and ready states.
2. A delivery partner can list eligible orders and claim an unassigned ready order.
3. Delivery status progresses through supported states.
4. The delivery endpoint checks the submitted OTP when marking an order delivered.

Exact transition rules are implemented in the route handlers. This workflow description is not a guarantee of a fully automated dispatch system.

### 4. AI-assisted catalogue discovery

1. A customer submits a natural-language shopping request.
2. The server-side AI service sends the request to Gemini with the configured system instructions and tool declarations.
3. The model may request a read-only catalogue/store tool.
4. Tool inputs are validated, database results are shaped into limited response objects, and results are returned to the conversation.
5. The service returns a final response and the tools used; it does not expose raw provider responses or tool arguments as its public response contract.

---

## Engineering decisions and limitations

### Inventory concurrency: per-product atomicity vs. cart-level atomicity

Inventory correctness has two different levels.

- **Per-product atomicity:** a conditional stock update checks availability and decrements a product's quantity in one database operation. This helps prevent competing requests from selling the same remaining unit.
- **Multi-product checkout:** a cart can touch several product documents. Atomic updates to each document do not, by themselves, make the complete cart operation all-or-nothing.
- **Compensating rollback:** restoring stock after a later item fails can itself fail or be interrupted. A compensating update is not equivalent to a transaction.
- **Reservations and expiry:** the inventory service uses temporary reservations with a default 15-minute TTL. Expiry/release behaviour does not independently guarantee transaction-level consistency across every product in a cart.
- **Verification boundary:** tests demonstrate only the scenarios they exercise; they do not prove every possible interleaving or crash-recovery path.

Do not claim that every multi-item checkout has a guaranteed atomic commit/rollback unless the relevant database transaction or complete recovery design is established and tested.

### Payment webhook idempotency

The webhook handler:
- requires the configured `RAZORPAY_WEBHOOK_SECRET`, signature header, event ID, and raw request body;
- validates the HMAC-SHA256 signature against the original request bytes;
- stores event IDs in a MongoDB ledger with a unique index;
- tracks processing states (`processing`, `processed`, and `failed`);
- returns non-2xx responses for processing failures so the provider can retry.

The raw-body middleware is registered before the general JSON parser. The ledger helps detect duplicate events, but **exactly-once side effects are not guaranteed**. A crash between an order update and a separate side effect—such as refund-related stock restoration—can leave partial state. Automated reconciliation against Razorpay's authoritative payment state remains future work.

### AI safety boundary

The AI database tool layer is intended to be read-only, validates tool inputs, limits query sizes, and shapes returned objects to avoid passing raw database documents to the model. AI output is not an authority for price, stock, payment status, or order state.

### Authentication and authorization

JWT-based authentication and role checks protect backend operations. Customer, store-owner, delivery-partner, and admin-specific behaviour should be assessed at the route level; a protected frontend view is not a substitute for backend authorization.

---

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling and UI | Tailwind CSS, Lucide icons, Motion/GSAP in relevant UI areas |
| Backend | Node.js, Express |
| Data access | Mongoose |
| Database | MongoDB / MongoDB Atlas |
| Authentication | JWT, bcryptjs |
| Payments | Razorpay integration and a development-only mock provider |
| AI | Google Gemini SDK, server-side adapter and tool calling |
| API style | REST |
| Backend testing | Jest, Supertest, mongodb-memory-server in the test setup |
| Frontend hosting | Vercel |
| Backend hosting | Render |
| CI configuration | GitHub Actions workflow(s) in `.github/workflows/` |

Dependency versions and scripts are defined in the root and `server/package.json` files.

---

## API overview

The Express server mounts the following route groups. Individual endpoints have different authentication requirements; check the route handler and middleware before calling them.

| Base path | Responsibility |
|---|---|
| `/api/customer` | Customer registration/login, customer-facing store/product/cart/order operations |
| `/api/customer/ai` | Authenticated AI shopping chat |
| `/api/store` | Store operations |
| `/api/store-owner` | Store-owner operations (same route module mounted under this prefix) |
| `/api/coupons` | Coupon listing, validation, and management endpoints |
| `/api/payments` | Payment-order creation, payment verification, and Razorpay webhook |
| `/api/delivery` | Delivery-partner order discovery, claiming, and status transitions |
| `/api/reviews` | Product/store review submission and retrieval |
| `/api/notifications` | Notification listing and read-state management |
| `/api/subscriptions` | Recurring subscription creation, listing, and status management |

### Important payment endpoints

- `POST /api/payments/create-order` — creates a payment order for an authenticated customer's order.
- `POST /api/payments/verify` — verifies the payment through the payment service.
- `POST /api/payments/webhook` — receives Razorpay webhook events; signature verification requires the raw request body and configured webhook secret.

This is a route-group overview, not a complete OpenAPI specification. For request bodies, response schemas, and access rules, inspect the corresponding files under `server/routes/`.

---

## Repository layout

```text
KiranaWala/
├── .github/workflows/       # CI workflow configuration
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Reusable UI components
│   └── ...                  # Frontend modules
├── server/
│   ├── models/              # Mongoose domain models
│   ├── routes/              # Express route handlers
│   ├── services/            # Payment, inventory, coupon and AI services
│   ├── middleware/          # Authentication/authorization middleware
│   ├── scripts/             # Demo data seeding
│   └── __tests__/           # Backend Jest tests
├── public/                  # Public/static and legacy assets
├── views/                   # Express-served HTML views
├── docker-compose.yml       # Existing multi-service configuration
├── package.json             # Frontend/root scripts and dependencies
├── server/package.json      # Backend scripts and dependencies
├── TEST_CASES.md            # Manual/integration QA matrix
└── README.md
```

The repository contains both the Next.js frontend and public/Express-served assets. Treat the current Next.js application under `src/` as the primary frontend described by the live application link.

---

## Getting started

### Prerequisites

- A supported Node.js runtime and npm.
- MongoDB locally or a MongoDB Atlas connection string.
- Gemini API key if you want to use the AI chat feature.
- Razorpay credentials for real Razorpay integration; development mock payments are available only in non-production mode when real credentials are not configured.

### 1. Clone and install

```bash
git clone https://github.com/Jyatin/KiranaWala.git
cd KiranaWala
npm install
npm install --prefix server
```

The root install prepares the Next.js application. The second install prepares the separately configured Express backend and its test dependencies.

### 2. Configure the backend environment

Create `server/.env` using `server/.env.example` as a starting point. Fill in the required values for your environment. Do not commit the real `.env` file.

See [Environment variables](#environment-variables) below.

### 3. Start MongoDB

Start your local MongoDB instance or configure `MONGO_URI` to point to a database you are authorised to use.

### 4. Run the backend

In one terminal:

```bash
npm run server
```

The Express server defaults to port `3000` unless `PORT` is configured. If you run the backend and frontend on the same port, resolve the conflict by configuring distinct ports and the frontend's API target as appropriate.

### 5. Run the Next.js frontend

In another terminal:

```bash
npm run dev
```

Next.js uses its default development port unless it is already occupied. Confirm the frontend's API base URL/configuration matches the backend address in your local setup.

### 6. Seed demo data (optional)

After configuring the database, you can run:

```bash
npm run seed
```

**Warning:** review the seed script before running it against any database containing data you need to preserve. Use a dedicated development database for demo data.

---

## Environment variables

The backend reads environment configuration from `server/.env`. The committed `server/.env.example` currently documents `MONGO_URI`, `JWT_SECRET`, `PORT`, and `GEMINI_API_KEY`. Payment configuration also uses the variables below.

| Variable | Purpose | Required when |
|---|---|---|
| `MONGO_URI` | MongoDB connection string | Required for a configured persistent database; production startup cannot use a local fallback |
| `JWT_SECRET` | JWT signing secret | Required for secure deployments; never use a guessable default in production |
| `PORT` | Express listening port | Optional; server defaults to 3000 |
| `GEMINI_API_KEY` | Gemini API key | Required for the AI chat feature; other API routes can run without it |
| `RAZORPAY_KEY_ID` | Razorpay API key ID | Required with the key secret for real Razorpay order/payment integration |
| `RAZORPAY_KEY_SECRET` | Razorpay API secret | Required with the key ID for real payment integration and payment signature verification |
| `RAZORPAY_WEBHOOK_SECRET` | Secret configured for Razorpay webhook signing | Required to verify incoming Razorpay webhook events |

Use placeholders in documentation and a secret manager or deployment environment variables for actual credentials. Never commit API keys, database passwords, webhook secrets, or production credentials.

---

## Demo data

The seeding script describes a demo catalogue of 20 Bengaluru stores and more than 200 grocery products. It also seeds related commerce data according to the script's implementation.

- Use a separate development database for demo data.
- Treat seeded stores/products as sample records, not independently verified live merchants.
- Do not run seed scripts against a production database without reviewing their behaviour and confirming the intended effect.
- External product images may depend on the image provider and network availability.

---

## Testing and QA

The backend uses Jest and runs tests sequentially with `jest --runInBand`.

### Run the backend tests

From the repository root:

```bash
npm test
```

Or from the backend directory:

```bash
cd server
npm test
```

The root `test` script delegates to the backend suite using `npm --prefix server test`. It does **not** run a separate frontend test suite.

### Test coverage areas

The current test files include backend tests relating to:

- Authentication, roles, and protected routes.
- Store and product behaviour and product model validation.
- Cart, checkout, and order workflows.
- Coupon and discount validation.
- Inventory behaviour and reservation scenarios.
- Payment order creation, signature validation, payment failures, and selected webhook cases.
- Webhook raw-body signature validation and persistent event-ID deduplication.
- AI service/tool behaviour, using mocked provider calls in tests where configured.
- Input validation, error handling, and database-backed API workflows.

### Test inventory vs. passing results

The feature branch README has recorded **220 Jest test declarations across 18 backend test files** and **217 scenarios** in [TEST_CASES.md](./TEST_CASES.md). The QA matrix records its last execution date and per-scenario status inside that file.

These counts are inventory metrics, not code coverage and not proof that every test currently passes. A test declaration only proves that a test is defined. Re-run the suite against the current commit before reporting a fresh pass rate.

The QA matrix includes manual, automated, and combined scenarios. Manual-only scenarios still require browser/user validation.

### Webhook test scope

The documented webhook tests cover missing signatures, invalid signatures, and repeated event IDs. Further valuable tests include concurrent duplicate deliveries, retry after processing failure, stale processing recovery, and failures between order updates and stock side effects.

See [TEST_CASES.md](./TEST_CASES.md) for the detailed scenario matrix.

---

## Deployment

The repository's documented hosting setup is:

| Component | Platform / service |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | MongoDB Atlas (when configured) |
| Payment integration | Razorpay; use test credentials for development |
| CI | GitHub Actions configuration in the repository |

- **Live frontend:** https://kirana-wala-1nhp.vercel.app
- **Backend URL:** https://kiranawala-api.onrender.com

Configure backend environment variables in the deployment provider rather than committing secrets. Ensure the frontend points to the intended backend URL and that CORS settings match the deployed frontend.

### Docker note

The repository contains Docker configuration, but the current `docker-compose.yml` builds the frontend from `./public` using an Nginx image, while the primary frontend described here is the Next.js app under `src/`. Therefore, do not assume the existing compose file runs the complete current Next.js application without further configuration. Verify or update the Docker setup before relying on it for full-stack development or deployment.

---

## Known limitations and next steps

The following are explicit boundaries to keep the project's claims accurate:

1. **No complete payment reconciliation worker:** divergence between Razorpay and application payment/order state is not automatically reconciled by a dedicated worker.
2. **Webhook side effects are not one distributed transaction:** a crash between related writes can leave partial state, even when event IDs are deduplicated.
3. **Multi-item inventory is not automatically transactionally atomic:** per-product conditional updates do not guarantee an all-or-nothing cart reservation.
4. **Subscription automation needs separate verification:** subscription records and status management exist; a complete scheduled order-generation and fulfilment pipeline should not be claimed without verifying the worker/scheduler.
5. **Frontend automated tests are not included in the root test command:** `npm test` runs the backend Jest suite.
6. **Docker configuration needs alignment:** the compose frontend currently targets the static `public/` directory rather than the Next.js frontend.
7. **Live merchant claims must be evidence-based:** seeded demo data and local workflow feedback should be described separately from independently verified active merchants.

These limitations are useful engineering discussion points: they identify the difference between implemented workflows and stronger reliability guarantees.

---

## What this project demonstrates

KiranaWala brings together several practical full-stack engineering concerns:

- Designing a multi-role commerce application and REST API.
- Modelling users, stores, products, carts, orders, inventory, and related domain records.
- Enforcing backend validation and authorization boundaries.
- Integrating payment-provider order creation and cryptographic signature checks.
- Handling webhook retries with a persistent event ledger while documenting the remaining consistency gaps.
- Designing inventory reservations and reasoning about concurrency and rollback.
- Integrating a server-side LLM with bounded tool calling and read-only data access.
- Maintaining automated backend tests and a structured manual QA matrix.
- Evaluating product workflows against realistic neighbourhood-store scenarios.

---

## Author

**Jyatin Singh**

- GitHub: https://github.com/Jyatin
- LinkedIn: https://www.linkedin.com/in/jyatinsingh/

---

*Built to explore better digital commerce for neighbourhood grocery stores.*
