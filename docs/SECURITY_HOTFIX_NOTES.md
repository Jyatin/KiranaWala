# Security Hotfix Notes: KiranaWala

**Date:** October 4, 2026  
**Scope:** Strict minimal hotfixes for confirmed security vulnerabilities in Order Tracking OTP Leak, Refund IDOR, Delivery Status Transition IDOR, Double-Refund Race Condition, Auth Test Assertions, Delivery OTP Hardening, and Webhook Fail-Closed Enforcement.

---

## 1. Vulnerability 1: Unauthenticated Order Tracking Delivery OTP Leak

### What was wrong
The endpoint `GET /api/delivery/orders/:id/track` ([server/routes/deliveryRoutes.js:248-315](../server/routes/deliveryRoutes.js#L248-L315)) had no authentication middleware (`authenticateToken`). Anyone with a valid `orderId` could query the endpoint and receive:
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
4. **Frontend Integration:** Updated `fetchTracking` in [src/app/customer/orders/[id]/page.tsx:92](../src/app/customer/orders/%5Bid%5D/page.tsx#L92) to pass `Authorization: Bearer ${token}`.

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
`POST /api/payments/refund` ([server/routes/paymentRoutes.js:288-306](../server/routes/paymentRoutes.js#L288-L306)) verified that the caller had the `store-owner` role, but `PaymentService.processRefund({ orderId })` fetched `Order.findById(orderId)` without checking if the store owner owned the store associated with the order. Any authenticated merchant could issue full or partial refunds on any other store's orders across the platform.

### How it was reproduced
Store Owner B (owner of Store B) submitted a `POST /api/payments/refund` with the `orderId` of a paid order belonging to Store A. The endpoint processed the refund, updated the order status to `refunded`, and returned HTTP 200.

### What changed
1. **Query-Level Store Ownership Check:** In [server/routes/paymentRoutes.js](../server/routes/paymentRoutes.js#L288-L315), when `req.user.role === "store-owner"`, the user's store is resolved (`Store.findOne({ owner: userId })`) and `storeId` is passed into `PaymentService.processRefund({ orderId, storeId })`.
2. In [server/services/paymentService.js:393-410](../server/services/paymentService.js#L393-L410), `Order.findOne(query)` executes with `{ _id: orderId, store: storeId }`. If the store does not match, the query returns `null` and throws `"Order not found or unauthorized"`, returning HTTP 400/404.
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
In [server/routes/deliveryRoutes.js:157-190](../server/routes/deliveryRoutes.js#L157-L190), the status advancement route allowed any user with a `store-owner` or `delivery-partner` role to advance status on **any** order across the platform:
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
In [server/services/paymentService.js:390-455](../server/services/paymentService.js#L390-L455), the refund flow executed a read-then-write pattern (`Order.findOne` -> `provider.processRefund` -> `order.save()`). When multiple simultaneous refund requests arrived for the same paid order:
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

---

## 9. Vulnerability 7: Webhook Raw Wire Bytes HMAC Verification

### What was wrong
In `server/routes/paymentRoutes.js:133-145`, when incoming webhook payloads were parsed by standard Express `express.json()` middleware, the route attempted to reconstruct raw bytes using `JSON.stringify(req.body)`. When incoming payloads contained formatted whitespace, unicode escapes (e.g. `\u20b9`), or escaped slashes (`\/`), JSON re-serialization altered the raw character sequence. As a result, valid HMAC-SHA256 signatures computed over the exact wire bytes were rejected.

### How it was reproduced
1. Wrote `server/__tests__/payment.webhook.rawbody.test.js`.
2. Sent valid webhooks containing `\u20b9` and formatted whitespace signed over the wire bytes.
3. Proved that `JSON.stringify(req.body)` generated an HMAC signature mismatch (400) against current code.

### What changed
1. In `server/server.js:28`, configured `express.json` with a `verify` callback to capture the raw wire buffer on `req.rawBody`:
   ```javascript
   app.use(
     express.json({
       verify: (req, res, buf) => {
         req.rawBody = buf;
       },
     })
   );
   ```
2. In `server/routes/paymentRoutes.js:133-145`, updated HMAC calculation to compute over `req.rawBody` directly while preserving parsed `req.body` for event dispatching:
   ```javascript
   const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body)));
   const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString("utf8")) : req.body;
   ```

### Tests Added
Suite: `server/__tests__/payment.webhook.rawbody.test.js`
- `Webhook payload with whitespace, unicode escapes (\u20b9), and slashes must be verified over exact wire bytes`
- `Webhook payload with one single character tampered must be rejected (400)`

---

## 10. Vulnerability 8: Delivery OTP Exposure in Runner & Merchant Order Queries

### What was wrong
Endpoints querying order lists (`GET /api/delivery/orders` for delivery runners and `GET /api/store/orders` / `GET /api/store/orders/:orderId` for store owners) returned the full `Order` document, including `deliveryOtp`. Delivery runners and merchants could view the customer's delivery OTP before physical delivery occurred, defeating the proof-of-delivery verification mechanism.

### How it was reproduced
1. Wrote `server/__tests__/delivery.otp.exposure.test.js`.
2. Demonstrated that `GET /api/delivery/orders`, `GET /api/store/orders`, and `GET /api/store/orders/:orderId` contained `deliveryOtp` in responses.

### What changed
1. In `server/models/order.js:117`, added `select: false` to the `deliveryOtp` schema definition:
   ```javascript
   deliveryOtp: { type: String, default: "4291", select: false }
   ```
2. In `server/routes/customerRoutes.js:1101, 1120`, explicitly added `.select("+deliveryOtp")` for the authenticated owning customer's order queries (`GET /api/customer/orders` and `GET /api/customer/orders/:orderId`).
3. In `server/routes/deliveryRoutes.js:204, 354`, explicitly added `.select("+deliveryOtp")` where OTP verification and customer tracking take place.
4. Merchant and runner order queries omit `deliveryOtp` by default.

### Tests Added
Suite: `server/__tests__/delivery.otp.exposure.test.js`
- `1. GET /api/delivery/orders as assigned runner must NOT expose deliveryOtp anywhere in the response`
- `2. GET /api/store/orders as owning store owner must NOT expose deliveryOtp anywhere in the response`
- `3. GET /api/store/orders/:orderId as owning store owner must NOT expose deliveryOtp anywhere in the response`
- `4. GET /api/customer/orders as owning customer MUST contain deliveryOtp`
- `5. GET /api/customer/orders/:orderId as owning customer MUST contain deliveryOtp`

---

## 11. Vulnerability 9: Seed Script Environment Safety Guards

### What was wrong
`server/scripts/seedDemoData.js` lacked safety checks preventing execution against production environments or remote database clusters. Accidental execution could overwrite demo credentials and catalog data in live production deployments.

### What changed
1. In `server/scripts/seedDemoData.js`, implemented `validateSeedEnvironment()`:
   - Refuses to run when `NODE_ENV === "production"`.
   - Refuses to run when `MONGO_URI` does not point to `localhost`, `127.0.0.1`, or `mongodb-memory-server`.
   - Requires explicit `ALLOW_SEED_REMOTE=true` environment variable to override for intentional staging runs.
   - Throws clear error and blocks DB connection if safety checks fail.

### Tests Added
Suite: `server/__tests__/seed.safety.test.js`
- `1. Refuses to run when NODE_ENV is production`
- `2. Refuses to run when MONGO_URI points to remote database`
- `3. Allows execution when ALLOW_SEED_REMOTE=true even in production`
- `4. Allows execution in development with localhost, 127.0.0.1, or mongodb-memory-server`
- `5. seedData() throws when safety check fails`

---

## 12. Vulnerability 10: Refund State Restoration & Inventory Gating

### What was wrong
1. **Status Clobbering on Provider Error:** In `PaymentService.processRefund`, when claiming an order, `{ new: true }` was used. On definite provider error, the order status was hardcoded to `status: "confirmed"`. Orders previously in `"packing"`, `"ready"`, or `"out_for_delivery"` were clobbered to `"confirmed"`.
2. **Post-Dispatch Stock Restoration Bug:** Successful refunds restored inventory (`availableStock += quantity`, `soldStock -= quantity`) unconditionally. When a customer was refunded for an order already picked up, out for delivery, or delivered, inventory was erroneously incremented even though physical goods had left the store.
3. **Double Inventory Restoration:** In concurrent refund attempts, stock restoration could run multiple times if not gated on the atomic state transition.

### How it was reproduced
1. Wrote `server/__tests__/payment.refund.correctness.test.js`.
2. Demonstrated that definite provider error changed order in `"packing"` / `"out_for_delivery"` to `"confirmed"`.
3. Demonstrated that refunding an order in `"picked_up"`, `"out_for_delivery"`, or `"delivered"` increased stock.

### What changed
1. **Atomic Snapshot of Original State:** In `PaymentService.processRefund`, used `{ new: false }` on the atomic claim `Order.findOneAndUpdate(claimFilter, { $set: { paymentStatus: "refund_pending", status: "refund_pending" } }, { new: false })` to capture `originalStatus` and `originalPaymentStatus`.
2. **Exact State Restoration on Definite Provider Error:**
   ```javascript
   $set: {
     paymentStatus: originalPaymentStatus,
     status: originalStatus,
   }
   ```
3. **Pre-Dispatch Inventory Gating:**
   ```javascript
   const PRE_DISPATCH_STATUSES = [
     "placed",
     "confirmed",
     "packing",
     "ready",
     "processing",
     "assigned",
   ];

   if (refundedOrder && PRE_DISPATCH_STATUSES.includes(originalStatus)) {
     for (const item of order.items) {
       if (item.product) {
         await Product.updateOne(
           { _id: item.product },
           { $inc: { availableStock: item.quantity, soldStock: -item.quantity } }
         );
       }
     }
   }
   ```
   Post-dispatch refunds succeed financially without corrupting physical store inventory.

### Tests Added
Suite: `server/__tests__/payment.refund.correctness.test.js`
- `1. On a definite provider error, the order's ORIGINAL status and paymentStatus are restored (packing and out_for_delivery)`
- `2. Successful refund on post-dispatch orders (picked_up, out_for_delivery, delivered) does NOT restore inventory`
- `3. Successful refund on pre-dispatch order (placed/confirmed/packing/ready) DOES restore inventory exactly once even with 10 concurrent requests`

---

## 13. Audit of Distinct Order Status and Payment Status Values

| Field | Distinct Values Used | Schema Enum | Assignment Locations / Codepaths | Overlaps & Semantic Notes |
|---|---|---|---|---|
| `Order.paymentStatus` | `pending` | Yes | `customerRoutes.js:1042`, schema default | Initial status for COD and uncaptured online payments |
| `Order.paymentStatus` | `paid` | Yes | `paymentService.js:314`, `paymentRoutes.js:173`, `paymentRoutes.js:90` | Verified online payment or webhook capture |
| `Order.paymentStatus` | `failed` | Yes | `paymentService.js:368`, `paymentRoutes.js:194` | Failed payment attempt |
| `Order.paymentStatus` | `refund_pending` | Yes | `paymentService.js:415`, `paymentRoutes.js:211` | In-flight refund claim lock |
| `Order.paymentStatus` | `refunded` | Yes | `paymentService.js:491`, `paymentRoutes.js:232` | Completed refund |
| `Order.paymentStatus` | `captured` | **No** (Enum mismatch) | `paymentService.js:206, 281, 361, 404`, `paymentRoutes.js:171, 192` | Checked conditionally as synonym for `paid`, but schema stores `paid` |
| `Order.status` | `pending_payment` | Yes | `customerRoutes.js:1043` | Awaiting Razorpay checkout completion |
| `Order.status` | `placed` | Yes | `customerRoutes.js:1043`, schema default | Order placed by customer (pre-dispatch) |
| `Order.status` | `confirmed` | Yes | `storeRoutes.js:489`, `paymentService.js:315` | Merchant accepted order (pre-dispatch) |
| `Order.status` | `processing` | Yes | `order.js:136` | **Overlap**: Synonym for `confirmed`/`packing` in legacy views |
| `Order.status` | `packing` | Yes | `storeRoutes.js:489` | Store packing grocery items (pre-dispatch) |
| `Order.status` | `ready` | Yes | `storeRoutes.js:489` | Items packed, awaiting runner pickup (pre-dispatch) |
| `Order.status` | `assigned` | Yes | `deliveryRoutes.js:114` | Delivery partner accepted task (pre-dispatch) |
| `Order.status` | `picked_up` | Yes | `deliveryRoutes.js:171` | Runner collected items from store (post-dispatch) |
| `Order.status` | `out_for_delivery`| Yes | `deliveryRoutes.js:171` | Runner en route to customer (post-dispatch) |
| `Order.status` | `delivered` | Yes | `deliveryRoutes.js:171` | Verified delivered with customer OTP (post-dispatch) |
| `Order.status` | `completed` | Yes | `order.js:137` | **Overlap**: Synonym for `delivered` |
| `Order.status` | `payment_failed` | Yes | `paymentService.js:369`, `paymentRoutes.js:195` | Checkout failure |
| `Order.status` | `cancelled` | Yes | `customerRoutes.js:1162`, `deliveryRoutes.js:171` | Cancelled before delivery |
| `Order.status` | `refund_pending` | Yes | `paymentService.js:416`, `paymentRoutes.js:212` | In-flight refund claim lock |
| `Order.status` | `refunded` | Yes | `paymentService.js:492`, `paymentRoutes.js:233` | Refund completed |

---

---

## 15. Vulnerability 11: Removal of Delivery OTP Default & Fail-Closed Delivery Check

### What was wrong
1. In `server/models/order.js:117`, `deliveryOtp` had a schema default of `"4291"`. Any order document created without an explicit OTP was silently assigned `"4291"`.
2. In `server/routes/deliveryRoutes.js:220`, `if (status === "delivered" && order.deliveryOtp)` checked for `order.deliveryOtp`. If an order reached `"delivered"` with no OTP configured, the entire verification check was skipped, marking the order as delivered without OTP confirmation.

### What changed
1. Removed `default: "4291"` from `Order.deliveryOtp` in `server/models/order.js:117`.
2. In `server/routes/deliveryRoutes.js:220`, enforced fail-closed behavior:
   ```javascript
   if (status === "delivered") {
     if (!order.deliveryOtp) {
       return res.status(400).json({
         success: false,
         message: "Order cannot be marked delivered without a valid delivery OTP configuration",
       });
     }
   ```

### Tests Added
Suite: `server/__tests__/delivery.otp.test.js`
- `(v) An order with no deliveryOtp configured CANNOT be marked delivered and is rejected (fail-closed)`

---

## 16. Vulnerability 12: Seed Guard Hostname Parsing

### What was wrong
`validateSeedEnvironment()` in `server/scripts/seedDemoData.js` used simple substring checks (`mongoUri.includes("localhost")`). Attackers or misconfigurations using spoofed URIs like `mongodb+srv://localhost.example.com/db` or `mongodb://user:localhost@db.example.com/db` could bypass the local-only check.

### What changed
1. Implemented robust host extraction parsing protocol, authentication credentials, and connection options.
2. Extracted host list and verified that every host belongs to `ALLOWED_LOCAL_HOSTS = Set(["localhost", "127.0.0.1", "::1", "mongodb-memory-server"])`.

### Tests Added
Suite: `server/__tests__/seed.safety.test.js`
- `6. Refuses spoofed subdomain host (mongodb+srv://localhost.example.com/db)`
- `7. Refuses spoofed auth username (mongodb://user:localhost@db.example.com/db)`
- `8. Allows legitimate local connection strings (mongodb://localhost:27017/db, ::1)`

---

## 17. Vulnerability 13: Webhook Dead Code Cleanup & Strict Raw Body Requirement

### What was wrong
`server/routes/paymentRoutes.js:133-145` contained dead fallbacks (`Buffer.isBuffer(req.body)` and `Buffer.from(...)`). If `req.rawBody` was missing (e.g. non-JSON content-type), unhandled parsing resulted in runtime exceptions caught by generic 200 error handlers.

### What changed
1. Removed dead `Buffer.isBuffer` and `express.raw` fallback code.
2. Replaced with explicit fail-closed check: if `!req.rawBody`, immediately reject with HTTP 400 (`"Missing raw request body or unsupported content type"`).

### Tests Added
Suite: `server/__tests__/payment.webhook.rawbody.test.js`
- `Webhook request with non-JSON content-type (or missing req.rawBody) is REJECTED with 400`

---

## 18. Final Verification Summary

- **Total Test Suites:** **28 passed, 28 total**.
- **Total Tests:** **249 passed, 249 total**.
- **Failing Tests:** **0 failing**.
- **Regressions:** **0**.

