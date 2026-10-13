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
- supports reconciliation for payment/order state recovery

### 3. Idempotent Payment Webhooks

Payment events can be delivered more than once, so webhook processing is designed to be idempotent.

- Payment/event identifiers are used to recognize duplicate events.
- State transitions are guarded so the same payment cannot be applied repeatedly.
- Reconciliation handles cases where the payment provider and application state temporarily diverge.

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

## Testing

KiranaWala has **220 test declarations across 18 Jest test files** in the backend test directory, including 20 newly added product-model validation tests. Coverage areas include authentication, authorization, commerce workflows, inventory, orders, coupons, payment processing, AI-assisted shopping, validation, and failure paths. This is a source-level count of `test()` / `it()` declarations; the 20 newly added tests are **not yet executed**, so this change does not claim they pass.

### Automated coverage areas

- Customer and store-owner authentication
- Role-based authorization and protected API routes
- Store operations and product validation
- Cart behaviour and server-side price validation
- Coupon eligibility and discount validation
- Inventory and stock behaviour
- Order creation and lifecycle
- Payment order creation and amount validation
- Razorpay signature verification
- Invalid/tampered payment signatures
- Payment failure handling
- Webhook handling and idempotency scenarios
- Backend validation and error handling
- Database-backed API workflows

### Concurrency and reliability validation

The commerce-critical paths include tests for checkout and failure scenarios, including inventory contention and payment-state recovery. The exact guarantees depend on the scenarios covered by the automated suite and the underlying implementation.

The repository's `TEST_CASES.md` currently lists **217 QA scenarios**: 197 previously recorded as passing and 20 new product-model scenarios marked **NOT TESTED** pending execution. The matrix now contains **47 scenarios classified as Automated-only** (27 existing + 20 newly documented) and 66 classified as Both. The last recorded execution for the previously tested matrix is October 2, 2026; the newly added tests still require a fresh Jest run.

> **Testing note:** Automated test coverage is not the same as 100% code coverage. See [TEST_CASES.md](./TEST_CASES.md) for the broader QA matrix and its recorded execution status.
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

- Node.js
- npm
- MongoDB or MongoDB Atlas
- Docker (optional)

### Clone

```bash
git clone https://github.com/Jyatin/KiranaWala.git
cd KiranaWala
npm install
```

### Environment

Create local environment variables for the database, JWT authentication, Razorpay test credentials, and other application configuration required by the project.

**Never commit real secrets or production credentials.**

### Run

```bash
npm run dev
```

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
