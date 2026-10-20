# 📡 KiranaWala REST API Reference

This document provides a comprehensive technical reference for the REST API endpoints in the KiranaWala backend (`/api/*`).

---

## 🔐 Authentication & Headers

Protected routes require a standard Bearer token in the `Authorization` HTTP header:

```http
Authorization: Bearer <JWT_TOKEN>
```

Tokens are signed server-side using HS256 with secrets managed by `server/config/jwt.js`. Standard token lifespan is 24 hours.

---

## 1. Customer Endpoints (`/api/customer`)

### `POST /api/customer/register`
Creates a new customer account.
- **Auth:** Public (Rate-limited: 20 req/15 min)
- **Request Body:**
  ```json
  {
    "username": "Priya Sharma",
    "email": "priya@example.com",
    "password": "SecurePassword123!",
    "phone": "+919876543210"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": {
      "_id": "60d0fe4f5311236168a109ca",
      "username": "Priya Sharma",
      "email": "priya@example.com",
      "role": "customer"
    }
  }
  ```

### `POST /api/customer/login`
Authenticates an existing customer. Returns generic 401 on non-existent email or wrong password to prevent user enumeration.
- **Auth:** Public (Rate-limited: 20 req/15 min)
- **Request Body:**
  ```json
  {
    "email": "priya@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": {
      "_id": "60d0fe4f5311236168a109ca",
      "username": "Priya Sharma",
      "email": "priya@example.com",
      "role": "customer"
    }
  }
  ```

### `GET /api/customer/stores`
Retrieves list of stores. ReDoS-safe search query escaping applied. Merchant personal data (`email`, `phone`, `password`) is stripped from public projections.
- **Auth:** Public
- **Query Parameters:**
  - `search` (string, optional): Search keyword.
  - `category` (string, optional): Store category filter.
  - `area` (string, optional): Locality/neighborhood name.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 16,
    "stores": [
      {
        "_id": "60d0fe4f5311236168a109cb",
        "name": "Gupta Daily Needs",
        "category": "Kirana & Grocery",
        "address": "Shop 4, Main Market, Indirapuram",
        "owner": {
          "_id": "60d0fe4f5311236168a109cc",
          "username": "gupta_store"
        }
      }
    ]
  }
  ```

### `GET /api/customer/stores/:storeId`
Fetches a single store by its MongoDB ObjectId.
- **Auth:** Public
- **Response (200 OK):** Returns store object with public owner profile.

### `GET /api/customer/products`
Retrieves products across stores or filtered by store/category.
- **Auth:** Public
- **Query Parameters:**
  - `store` (string, optional): Filter by store ObjectId.
  - `category` (string, optional): Product category.
  - `search` (string, optional): Regex-sanitized product name/description keyword.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "products": [
      {
        "_id": "60d0fe4f5311236168a109cd",
        "name": "Aashirvaad Shudh Chakki Atta 5kg",
        "price": 245,
        "category": "Flours & Grains",
        "availableStock": 14,
        "store": "60d0fe4f5311236168a109cb"
      }
    ]
  }
  ```

### `POST /api/customer/checkout`
Initiates atomic stock reservation and creates a pending Razorpay or COD order. Enforces single-store cart constraint.
- **Auth:** Customer (`Bearer <JWT>`)
- **Request Body:**
  ```json
  {
    "items": [
      { "productId": "60d0fe4f5311236168a109cd", "quantity": 2 }
    ],
    "deliveryAddress": {
      "fullName": "Priya Sharma",
      "phone": "+919876543210",
      "address": "Flat 402, Tower B, Supertech Icon",
      "city": "Ghaziabad",
      "pincode": "201014"
    },
    "paymentMethod": "razorpay",
    "couponCode": "KIRANA50"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "order": {
      "_id": "60d0fe4f5311236168a109ce",
      "subtotal": 490,
      "deliveryFee": 30,
      "discount": 50,
      "total": 470,
      "status": "pending_payment",
      "paymentStatus": "pending",
      "razorpayOrderId": "order_EKfLwpHQBR0W6V"
    },
    "razorpayOrder": {
      "id": "order_EKfLwpHQBR0W6V",
      "amount": 47000,
      "currency": "INR"
    }
  }
  ```

