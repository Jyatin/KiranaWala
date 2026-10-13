# 🛒 KiranaWala

### Hyperlocal Smart Grocery Commerce Platform

KiranaWala is a full-stack hyperlocal grocery platform connecting customers with neighbourhood grocery stores through a complete commerce workflow — discovery, catalog browsing, inventory-aware carting, checkout, payment, order fulfilment, and store operations.

**Live:** https://kirana-wala-1nhp.vercel.app  
**Repository:** https://github.com/Jyatin/KiranaWala

---

## Why KiranaWala?

Local grocery stores often operate without integrated digital catalogues, inventory workflows, online payments, or customer-facing ordering systems. KiranaWala provides a single platform for both sides of the marketplace:

- **Customers:** discover stores, browse products, search/filter, build carts, apply coupons, pay online, and track orders.
- **Store owners:** manage stores, products, inventory, incoming orders, and fulfilment from a dedicated dashboard.

The project was designed as a real commerce system rather than a basic CRUD e-commerce demo, with particular focus on **payment correctness, inventory consistency, authorization, failure handling, automated testing, and real-world validation**.

---

## Core Workflow

```text
Customer
  │
  ├── Discover nearby stores
  ├── Browse/search products
  ├── Add products to cart
  ├── Apply coupon
  ├── Checkout
  │      │
  │      ├── Server validates cart
  │      ├── Server calculates payable amount
  │      └── Razorpay order created
  │
  ├── Complete payment
  │      │
  │      └── Server verifies payment signature
  │
  └── Track order

Store Owner
  │
  ├── Authenticate
  ├── Manage store profile
  ├── Add/edit/delete products
  ├── Update inventory
  ├── Receive orders
  └── Update fulfilment status
```

---

## Architecture

```text
                         ┌──────────────────────┐
                         │       Customer       │
                         └──────────┬───────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │ Next.js / React / TypeScript │
                    │ Customer + Store Dashboards  │
                    └──────────────┬──────────────┘
                                   │ REST API
                                   ▼
                    ┌─────────────────────────────┐
                    │       Node.js / Express     │
                    │ Authentication              │
                    │ Commerce APIs               │
                    │ Validation + Authorization   │
                    └───────┬───────────┬─────────┘
                            │           │
                            ▼           ▼
                    ┌────────────┐  ┌──────────────┐
                    │  MongoDB   │  │   Payment    │
                    │ Users      │  │   Service    │
                    │ Stores     │  │   Razorpay   │
                    │ Products   │  └──────┬───────┘
                    │ Orders     │         │
                    │ Inventory  │         ▼
                    │ Coupons    │  HMAC-SHA256
                    └────────────┘  verification
                            │
                            ▼
                    ┌────────────────┐
                    │ Order / Stock  │
                    │ State Changes  │
                    └────────────────┘
```

The frontend is responsible for presentation and user interaction. Commerce-critical decisions are enforced by the backend rather than trusting client-supplied state.

---

## Engineering Highlights

### 1. Race-Safe Inventory

Inventory is treated as a consistency problem rather than a frontend counter.

- Stock changes are performed with **atomic conditional decrements**.
- The stock condition is checked as part of the database operation rather than using an unsafe read → check → write sequence.
- Temporary inventory reservations use TTL-based expiry.
- Concurrent checkout scenarios are tested to detect overselling.

This is designed to prevent two customers from successfully purchasing the same final unit when requests arrive concurrently.

### 2. Payment State Machine

The payment flow is implemented server-side and treats payment as a state-transition problem.

```text
Checkout
   │
   ▼
Order / Payment Pending
   │
   ▼
Razorpay Order
   │
   ▼
Customer Payment
   │
   ├── Failure ───────► Payment Failed
   │
   └── Success
          │
          ▼
Server-side HMAC-SHA256 verification
          │
          ▼
Payment / Order State Updated
```

The backend:

- calculates and validates the payable amount
- creates the Razorpay order
- never treats a client-supplied amount as authoritative
- verifies the Razorpay signature using HMAC-SHA256
- handles payment success and failure states
- processes payment events idempotently
- records payment events durably to support safe retries; automated reconciliation is not yet implemented

### 3. Idempotent Payment Webhooks

Payment events can be delivered more than once, so webhook processing is designed to be idempotent.

- Payment/event identifiers are used to recognize duplicate events.
- State transitions are guarded so the same payment cannot be applied repeatedly.
- A reconciliation worker for cases where provider and application state diverge remains future work.

