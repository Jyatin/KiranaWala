# Security Hotfix Notes: KiranaWala

**Date:** October 4, 2026  
**Scope:** Strict minimal hotfixes for confirmed security vulnerabilities in Order Tracking OTP Leak, Refund IDOR, Delivery Status Transition IDOR, Double-Refund Race Condition, Auth Test Assertions, Delivery OTP Hardening, and Webhook Fail-Closed Enforcement.

---

## 1. Vulnerability 1: Unauthenticated Order Tracking Delivery OTP Leak

### What was wrong
The endpoint `GET /api/delivery/orders/:id/track` ([server/routes/deliveryRoutes.js:248-315](file:///c:/Users/ENOVO/Downloads/KiranaWala-main/KiranaWala-main/server/routes/deliveryRoutes.js#L248-L315)) had no authentication middleware (`authenticateToken`). Anyone with a valid `orderId` could query the endpoint and receive:
- Unhashed `deliveryOtp`
- Delivery address and phone numbers
- Real-time fulfillment progress stages
- Runner identity and contact details

### How it was reproduced
1. An unauthenticated HTTP `GET /api/delivery/orders/:id/track` returned HTTP 200 with the full tracking payload and plaintext `deliveryOtp`.
2. An authenticated Customer B could query Customer A's `orderId` and receive Customer A's tracking details and `deliveryOtp`.
3. An authenticated Store Owner B could query Store A's `orderId` and receive the order tracking and customer's `deliveryOtp`.

### What changed
1. **Authentication Requirement:** Applied `authenticateToken` middleware to `GET /api/delivery/orders/:id/track`.
2. **Query-Level Scoping:**
   - **Customer:** Filter scoped to `{ _id: id, customer: userId }`.
   - **Store Owner:** Resolved user's store via `Store.findOne({ owner: userId })` and scoped query to `{ _id: id, store: store._id }`.
   - **Delivery Partner:** Filter scoped to `{ _id: id, deliveryPartner: userId }`.
   - **Admin:** Query by `{ _id: id }`.
   - **Non-owner:** Returns `404 Not Found` (rather than 403) to prevent ID enumeration.
3. **Role-Based OTP & PII Sanitization:**
   - Plaintext `deliveryOtp` is returned **strictly to the owning customer** (`...(isOwningCustomer && { deliveryOtp: order.deliveryOtp })`).
   - Store owners, delivery partners, and admins receive operational stages and timeline without the customer's delivery OTP.
4. **Frontend Integration:** Updated `fetchTracking` in [src/app/customer/orders/[id]/page.tsx:92](file:///c:/Users/ENOVO/Downloads/KiranaWala-main/KiranaWala-main/src/app/customer/orders/%5Bid%5D/page.tsx#L92) to pass `Authorization: Bearer ${token}`.

### Tests Added
Suite: `server/__tests__/delivery.tracking.security.test.js`
- `1. Unauthenticated request to GET /api/delivery/orders/:id/track is rejected with 401`
- `2. Unrelated customer (Customer B) gets 404 and cannot view Customer A's order tracking or OTP`
- `3. Unrelated store owner (Store Owner B) gets 404 when querying Store A's order`
- `4. Rightful Store Owner (Store Owner A) can track order but response MUST NOT leak deliveryOtp`
- `5. Rightful Customer (Customer A) can track order and receives deliveryOtp`

---

## 2. Vulnerability 2: Insecure Direct Object Reference (IDOR) on Refunds

### What was wrong
`POST /api/payments/refund` ([server/routes/paymentRoutes.js:288-306](file:///c:/Users/ENOVO/Downloads/KiranaWala-main/KiranaWala-main/server/routes/paymentRoutes.js#L288-L306)) verified that the caller had the `store-owner` role, but `PaymentService.processRefund({ orderId })` fetched `Order.findById(orderId)` without checking if the store owner owned the store associated with the order. Any authenticated merchant could issue full or partial refunds on any other store's orders across the platform.

### How it was reproduced
Store Owner B (owner of Store B) submitted a `POST /api/payments/refund` with the `orderId` of a paid order belonging to Store A. The endpoint processed the refund, updated the order status to `refunded`, and returned HTTP 200.

### What changed
1. **Query-Level Store Ownership Check:** In [server/routes/paymentRoutes.js](file:///c:/Users/ENOVO/Downloads/KiranaWala-main/KiranaWala-main/server/routes/paymentRoutes.js#L288-L315), when `req.user.role === "store-owner"`, the user's store is resolved (`Store.findOne({ owner: userId })`) and `storeId` is passed into `PaymentService.processRefund({ orderId, storeId })`.
2. In [server/services/paymentService.js:393-410](file:///c:/Users/ENOVO/Downloads/KiranaWala-main/KiranaWala-main/server/services/paymentService.js#L393-L410), `Order.findOne(query)` executes with `{ _id: orderId, store: storeId }`. If the store does not match, the query returns `null` and throws `"Order not found or unauthorized"`, returning HTTP 400/404.
3. **State Validity Guard:** Added check to ensure the order is in a legitimate refundable state (must have `paymentStatus: "paid" | "captured"`, and cannot be in status `"refunded"`, `"refund_pending"`, or `"cancelled"`).

### Tests Added
Suite: `server/__tests__/payment.refund.security.test.js`
- `1. Unauthenticated request to POST /api/payments/refund is rejected with 401`
- `2. Customer role attempting to call POST /api/payments/refund is rejected with 403`
- `3. Store Owner B (unrelated merchant) refunding Store A's order must be REJECTED (IDOR Protection)`
- `4. Rightful Store Owner A CAN refund Store A's paid order`
- `5. Attempting to refund an unpaid order is rejected`

---

## 3. Vulnerability 3: Delivery Status Transition IDOR (`PATCH /api/delivery/orders/:id/status`)

### What was wrong
In [server/routes/deliveryRoutes.js:157-190](file:///c:/Users/ENOVO/Downloads/KiranaWala-main/KiranaWala-main/server/routes/deliveryRoutes.js#L157-L190), the status advancement route allowed any user with a `store-owner` or `delivery-partner` role to advance status on **any** order across the platform:
- An unrelated Store Owner B could advance stages on Store A's orders.
- An unassigned delivery runner could advance stages on orders assigned to another runner.
- Non-owners were receiving 200 or 403 instead of 404.

### How it was reproduced
1. Wrote `server/__tests__/delivery.status.security.test.js`.
2. Proved that Store Owner B advancing Store A's order succeeded (200).
3. Proved that an unassigned runner advancing an order was not rejected with 404.
4. Proved that unauthenticated requests return 401.

### What changed
1. **Query-Level Scoping:** Replaced `Order.findById(id)` with a scoped query `Order.findOne(orderQuery)`:
   - **Store Owner:** Filter scoped to `{ _id: id, store: store._id }`.
   - **Delivery Partner:** Filter scoped to `{ _id: id, deliveryPartner: userId }`.
   - **Admin:** Filter scoped to `{ _id: id }`.
   - **Non-owner / Unassigned:** Returns `404 Not Found` (`"Order not found or not assigned to you"`).

### Tests Added
Suite: `server/__tests__/delivery.status.security.test.js`
- `1. Unauthenticated request to PATCH /api/delivery/orders/:id/status returns 401`
- `2. Store Owner B advancing Store A's order is rejected with 404 (IDOR Protection)`
- `3. Delivery runner not assigned to order is rejected with 404 (IDOR Protection)`
- `4. Rightful Store Owner A CAN advance order status from confirmed to packing`
- `5. Assigned delivery runner CAN advance order status from assigned to picked_up`

---

## 4. Vulnerability 4: Double-Refund Concurrency Race Condition

### What was wrong
In [server/services/paymentService.js:390-455](file:///c:/Users/ENOVO/Downloads/KiranaWala-main/KiranaWala-main/server/services/paymentService.js#L390-L455), the refund flow executed a read-then-write pattern (`Order.findOne` -> `provider.processRefund` -> `order.save()`). When multiple simultaneous refund requests arrived for the same paid order:
- All concurrent requests read `paymentStatus: "paid"`.
- All requests invoked the Razorpay API / payment provider simultaneously.
- Result: **Multiple refunds issued at the payment provider for a single paid order**, draining merchant funds.

### How it was reproduced
1. Wrote `server/__tests__/payment.concurrency.test.js` with a mocked Razorpay provider that counts invocations and adds a 20ms network hop latency.
2. Fired 10 simultaneous refund requests via `Promise.all` for the same paid order.
3. Current code failed assertion: `Expected: 1 provider call, Received: 10 calls`.

### What changed
1. **Atomic Conditional Claim Lock:** Before calling the payment provider, the service atomically claims the order:
   ```javascript
   const claimFilter = {
     _id: orderId,
     paymentStatus: { $in: ["paid", "captured"] },
     status: { $nin: ["refunded", "refund_pending", "cancelled"] },
   };
   if (storeId) claimFilter.store = storeId;

   const order = await Order.findOneAndUpdate(
     claimFilter,
     {
       $set: { paymentStatus: "refund_pending", status: "refund_pending" },
       $push: { timeline: { status: "refund_pending", note: `Refund initiated. Reason: ${reason}` } }
     },
     { new: true }
   );
   ```
2. **Definite Error Rollback:** If provider returns a definitive error, atomically reverts `paymentStatus: "paid"` and `status: "confirmed"`.
3. **Ambiguous / Timeout Handling:** If provider times out or experiences network failure, leaves order in `refund_pending` with a clearly marked comment: `// TODO: Reconciliation job will verify final status from Razorpay API/webhook`.
4. **Success Transition:** Upon provider success, conditionally transitions from `refund_pending` to `paymentStatus: "refunded"` and restores product inventory.

### Verification
- `server/__tests__/payment.concurrency.test.js`: Passed with 1 provider call, 1 success (200), 9 rejected (400).
- **Non-Flakiness Loop:** Executed 20 consecutive runs in a loop: **20/20 runs passed with 0 failures**.

---

## 5. Test Suite Corrections (`server/__tests__/store.auth.test.js`)

### What was wrong
Tests in `server/__tests__/store.auth.test.js` at lines ~148 and ~169 expected HTTP 403 for invalid and expired JWTs. However, RFC 6750 and the application's `authMiddleware.js` return HTTP 401 for unauthenticated/invalid/expired credentials.

### Frontend Dependency Grep Analysis
- Grepped `src/app` for any references to `403` or status code branches.
- **Finding:** No frontend logic depends on 403 meaning an invalid or expired token. Frontend components (`src/app/store-owner/dashboard/page.tsx`, `src/app/customer/orders/page.tsx`, `src/app/customer/dashboard/page.tsx`) uniformly check `res.status === 401` to trigger session expiration and redirect to login.

### What changed
- Updated `store.auth.test.js` line 148 (invalid JWT) from `toBe(403)` to `toBe(401)`.
- Updated `store.auth.test.js` line 169 (expired JWT) from `toBe(403)` to `toBe(401)`.
- Kept line 185 verifying that a valid customer JWT attempting store-owner operations gets HTTP 403 (`requireStoreOwner`).

---

## 6. Vulnerability 5: Delivery OTP Validation Bypass & Atomic Rate Limiting

### What was wrong
1. In `server/routes/deliveryRoutes.js:206-213`, `if (order.deliveryOtp && otp && order.deliveryOtp.trim() !== otp.toString().trim())` allowed skipping OTP verification entirely if `otp` was omitted in the request body.
2. OTP comparison used string inequality `!==` instead of constant-time comparison.
3. There was no attempt counter or rate limiting against brute-forcing 4-digit OTPs (1,000 to 9,999 combinations).
4. `customerRoutes.js:1012` used `Math.floor(1000 + Math.random() * 9000).toString()` (predictable PRNG).

### How it was reproduced
1. Wrote `server/__tests__/delivery.otp.test.js`.
2. Proved marking order delivered without `otp` succeeded (200).
3. Proved making >5 wrong OTP guesses was not rate-limited.

### What changed
1. **Mandatory OTP Requirement:** When `order.deliveryOtp` exists, `otp` is strictly required to mark status as `delivered`.
2. **Cryptographic OTP Generation:** Updated `customerRoutes.js:1013` to generate OTPs using `crypto.randomInt(1000, 10000).toString()`.
3. **Constant-Time Comparison:** Implemented `verifyOtpTimingSafe` using `crypto.timingSafeEqual` with length mismatch handling.
4. **Atomic Attempt Tracking & Lockout:** Added `otpAttempts` and `otpLockedUntil` fields to `orderSchema`. Atomically increments `otpAttempts` using `$inc` in `Order.findOneAndUpdate`. Upon 5 failed attempts, sets a 15-minute lockout (`otpLockedUntil`), rejecting subsequent verification attempts with HTTP 429.

### Tests Added
Suite: `server/__tests__/delivery.otp.test.js`
- `(i) Marking order delivered WITHOUT otp field must be rejected (400) when order has deliveryOtp`
- `(ii) Marking order delivered with WRONG OTP must be rejected (400)`
- `(iii) After 5 wrong OTP attempts on the same order, further attempts are rejected with 429 even with the correct OTP`
- `(iv) Marking order delivered with CORRECT OTP succeeds (200)`

---

## 7. Vulnerability 6: Razorpay Webhook Fail-Closed Security

### What was wrong
In `server/routes/paymentRoutes.js:126-141`, `if (webhookSecret && signature)` meant:
1. If `RAZORPAY_WEBHOOK_SECRET` was unconfigured in environment, signature verification was skipped entirely and unsigned spoofed webhooks were processed (**FAIL-OPEN**).
2. If `x-razorpay-signature` header was missing, signature verification was skipped entirely (**FAIL-OPEN**).
3. Signature comparison used `expectedSig !== signature` (not timing-safe).

### How it was reproduced
1. Wrote `server/__tests__/payment.webhook.security.test.js`.
2. Proved webhook without `x-razorpay-signature` returned HTTP 200 and marked order as paid.
3. Proved webhook with unset secret returned HTTP 200 and marked order as paid.

### What changed
1. **Fail-Closed Secret Check:** If `RAZORPAY_WEBHOOK_SECRET` is unset, rejects with HTTP 500 (`"Webhook secret not configured on server"`).
2. **Mandatory Signature Header:** If `x-razorpay-signature` is missing, rejects with HTTP 400 (`"Missing x-razorpay-signature header"`).
3. **Timing-Safe Verification:** Compares HMAC-SHA256 signature using `crypto.timingSafeEqual`.

### Tests Added
Suite: `server/__tests__/payment.webhook.security.test.js`
- `1. Missing x-razorpay-signature header is REJECTED (400 or 401)`
- `2. Invalid/wrong x-razorpay-signature header is REJECTED (400 or 401)`
- `3. When RAZORPAY_WEBHOOK_SECRET is UNSET in env, reject EVERYTHING (Fail-Closed, never accept unsigned events)`
- `4. Valid HMAC-SHA256 signature over the payload is ACCEPTED and processes the event`

---

## 8. Role Escalation Security Audit & Tests

### Architecture Findings
- Public registration endpoints (`POST /api/customer/register` and `POST /api/store/register`) hardcode user roles (`role: "customer"` and `role: "store-owner"`).
- `admin` and `delivery-partner` accounts are created exclusively via backend administrative seed scripts (`server/scripts/seedDemoData.js:513-538`) or direct DB access.

### Tests Added
Suite: `server/__tests__/auth.registration.security.test.js`
- `POST /api/customer/register — role='admin' -> created role is 'customer'`
- `POST /api/customer/register — role='delivery-partner' -> created role is 'customer'`
- `POST /api/customer/register — role='store-owner' -> created role is 'customer'`
- `POST /api/store/register — role='admin' -> created role is 'store-owner'`
- `POST /api/store/register — role='delivery-partner' -> created role is 'store-owner'`

---

## 9. Final Verification Summary

- **Total Test Suites:** **23 passed, 23 total**.
- **Total Tests:** **225 passed, 225 total**.
- **Failing Tests:** **0 failing**.