### `GET /api/customer/orders`
Lists authenticated customer's past orders sorted newest first.
- **Auth:** Customer (`Bearer <JWT>`)
- **Response (200 OK):** Array of order documents.

---

## 2. Payment & Webhook Endpoints (`/api/payments`)

### `POST /api/payments/verify`
Confirms payment via client-provided Razorpay checkout payload.
- **Auth:** Authenticated User
- **Request Body:**
  ```json
  {
    "orderId": "60d0fe4f5311236168a109ce",
    "razorpayOrderId": "order_EKfLwpHQBR0W6V",
    "razorpayPaymentId": "pay_EKfM87f4QG919A",
    "razorpaySignature": "270f2f1e67cf..."
  }
  ```
- **Behavior:**
  - Verifies HMAC-SHA256 signature against `order_id|payment_id` with `crypto.timingSafeEqual`.
  - Atomically commits stock (`soldStock += qty`, `reservedStock -= qty`).
  - Transitions order to `confirmed` and paymentStatus to `paid`.

### `POST /api/payments/webhook`
Receives asynchronous payment events directly from Razorpay.
- **Auth:** Webhook HMAC (`x-razorpay-signature` HTTP header)
- **Signature Verification:**
  - Verifies 64-character hex format (`/^[a-f0-9]{64}$/i`).
  - Verifies exact length equality.
  - Verifies `crypto.timingSafeEqual` against raw request body (`req.rawBody`).
- **Events Handled:**
  - `payment.captured`: Confirms order, commits inventory, marks `paid`.
  - `payment.failed`: Records payment failure, initiates stock release.
  - `refund.processed`: Marks order `refunded`.

---

## 3. Store Owner Endpoints (`/api/store`)

### `POST /api/store/login`
Merchant login returning storeId and auth token.
- **Auth:** Public (Rate-limited)

### `GET /api/store/dashboard`
Aggregated store statistics (today's revenue, active orders, low stock items).
- **Auth:** Store Owner (`role: "store-owner"`)

### `PATCH /api/store/orders/:orderId/status`
Updates order status along permitted lifecycle paths (`confirmed` → `packing` → `ready`).
- **Auth:** Store Owner (enforces ownership: `store.owner === req.user.id`)

### `PATCH /api/store/products/:id/stock`
Adjusts inventory count for a catalog product.
- **Auth:** Store Owner

---

## 4. Delivery & Fulfillment Endpoints (`/api/delivery`)

### `GET /api/delivery/available`
Lists orders in `ready` status awaiting runner assignment.
- **Auth:** Delivery Partner (`role: "delivery-partner"`, `admin`)

### `PATCH /api/delivery/orders/:id/claim`
Atomically assigns runner to order (`status: "assigned"`).
- **Auth:** Delivery Partner

### `PATCH /api/delivery/orders/:id/status`
Updates delivery progression (`picked_up` → `out_for_delivery` → `delivered`).
- **Auth:** Delivery Partner / Store Owner
- **Special Verification on `delivered`:**
  - Requires customer `otp` in request body.
  - Verifies OTP using `verifyOtpTimingSafe` with `crypto.timingSafeEqual`.
  - Enforces 5-attempt rate limit; locks order verification for 15 minutes upon exhaustion.

### `GET /api/delivery/orders/:id/track`
Customer and runner order tracking endpoint.
- **Auth:** Authenticated User
- **Privacy Enforcement:** `deliveryOtp` is strictly concealed from store owners and delivery runners; exposed only to the ordering customer.

---

## 5. Coupon & Promotion Endpoints (`/api/coupons`)

### `POST /api/coupons/validate`
Validates coupon code against cart subtotal, customer eligibility, and usage limits.
- **Auth:** Authenticated Customer (`Bearer <JWT>`)
- **Request Body:**
  ```json
  {
    "code": "WELCOME100",
    "cartTotal": 599,
    "storeId": "60d0fe4f5311236168a109cb"
  }
  ```
- **Security Control:** Ignores any client-supplied `userId`; extracts verified user ID strictly from the authenticated token.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "coupon": {
      "code": "WELCOME100",
      "discountType": "fixed",
      "discountValue": 100,
      "calculatedDiscount": 100
    }
  }
  ```