### 4. AI-Assisted Shopping

KiranaWala includes an AI-assisted shopping workflow that lets users express shopping intent naturally.

```text
Natural-language shopping intent
            │
            ▼
      AI interpretation
            │
            ▼
 Relevant catalogue products
            │
            ▼
 Server validation
            │
            ▼
      Cart actions
```

The model does not get unrestricted authority over commerce operations. Product/cart actions are validated by the backend before state is changed.

### 5. Authentication & Authorization

- JWT-based authentication
- Customer/store-owner role separation
- Protected backend routes
- Backend authorization rather than frontend-only checks
- Ownership-aware commerce operations

### 6. Database-Backed Commerce

MongoDB persists the application's core commerce state:

- users
- stores
- products
- inventory
- carts
- coupons
- orders
- payment state

Commerce operations are validated on the backend so the client cannot directly define authoritative prices, stock, payment status, or order state.

---

## Payment Security

Razorpay is integrated through a server-controlled payment flow.

```text
Client
  │
  │ checkout request
  ▼
Backend
  │
  ├── Load authoritative product prices
  ├── Validate cart / inventory
  ├── Calculate payable amount
  └── Create Razorpay order
          │
          ▼
      Razorpay Checkout
          │
          ▼
     Payment response
          │
          ▼
Backend verification
          │
          ├── HMAC-SHA256 signature check
          ├── Duplicate-event protection
          └── Payment/order state transition
```

Invalid or tampered payment signatures are rejected. Razorpay test/sandbox credentials are used for development; secrets are not intended to be committed to the repository.

---

## Testing and Quality Assurance

KiranaWala's backend tests use **Jest**. Run the commands from the repository root unless a command explicitly changes directories.

### Run the tests

Install the root and backend dependencies first:

```bash
npm install
npm install --prefix server
```

Then run the backend Jest suite from the repository root:

```bash
npm test
```

The root `test` script delegates to the backend test runner with `npm --prefix server test`. You can also run the same suite directly from the backend directory:

```bash
cd server
npm test
```

The backend script runs `jest --runInBand`, which executes tests sequentially. The root command does **not** run a separate frontend test suite.

### What is covered

The existing suite contains tests for backend behaviour across:

- **Authentication and authorization:** customer/store-owner authentication, role-based permissions, and protected routes.
- **Stores and products:** store operations and product validation.
- **Cart and checkout:** cart behaviour, server-side price checks, and checkout scenarios.
- **Coupons and discounts:** coupon eligibility and discount validation.
- **Inventory and orders:** stock-related behaviour, order creation, and order lifecycle.
- **Payments:** payment-order creation, amount validation, Razorpay signature verification, invalid signatures, and payment failures.
- **Payment webhooks:** selected payment/refund events, raw-body HMAC signature checks, and persistent event-ID deduplication; automated reconciliation remains unimplemented (see below).
- **Validation and integration:** invalid inputs, error handling, and database-backed API workflows.
- **AI-assisted shopping:** AI-related shopping behaviour covered by the current tests.

### Payment webhook security and idempotency

The webhook handler now includes the following safeguards:

- **Required signature verification:** rejects requests when `RAZORPAY_WEBHOOK_SECRET` or the `x-razorpay-signature` header is missing, and verifies the HMAC-SHA256 signature against the original raw request bytes.
- **Persistent event ledger:** stores Razorpay event IDs in a MongoDB collection with a unique index, preventing the same event ID from being claimed as a new event more than once.
- **Processing state:** records events as `processing`, `processed`, or `failed`. Failed or stale processing attempts can be reclaimed; active duplicates receive a non-2xx response so the provider can retry.
- **Retry-aware errors:** returns a non-2xx response when processing fails instead of acknowledging an unsuccessful attempt with HTTP 200.

The raw-body middleware is registered before `express.json()` so signature verification uses the exact request bytes received by the server.

**Remaining limitation:** an event ledger is not a complete distributed transaction. A process crash between an order update and a separate side effect (for example, refund stock restoration) can still leave partial state. Reconciliation against Razorpay's authoritative payment state has **not** been implemented. Do not claim exactly-once side effects or payment/order reconciliation until those paths have dedicated recovery logic and tests.

The webhook tests cover missing signatures, invalid signatures, and repeated event IDs. Further hardening should cover concurrent duplicate deliveries, retry after processing failure, stale-event recovery, and failures between order updates and stock side effects.

