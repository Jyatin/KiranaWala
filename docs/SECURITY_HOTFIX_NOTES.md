# Security Hotfix Notes: KiranaWala

**Date:** October 4, 2026  
**Scope:** Strict minimal hotfixes for confirmed security vulnerabilities in Order Tracking OTP Leak and Refund IDOR.

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

## 3. Test Suite Verification Summary

- **Before Hotfixes:** 17 suites, 200 tests (198 passed, 2 failed in `store.auth.test.js`).
- **After Hotfixes:** 19 suites, 210 tests (208 passed, 2 failed in `store.auth.test.js`).
- **Regression Check:** All 198 previously passing tests continue to pass with 0 regressions.
