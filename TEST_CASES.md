## 25. Production Configuration

| ID          | Scenario                                | Expected Result                                                | Actual Result                                           | Status   | Type      | Severity |
| ----------- | --------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- | -------- | --------- | -------- |
| TC-PROD-001 | Production build                        | Build completes without errors                                 | Next.js production build completed successfully in 2.0s | **PASS** | Automated | Critical |
| TC-PROD-002 | Production frontend connects to backend | API requests succeed in the deployed environment               | Relative `/api/...` endpoints work across environments  | **PASS** | Manual    | Critical |
| TC-PROD-003 | No localhost production dependency      | Production does not depend on localhost URLs                   | No hardcoded localhost URLs found in `src/`             | **PASS** | Manual    | Critical |
| TC-PROD-004 | Required environment variables          | All required variables are configured and documented           | `MONGO_URI`, `JWT_SECRET`, and `PORT` are documented    | **PASS** | Manual    | Critical |
| TC-PROD-005 | Production assets                       | Images, videos, and fonts load correctly                       | All production assets load successfully                 | **PASS** | Manual    | High     |
| TC-PROD-006 | Production authentication               | Login and session management work in the deployed environment  | JWT token persistence and authentication verified       | **PASS** | Manual    | Critical |
| TC-PROD-007 | Production Razorpay configuration       | Correct payment credentials and configuration are used         | Provider fallback and live SDK loading verified         | **PASS** | Manual    | Critical |
| TC-PROD-008 | Production webhook                      | Razorpay webhook reaches the backend and is verified correctly | Webhook endpoint and HMAC signature validation verified | **PASS** | Manual    | Critical |
| TC-PROD-009 | Browser console                         | No unexpected production errors occur                          | No uncaught production errors detected                  | **PASS** | Manual    | High     |
| TC-PROD-010 | Network requests                        | No unexpected API failures occur                               | No failed API requests detected                         | **PASS** | Manual    | High     |

---

## 26. Final End-to-End Smoke Test

| ID      | Step                       | Expected Result                                           | Status   |
| ------- | -------------------------- | --------------------------------------------------------- | -------- |
| E2E-001 | Open production homepage   | Homepage loads successfully                               | **PASS** |
| E2E-002 | Register/Login             | User authenticates and JWT token is saved                 | **PASS** |
| E2E-003 | Discover nearby stores     | 16 neighborhood Kirana stores are displayed               | **PASS** |
| E2E-004 | Open store                 | Store metadata and product catalog load successfully      | **PASS** |
| E2E-005 | Open product               | Product detail drawer opens successfully                  | **PASS** |
| E2E-006 | Add product to cart        | Cart updates and single-store rule is enforced            | **PASS** |
| E2E-007 | Modify quantity            | Cart quantity and total are recalculated correctly        | **PASS** |
| E2E-008 | Apply valid coupon         | Coupon is validated and discount is applied correctly     | **PASS** |
| E2E-009 | Open checkout              | Checkout drawer opens successfully                        | **PASS** |
| E2E-010 | Enter address              | Address is validated and accepted                         | **PASS** |
| E2E-011 | Create Razorpay test order | Razorpay order ID is generated server-side                | **PASS** |
| E2E-012 | Complete test payment      | Test payment completes successfully                       | **PASS** |
| E2E-013 | Verify payment server-side | Payment signature is verified and status is set to `paid` | **PASS** |
| E2E-014 | Create order               | Order is created exactly once                             | **PASS** |
| E2E-015 | Open order tracking        | Tracking timeline and ETA load successfully               | **PASS** |
| E2E-016 | Open order history         | Completed order appears in the customer's order history   | **PASS** |
| E2E-017 | Verify cashback/savings    | Wallet points and savings are displayed correctly         | **PASS** |
| E2E-018 | Logout                     | Session is terminated and JWT token is cleared            | **PASS** |

---

## 27. Deployment Gate

* [x] **Authentication:** Server-side JWT validation verified
* [x] **Authorization:** Role checks (`customer`, `store-owner`) and store ownership enforced
* [x] **Payment Verification:** Razorpay HMAC-SHA256 signature verification verified
* [x] **Razorpay Webhooks:** Idempotent webhook handling verified
* [x] **Order Creation:** Server-authoritative order persistence verified
* [x] **Server-Side Pricing:** Prices and totals calculated exclusively from MongoDB
* [x] **Inventory Integrity:** Atomic `reserveStock` and stock commit operations verified
* [x] **Customer Data Isolation:** User resources protected with appropriate 403 checks
* [x] **Secrets & Security:** No secrets committed; `.env.example` provided
* [x] **Production API Configuration:** Clean Next.js production build with no hardcoded localhost URLs

---

## 28. Final QA Sign-Off

| Area               | Status   | Evidence                                                                                   |
| ------------------ | -------- | ------------------------------------------------------------------------------------------ |
| **Routes**         | **PASS** | 17/17 Next.js static and dynamic routes compiled successfully with `npm run build`         |
| **Authentication** | **PASS** | JWT login/register, bcrypt password hashing, and session persistence verified              |
| **Navigation**     | **PASS** | Header, footer, and mobile navigation links updated to active routes                       |
| **Search**         | **PASS** | Typo-tolerant product and store catalog search verified                                    |
| **Discover**       | **PASS** | Brand story and interactive India coverage map verified                                    |
| **Stores**         | **PASS** | Store directory layout repaired and in-store search verified                               |
| **Products**       | **PASS** | Product detail drawer, images, and quantity controls verified                              |
| **Cart**           | **PASS** | Single-store cart rule, quantity updates, and clear-cart functionality verified            |
| **Coupons**        | **PASS** | Server-authoritative coupon validation and discount cap verified                           |
| **Checkout**       | **PASS** | Address validation, delivery fee calculation (₹0 for orders ≥ ₹499), and totals reconciled |
| **Razorpay**       | **PASS** | Order creation, HMAC-SHA256 signature verification, and webhook idempotency verified       |
| **Orders**         | **PASS** | Order lifecycle state machine and customer order history verified                          |
| **Tracking**       | **PASS** | Order status timeline and delivery OTP tracking verified                                   |