### Current test inventory and QA status

- **220 Jest test declarations** across 18 backend test files, including 20 newly added product-model validation tests.
- **217 documented QA scenarios** in [`TEST_CASES.md`](./TEST_CASES.md).
- The matrix contains **217 documented QA scenarios**; use the test suite and manual QA process to validate behavior in the target environment.
- The documented matrix classifies 47 scenarios as Automated-only, 66 as Both automated and manual, and 104 as Manual-only.

These figures describe test declarations and the QA matrix, not code coverage. The backend Jest suite is the automated verification entry point; the test command is `npm test` from the repository root. Manual-only scenarios still require the documented manual QA process.

### Important distinction

Automated test counts do not equal code coverage, and a test declaration does not prove that a test passes. Manual-only scenarios still need to be checked through the documented manual QA process.
---

## Real-World Validation

The platform was validated with **5 local grocery stores** against realistic operational workflows.

Validation included:

- store onboarding
- store authentication
- catalogue/product management
- inventory updates
- customer product discovery
- ordering
- checkout/payment workflow
- order fulfilment
- store-owner dashboard usability
- operational edge cases

This provided feedback beyond synthetic development-only testing and helped validate whether the workflows made sense for actual neighbourhood-store operations.

---

## UI / UX Quality

The product was reviewed across the complete customer and store-owner journeys, including:

- navigation
- authentication
- store discovery
- product browsing
- search/filter
- cart
- checkout
- payment
- order tracking
- customer dashboard
- store-owner dashboard
- inventory management
- order management
- responsive layouts
- loading states
- empty states
- error states
- form validation

The goal was to provide a complete product experience rather than a collection of isolated CRUD screens.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB / MongoDB Atlas |
| Authentication | JWT |
| Payments | Razorpay |
| AI | AI-assisted shopping workflow |
| API | REST |
| Testing | Automated API/integration test suite |
| Containers | Docker |
| CI | GitHub Actions |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |

---

## Repository Structure

```text
KiranaWala/
├── .github/
│   └── workflows/          # CI workflows
├── src/                    # Next.js application
│   ├── app/                # Application routes/pages
│   ├── components/         # Reusable UI components
│   └── ...
├── server/                 # Express backend
│   ├── models/             # MongoDB models
│   ├── routes/             # REST API routes
│   ├── services/           # Backend services
│   └── ...
├── public/                 # Static assets
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

---

## Deployment

| Component | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | MongoDB Atlas |
| Payments | Razorpay Sandbox/Test |
| CI | GitHub Actions |

### Live application

https://kirana-wala-1nhp.vercel.app

---

## Local Development

### Prerequisites

- Node.js and npm
- MongoDB or MongoDB Atlas
- Docker (optional)

### Clone and install

```bash
git clone https://github.com/Jyatin/KiranaWala.git
cd KiranaWala
npm install
npm install --prefix server
```

The root install sets up the Next.js application. The second command installs the backend's separate dependencies, including Jest.

### Run the application

Start the frontend:

```bash
npm run dev
```

Start the backend in a separate terminal:

```bash
npm run server
```

### Run backend tests

From the repository root:

```bash
npm test
```

Or run the equivalent backend command directly:

```bash
cd server
npm test
```

Both test commands execute the backend Jest suite. See [Testing and Quality Assurance](#testing-and-quality-assurance) for test inventory and status.

### Environment configuration

Create the local environment variables required for the database, JWT authentication, Razorpay test credentials, and other application configuration.

**Never commit real secrets or production credentials.**

Docker-based development is also supported through the project's Docker configuration.

---

## What I Learned Building KiranaWala

The most important engineering challenges were not the UI screens themselves. They were the boundaries where commerce systems become correctness-sensitive:

- preventing inventory overselling under concurrent requests
- making payment state transitions safe under duplicate events
- verifying payment signatures server-side
- keeping client input separate from authoritative commerce state
- recovering from inconsistent payment/order states
- validating AI-generated shopping actions before changing application state
- testing failure paths rather than only successful requests
- validating the product against real local-store workflows

---

## Project Status

**Completed and deployed.**

KiranaWala is maintained as a portfolio project demonstrating full-stack product engineering, backend correctness, payment integration, AI-assisted workflows, testing, and real-world product validation.

---

## Author

**Jyatin Singh**

- GitHub: https://github.com/Jyatin
- LinkedIn: https://www.linkedin.com/in/jyatinsingh/

---

### Built for better local commerce.
