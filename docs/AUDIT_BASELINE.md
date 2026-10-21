# KiranaWala Backend Technical Audit & Baseline Report

**Audit Date:** October 4, 2026  
**Auditor:** Senior Backend Systems Engineer  
**Scope:** Read-only architectural audit, code-level vulnerability assessment, test suite verification, and live database query plan baseline measurements.  
**Repository Working Directory:** `c:/Users/ENOVO/Downloads/KiranaWala-main/KiranaWala-main`  

---

## 1. Repo Map

### 1.1 Git Branches
Command executed: `git branch -a`
- `main` (active local branch, commit `9438b2d`)
- `verified-pre-reconciliation` (local tracking branch)
- `remotes/origin/HEAD -> origin/main`
- `remotes/origin/main`
- `remotes/origin/feature/smart-search-rag`

### 1.2 Directory Structure (excluding node_modules)
```text
KiranaWala-main/
├── .github/
│   └── workflows/
│       ├── lint.yml
│       └── node.js.yml
├── .gitignore
├── CLAUDE.md
├── QA_REPORT.md
├── README.md
├── TEST_CASES.md
├── docker-compose.yml
├── docs/
│   ├── AUDIT_BASELINE.md (this document)
│   ├── klarna-design-study.md
│   └── klarna-shopping-study.md
├── frontend-rebuild-notes.md
├── memory.md
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── public/
│   ├── css/styles.css
│   ├── images/
│   ├── js/ (entry.js, entry-3d.js, kw-ai-assistant.js, kw-ui-engine.js)
│   └── videos/
├── scripts/ (brandMobileHero.js, createFloatingHero.js, makeCustomerScene.js)
├── server/
│   ├── __tests__/ (17 test suites)
│   ├── devServerWithMemoryDb.js
│   ├── eslint.config.mjs
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/ (11 Mongoose model definitions)
│   ├── package-lock.json
│   ├── package.json
│   ├── routes/ (9 Express route modules)
│   ├── scripts/
│   │   └── seedDemoData.js
│   ├── server.js
│   └── services/
│       ├── ai/ (aiIntentBasket.js, aiPrompts.js, aiProviderAdapter.js, aiService.js, aiTools.js)
│       ├── couponService.js
│       ├── inventoryService.js
│       └── paymentService.js
├── src/ (Next.js 16 App Router UI)
│   ├── app/ (17 route pages, layouts, globals.css)
│   ├── components/ (auth, discover, features, footer, hero, navigation, shop, ui)
│   ├── hooks/
│   ├── lib/
│   ├── middleware.ts
│   └── styles/
├── tsconfig.json
└── views/ (Legacy static HTML/JS views for customer & store-owner)
```

### 1.3 Server & Frontend Entry Points & Legacy Views Status
- **Server Entry Point:** [server/server.js](../server/server.js#L1-L241) (starts Express server on port 3000) and [server/devServerWithMemoryDb.js](../server/devServerWithMemoryDb.js#L1-L56) (starts in-memory Mongo on 27017, seeds catalog, and spawns server).
- **Frontend Entry Point:** [src/app/layout.tsx](../src/app/layout.tsx) and [src/app/page.tsx](../src/app/page.tsx) (Next.js 16 App Router with React 19, Tailwind CSS, TypeScript).
- **Legacy Frontend in `views/` and `public/js/`:**
  - **Status:** **SUPERSEDED BUT STILL SERVED AS FALLBACK**.
  - In [server/server.js](../server/server.js#L30-L35) and lines 145–203, Express still statically serves `public/` and `views/` and binds page routes (`/`, `/customer/login`, etc.) to `res.sendFile(path.join(__dirname, "../views/...html"))`.
  - When running via Next.js ([next.config.ts](../next.config.ts#L18-L35)), all user traffic hits Next.js React pages, and Next.js proxies `/api/*` to the Express backend. The HTML files in `views/` and vanilla scripts in `public/js/` (e.g. `kw-ui-engine.js`) are legacy artifacts not utilized by the React frontend, though static images/videos in `public/images/` and `public/videos/` are actively used.

---

### 1.4 Express Route Inventory

| HTTP Method | Route Path | Middlewares | Handler File & Lines |
|---|---|---|---|
| `POST` | `/api/customer/register` | None | [server/routes/customerRoutes.js:16-33](../server/routes/customerRoutes.js#L16-L33) |
| `POST` | `/api/customer/login` | None | [server/routes/customerRoutes.js:36-69](../server/routes/customerRoutes.js#L36-L69) |
| `GET` | `/api/customer/me` | `authenticateToken`, `requireCustomer` | [server/routes/customerRoutes.js:72-86](../server/routes/customerRoutes.js#L72-L86) |
| `GET` | `/api/customer/stores/nearby` | None | [server/routes/customerRoutes.js:89-143](../server/routes/customerRoutes.js#L89-L143) |
| `GET` | `/api/customer/stores` | None | [server/routes/customerRoutes.js:146-183](../server/routes/customerRoutes.js#L146-L183) |
| `GET` | `/api/customer/stores/:storeId` | None | [server/routes/customerRoutes.js:186-211](../server/routes/customerRoutes.js#L186-L211) |
| `GET` | `/api/customer/stores/:storeId/products` | None | [server/routes/customerRoutes.js:214-244](../server/routes/customerRoutes.js#L214-L244) |
| `GET` | `/api/customer/products/compare` | None | [server/routes/customerRoutes.js:357-414](../server/routes/customerRoutes.js#L357-L414) |
| `GET` | `/api/customer/cart` | `authenticateToken`, `requireCustomer` | [server/routes/customerRoutes.js:421-480](../server/routes/customerRoutes.js#L421-L480) |
| `POST` | `/api/customer/cart/items` | `authenticateToken`, `requireCustomer` | [server/routes/customerRoutes.js:483-577](../server/routes/customerRoutes.js#L483-L577) |
| `PATCH` | `/api/customer/cart/items/:productId` | `authenticateToken`, `requireCustomer` | [server/routes/customerRoutes.js:580-650](../server/routes/customerRoutes.js#L580-L650) |
| `DELETE` | `/api/customer/cart/items/:productId` | `authenticateToken`, `requireCustomer` | [server/routes/customerRoutes.js:652-676](../server/routes/customerRoutes.js#L652-L676) |
| `DELETE` | `/api/customer/cart` | `authenticateToken`, `requireCustomer` | [server/routes/customerRoutes.js:679-692](../server/routes/customerRoutes.js#L679-L692) |
| `POST` | `/api/customer/cart/basket` | `authenticateToken`, `requireCustomer` | [server/routes/customerRoutes.js:695-821](../server/routes/customerRoutes.js#L695-L821) |
| `GET` | `/api/customer/cart/smart-optimization` | `authenticateToken`, `requireCustomer` | [server/routes/customerRoutes.js:828-897](../server/routes/customerRoutes.js#L828-L897) |
| `POST` | `/api/customer/orders` | `authenticateToken`, `requireCustomer` | [server/routes/customerRoutes.js:900-1093](../server/routes/customerRoutes.js#L900-L1093) |
| `GET` | `/api/customer/orders` | `authenticateToken`, `requireCustomer` | [server/routes/customerRoutes.js:1097-1107](../server/routes/customerRoutes.js#L1097-L1107) |
| `GET` | `/api/customer/orders/:orderId` | `authenticateToken`, `requireCustomer` | [server/routes/customerRoutes.js:1110-1132](../server/routes/customerRoutes.js#L1110-L1132) |
| `PATCH` | `/api/customer/orders/:orderId/cancel` | `authenticateToken`, `requireCustomer` | [server/routes/customerRoutes.js:1135-1197](../server/routes/customerRoutes.js#L1135-L1197) |
| `POST` | `/api/customer/ai/chat` | `authenticateToken`, `requireCustomer`, `aiRateLimiter` | [server/routes/aiRoutes.js:143-213](../server/routes/aiRoutes.js#L143-L213) |
| `POST` | `/api/store/register` (also `/api/store-owner/register`) | None | [server/routes/storeRoutes.js:17-100](../server/routes/storeRoutes.js#L17-L100) |
| `POST` | `/api/store/login` (also `/api/store-owner/login`) | None | [server/routes/storeRoutes.js:103-147](../server/routes/storeRoutes.js#L103-L147) |
| `POST` | `/api/store/products` | `authenticateToken`, `requireStoreOwner` | [server/routes/storeRoutes.js:150-205](../server/routes/storeRoutes.js#L150-L205) |
| `GET` | `/api/store/products/:storeId` | None | [server/routes/storeRoutes.js:208-217](../server/routes/storeRoutes.js#L208-L217) |
| `PUT` | `/api/store/products/:productId` | `authenticateToken`, `requireStoreOwner` | [server/routes/storeRoutes.js:220-267](../server/routes/storeRoutes.js#L220-L267) |
| `DELETE` | `/api/store/products/:productId/:storeId` | `authenticateToken`, `requireStoreOwner` | [server/routes/storeRoutes.js:270-322](../server/routes/storeRoutes.js#L270-L322) |
| `GET` | `/api/store/all` | None | [server/routes/storeRoutes.js:325-342](../server/routes/storeRoutes.js#L325-L342) |
| `GET` | `/api/store/:storeId/products` | None | [server/routes/storeRoutes.js:345-352](../server/routes/storeRoutes.js#L345-L352) |
| `GET` | `/api/store-owner/orders` | `authenticateToken`, `requireStoreOwner` | [server/routes/storeRoutes.js:387-422](../server/routes/storeRoutes.js#L387-L422) |
| `GET` | `/api/store-owner/orders/:orderId` | `authenticateToken`, `requireStoreOwner` | [server/routes/storeRoutes.js:425-465](../server/routes/storeRoutes.js#L425-L465) |
| `PATCH` | `/api/store-owner/orders/:orderId/status` | `authenticateToken`, `requireStoreOwner` | [server/routes/storeRoutes.js:468-541](../server/routes/storeRoutes.js#L468-L541) |
| `GET` | `/api/store-owner/analytics` | `authenticateToken`, `requireStoreOwner` | [server/routes/storeRoutes.js:548-675](../server/routes/storeRoutes.js#L548-L675) |
| `GET` | `/api/store-owner/intelligence/demand-forecast` | `authenticateToken`, `requireStoreOwner` | [server/routes/storeRoutes.js:678-730](../server/routes/storeRoutes.js#L678-L730) |
| `POST` | `/api/store-owner/intelligence/ai-manager` | `authenticateToken`, `requireStoreOwner` | [server/routes/storeRoutes.js:733-802](../server/routes/storeRoutes.js#L733-L802) |
| `PATCH` | `/api/store-owner/inventory/update` | `authenticateToken`, `requireStoreOwner` | [server/routes/storeRoutes.js:805-869](../server/routes/storeRoutes.js#L805-L869) |
| `GET` | `/api/store-owner/catalog` | `authenticateToken`, `requireStoreOwner` | [server/routes/storeRoutes.js:872-901](../server/routes/storeRoutes.js#L872-L901) |
| `PATCH` | `/api/store-owner/store/status` | `authenticateToken`, `requireStoreOwner` | [server/routes/storeRoutes.js:904-929](../server/routes/storeRoutes.js#L904-L929) |
| `GET` | `/api/store-owner/me` | `authenticateToken`, `requireStoreOwner` | [server/routes/storeRoutes.js:932-962](../server/routes/storeRoutes.js#L932-L962) |
| `GET` | `/api/coupons` | None | [server/routes/couponRoutes.js:10-37](../server/routes/couponRoutes.js#L10-L37) |
| `POST` | `/api/coupons/validate` | None | [server/routes/couponRoutes.js:40-65](../server/routes/couponRoutes.js#L40-L65) |
| `POST` | `/api/coupons/create` | `authenticateToken`, `requireRole("store-owner", "admin")` | [server/routes/couponRoutes.js:68-125](../server/routes/couponRoutes.js#L68-L125) |
| `POST` | `/api/payments/create-order` | `authenticateToken`, `requireCustomer` | [server/routes/paymentRoutes.js:15-49](../server/routes/paymentRoutes.js#L15-L49) |
| `POST` | `/api/payments/verify` | `authenticateToken` | [server/routes/paymentRoutes.js:56-103](../server/routes/paymentRoutes.js#L56-L103) |
| `POST` | `/api/payments/webhook` | `express.raw({ type: "application/json" })` (pre-empted by global `express.json`) | [server/routes/paymentRoutes.js:110-250](../server/routes/paymentRoutes.js#L110-L250) |
| `POST` | `/api/payments/failure` | `authenticateToken` | [server/routes/paymentRoutes.js:256-282](../server/routes/paymentRoutes.js#L256-L282) |
| `POST` | `/api/payments/refund` | `authenticateToken`, `requireRole("admin", "store-owner")` | [server/routes/paymentRoutes.js:288-306](../server/routes/paymentRoutes.js#L288-L306) |
| `GET` | `/api/delivery/orders` | `authenticateToken`, `requireRole("delivery-partner", "admin")` | [server/routes/deliveryRoutes.js:22-50](../server/routes/deliveryRoutes.js#L22-L50) |
| `GET` | `/api/delivery/available` | `authenticateToken`, `requireRole("delivery-partner", "admin")` | [server/routes/deliveryRoutes.js:53-76](../server/routes/deliveryRoutes.js#L53-L76) |
| `PATCH` | `/api/delivery/orders/:id/claim` | `authenticateToken`, `requireRole("delivery-partner", "admin")` | [server/routes/deliveryRoutes.js:79-154](../server/routes/deliveryRoutes.js#L79-L154) |
| `PATCH` | `/api/delivery/orders/:id/status` | `authenticateToken`, `requireRole("delivery-partner", "admin", "store-owner")` | [server/routes/deliveryRoutes.js:157-245](../server/routes/deliveryRoutes.js#L157-L245) |
| `GET` | `/api/delivery/orders/:id/track` | **None (Public Unauthenticated)** | [server/routes/deliveryRoutes.js:248-315](../server/routes/deliveryRoutes.js#L248-L315) |
| `GET` | `/api/delivery/earnings` | `authenticateToken`, `requireRole("delivery-partner")` | [server/routes/deliveryRoutes.js:318-353](../server/routes/deliveryRoutes.js#L318-L353) |
| `POST` | `/api/reviews/` | `authenticateToken` | [server/routes/reviewRoutes.js:12-84](../server/routes/reviewRoutes.js#L12-L84) |
| `GET` | `/api/reviews/product/:productId` | None | [server/routes/reviewRoutes.js:87-111](../server/routes/reviewRoutes.js#L87-L111) |
| `GET` | `/api/reviews/store/:storeId` | None | [server/routes/reviewRoutes.js:114-138](../server/routes/reviewRoutes.js#L114-L138) |
| `GET` | `/api/notifications/` | `authenticateToken` | [server/routes/notificationRoutes.js:10-27](../server/routes/notificationRoutes.js#L10-L27) |
| `PATCH` | `/api/notifications/:id/read` | `authenticateToken` | [server/routes/notificationRoutes.js:30-53](../server/routes/notificationRoutes.js#L30-L53) |
| `POST` | `/api/notifications/mark-all-read` | `authenticateToken` | [server/routes/notificationRoutes.js:56-64](../server/routes/notificationRoutes.js#L56-L64) |
| `GET` | `/api/subscriptions/` | `authenticateToken` | [server/routes/subscriptionRoutes.js:11-27](../server/routes/subscriptionRoutes.js#L11-L27) |
| `POST` | `/api/subscriptions/` | `authenticateToken` | [server/routes/subscriptionRoutes.js:30-87](../server/routes/subscriptionRoutes.js#L30-L87) |
| `PATCH` | `/api/subscriptions/:id/status` | `authenticateToken` | [server/routes/subscriptionRoutes.js:90-121](../server/routes/subscriptionRoutes.js#L90-L121) |
| `GET` | `/health` | None | [server/server.js:208-213](../server/server.js#L208-L213) |
| `GET` | `/health/db` | None | [server/server.js:216-230](../server/server.js#L216-L230) |

---

### 1.5 Mongoose Models, Fields, and Indexes

1. **User** ([server/models/user.js](../server/models/user.js#L4-L46))
   - **Fields:** `username` (String, req, unique), `email` (String, req, unique), `password` (String, req), `role` (enum: customer/store-owner/delivery-partner/admin), `phone` (String), `address` (String), `city` (String, default: "Bengaluru"), `isActive` (Boolean, default: true), `createdAt` (Date).
   - **Indexes:** `{ username: 1 }` (unique), `{ email: 1 }` (unique), `{ _id: 1 }`.
   - **Hooks/Methods:** `pre("save")` hashes password via `bcrypt.hash`; `comparePassword()` method.

2. **Store** ([server/models/store.js](../server/models/store.js#L32-L72))
   - **Fields:** `name` (String, req), `description` (String, req), `category` (String, req), `products` (`[ObjectId -> Product]`), `owner` (`ObjectId -> User`, req), `location` (`{ type: "Point", coordinates: [lng, lat] }`), `isOpen` (Boolean, default: true), `image` (String).
   - **Indexes:** `{ location: "2dsphere" }`, `{ _id: 1 }`. (Note: **NO** index on `category`, `name`, or `owner`).

3. **Product** ([server/models/product.js](../server/models/product.js#L3-L97))
   - **Fields:** `name` (String, req), `price` (Number, req), `description` (String, req), `image` (String, req), `store` (`ObjectId -> Store`, req), `category` (String, default: "General", indexed), `brand` (String), `unit` (String), `stock` (Number, default: 20), `availableStock` (Number, default: 20), `reservedStock` (Number, default: 0), `soldStock` (Number, default: 0), `incomingStock` (Number), `damagedStock` (Number), `reorderLevel` (Number), `safetyStock` (Number), `supplierInfo` (Object), `available` (Boolean, default: true, indexed), `rating` (Number), `ratingCount` (Number), `tags` (`[String]`, indexed), timestamps.
   - **Indexes:**
     - `{ category: 1 }`
     - `{ available: 1 }`
     - `{ tags: 1 }`
     - `{ store: 1, available: 1 }`
     - Compound text index: `{ name: "text", description: "text", category: "text", brand: "text" }`

4. **Cart** ([server/models/cart.js](../server/models/cart.js#L20-L39))
   - **Fields:** `user` (`ObjectId -> User`, req, unique, indexed), `store` (`ObjectId -> Store`), `items: [{ product: ObjectId -> Product, quantity: Number }]`, timestamps.
   - **Indexes:** `{ user: 1 }` (unique).

5. **Order** ([server/models/order.js](../server/models/order.js#L56-L155))
   - **Fields:** `customer` (`ObjectId -> User`, req, indexed), `store` (`ObjectId -> Store`, req), `items` (`[orderItemSchema]`), `deliveryAddress` (`deliveryAddressSchema`), `subtotal` (Number), `deliveryFee` (Number), `discount` (Number), `couponCode` (String), `total` (Number, req), `paymentMethod` (enum: razorpay/upi/cod/cards), `paymentStatus` (enum: pending/paid/failed/refunded), `razorpayOrderId` (String), `razorpayPaymentId` (String), `razorpaySignature` (String), `signatureVerified` (Boolean), `webhookVerified` (Boolean), `deliveryPartner` (`ObjectId -> User`), `deliveryPartnerName` (String), `deliveryPartnerPhone` (String), `deliveryEtaMinutes` (Number), `deliveryOtp` (String), `status` (enum: 15 statuses, indexed), `timeline` (`[{ status, timestamp, note }]`), timestamps.
   - **Indexes:**
     - `{ customer: 1, createdAt: -1 }`
     - `{ customer: 1 }` (redundant index caused by `index: true` on field)
     - `{ store: 1, status: 1 }`
     - `{ deliveryPartner: 1, status: 1 }`
     - `{ status: 1 }`

6. **Coupon** ([server/models/coupon.js](../server/models/coupon.js#L3-L70))
   - **Fields:** `code` (String, unique, uppercase), `description` (String), `discountType` (enum: percentage/fixed/free_delivery), `discountValue` (Number), `minOrderValue` (Number), `maxDiscountAmount` (Number), `store` (`ObjectId -> Store`), `category` (String), `usageLimit` (Number), `usedCount` (Number), `perUserLimit` (Number), `validFrom` (Date), `validUntil` (Date), `isActive` (Boolean, indexed), timestamps.
   - **Indexes:** `{ code: 1 }` (unique), `{ isActive: 1 }`.

7. **Delivery** ([server/models/delivery.js](../server/models/delivery.js#L3-L86))
   - **Fields:** `order` (`ObjectId -> Order`, req, unique), `store` (`ObjectId -> Store`), `customer` (`ObjectId -> User`), `partner` (`ObjectId -> User`, indexed), `status` (enum, indexed), `pickupAddress` (Object), `dropAddress` (Object), `distanceKm` (Number), `estimatedMinutes` (Number), `earningAmount` (Number), `otp` (String), `pickupTime` (Date), `deliveredTime` (Date), `currentLocation` (`{ type: "Point", coordinates: [lng, lat] }`), timestamps.
   - **Indexes:** `{ currentLocation: "2dsphere" }`, `{ partner: 1, status: 1 }`, `{ order: 1 }` (unique).

8. **DemandPrediction** ([server/models/demandPrediction.js](../server/models/demandPrediction.js#L3-L68))
   - **Fields:** `store` (`ObjectId -> Store`, indexed), `product` (`ObjectId -> Product`), `productName` (String), `category` (String), `targetDate` (Date, indexed), `predictedUnits` (Number), `currentInventory` (Number), `recommendedReorder` (Number), `confidenceScore` (Number), `factors` (Object), `explanation` (String), `isSimulated` (Boolean), timestamps.
   - **Indexes:** `{ store: 1, targetDate: 1 }`.

9. **Notification** ([server/models/notification.js](../server/models/notification.js#L3-L58))
   - **Fields:** `recipient` (`ObjectId -> User`, indexed), `role` (enum), `title` (String), `message` (String), `type` (enum), `data` (Object), `isRead` (Boolean, default: false, indexed), timestamps.
   - **Indexes:** `{ recipient: 1, isRead: 1, createdAt: -1 }`.

10. **Review** ([server/models/review.js](../server/models/review.js#L3-L61))
    - **Fields:** `user` (`ObjectId -> User`, req), `userName` (String, req), `product` (`ObjectId -> Product`), `store` (`ObjectId -> Store`), `order` (`ObjectId -> Order`, req), `rating` (Number, 1-5), `comment` (String, max 1000), `isVerifiedPurchase` (Boolean), `helpfulCount` (Number), `isApproved` (Boolean), timestamps.
    - **Indexes:** `{ product: 1, createdAt: -1 }`, `{ store: 1, createdAt: -1 }`, `{ user: 1, order: 1 }`.

11. **Subscription** ([server/models/subscription.js](../server/models/subscription.js#L14-L74))
    - **Fields:** `customer` (`ObjectId -> User`, req, indexed), `store` (`ObjectId -> Store`, req), `title` (String, req), `items` (`[{ product, name, unitPrice, quantity }]`), `frequency` (enum), `preferredTimeSlot` (String), `deliveryAddress` (Object), `status` (enum, indexed), `nextDeliveryDate` (Date, req), `lastGeneratedOrderId` (`ObjectId -> Order`), `paymentMethod` (enum), timestamps.
    - **Indexes:** `{ status: 1, nextDeliveryDate: 1 }`.

---

## 2. Hygiene Check

### 2.1 Tracked Files & Secrets Audit
Command executed: `git ls-files`
- **`.env` files:** No `.env` file is tracked in git. `server/.env.example` is tracked and contains only placeholder variable keys.
- **`node_modules`:** Neither root nor server `node_modules` is tracked in git.
- **Committed Secrets Scan:** `git log -p` was scanned for API keys, Razorpay secret keys, and MongoDB connection URIs.
  - **Findings:** No live production secrets or operational API keys were found in commit history.
  - Test/demo strings present in commits: standard mock strings (e.g. `mock_test_gemini_api_key`, `Password123!` for seeded demo stores, and default fallback string `"your_jwt_secret"`).

### 2.2 Package.json Scripts & Manifest Oddities

#### Root `package.json`
- **Name:** `"name": "claude"` (an odd copy-paste artifact from an AI scaffold).
- **Scripts:**
  - `"dev": "next dev"`
  - `"build": "next build"`
  - `"start": "next start"`
  - `"server": "node server/server.js"`
  - `"seed": "node server/scripts/seedDemoData.js"`
  - `"test": "echo \"Error: no test specified\" && exit 1"` (**placeholder script — root test script fails immediately**).
- **Missing Razorpay dependency:** Razorpay is NOT installed in `package.json` or `server/package.json`. The codebase writes a raw REST client `fetch("https://api.razorpay.com/v1/orders")` instead of using the official `razorpay` SDK.

#### Server `server/package.json`
- **Name:** `"name": "server"`
- **Scripts:**
  - `"start": "node server.js"`
  - `"test": "jest --runInBand"`
  - `"lint": "eslint . --ext .js"`
  - `"seed": "node scripts/seedDemoData.js"`
- **Express Version Mismatch:** Server declares `"express": "^5.1.0"` while root declares `"express": "^4.21.2"`.

---

## 3. Inventory Audit

### 3.1 Stock Decrement Code
Stock decrement logic is located in [server/services/inventoryService.js:31-45](../server/services/inventoryService.js#L31-L45):

```javascript
// Exact query executed per product in InventoryService.reserveStock:
const updated = await Product.findOneAndUpdate(
  {
    _id: pid,
    available: true,
    availableStock: { $gte: qty }
  },
  {
    $inc: {
      availableStock: -qty,
      reservedStock: qty
    }
  },
  { new: true }
);
```

### 3.2 Inventory Questions & Evidence

#### a. Is the decrement a single conditional atomic update (filter includes stock >= qty)?
- **YES.** [server/services/inventoryService.js:33-44](../server/services/inventoryService.js#L33-L44) executes `Product.findOneAndUpdate` with filter `{ _id: pid, available: true, availableStock: { $gte: qty } }` and `$inc: { availableStock: -qty, reservedStock: qty }`.

#### b. How are reservations stored? Is there a TTL index? If expiry is a TTL index, does anything restore the stock when a reservation expires?
- **Storage:** Reservations are stored directly on the `Product` document as atomic numerical field counters (`product.availableStock` and `product.reservedStock`). There is NO separate reservation document or reservation collection.
- **TTL Index:** **NOT FOUND.** Neither `Product` nor `Order` schemas have a TTL index on reservations.
- **Expiration / Auto-Restoration:** [server/services/inventoryService.js:134-159](../server/services/inventoryService.js#L134-L159) implements a static method `cleanupExpiredReservations()` that queries `{ status: "pending_payment", createdAt: { $lt: threshold } }` and calls `releaseReservation()`.
  - **CRITICAL DEFECT:** `cleanupExpiredReservations()` is **NEVER SCHEDULED OR CALLED ANYWHERE** in `server.js` or any cron job. Abandoned checkouts permanently lock `reservedStock` unless manually cancelled or failed.

#### c. What happens in multi-product checkout if item 2 of 3 fails? Is there a rollback or compensation, and what if the process crashes in between?
- **Failure Handling:** [server/services/inventoryService.js:69-83](../server/services/inventoryService.js#L69-L83) catches the error and iterates over previously reserved items, executing `Product.updateOne({ _id }, { $inc: { availableStock: qty, reservedStock: -qty } })`.
- **Crash Vulnerability:** The rollback is strictly application-level in-memory compensation, **NOT a MongoDB multi-document ACID transaction** (`session.withTransaction()`). If the Node.js process crashes, restarts, or loses connection while reserving item 2, the rollback loop never executes and item 1 remains permanently locked in `reservedStock`.

#### d. Is there duplicate-checkout protection (same cart submitted twice)?
- **NO.** In [server/routes/customerRoutes.js:900-1093](../server/routes/customerRoutes.js#L900-L1093), `POST /orders` reads the customer's cart, calculates the total, reserves stock, creates an order, and only clears `cart.items = []` *after* `order.save()` (line 1065). There is no idempotency key or distributed lock. Two concurrent checkout requests submitted in parallel will both read the cart, double-reserve stock, and create two duplicate pending orders.

#### e. What releases a reservation on payment failure, cancellation or timeout?
- **Payment Failure:** [server/services/paymentService.js:381](../server/services/paymentService.js#L381) calls `InventoryService.releaseReservation(order.items)` when triggered by client failure endpoint ([server/routes/paymentRoutes.js:270](../server/routes/paymentRoutes.js#L270)) or Razorpay webhook `payment.failed` ([server/routes/paymentRoutes.js:172](../server/routes/paymentRoutes.js#L172)).
- **Order Cancellation:** [server/routes/customerRoutes.js:1174](../server/routes/customerRoutes.js#L1174) calls `InventoryService.releaseReservation()` when a customer cancels a `pending_payment` order.
- **Timeout:** **NOTHING IN PRODUCTION.** As identified in (b), `cleanupExpiredReservations` is not wired to any background timer or queue.

---

## 4. Payment Audit

### 4.1 Payment Code References
- **Create Order:** [server/services/paymentService.js:196-247](../server/services/paymentService.js#L196-L247) and route [server/routes/paymentRoutes.js:15-49](../server/routes/paymentRoutes.js#L15-L49).
- **Verify Signature:** [server/services/paymentService.js:53-63](../server/services/paymentService.js#L53-L63) and route [server/routes/paymentRoutes.js:56-103](../server/routes/paymentRoutes.js#L56-L103).
- **Webhook Handler:** [server/routes/paymentRoutes.js:110-250](../server/routes/paymentRoutes.js#L110-L250).

### 4.2 Payment Questions & Evidence

#### a. Is the HMAC computed correctly and compared with a timing-safe comparison?
- **Computation:** The HMAC is computed over payload `${razorpayOrderId}|${razorpayPaymentId}` with `crypto.createHmac("sha256", this.keySecret)` ([server/services/paymentService.js:57-61](../server/services/paymentService.js#L57-L61)).
- **Comparison:** **NOT TIMING-SAFE.** Lines 62 and 71 use standard JavaScript string comparison:
  ```javascript
  return expectedSignature === razorpaySignature;
  ```
  And [server/routes/paymentRoutes.js:133](../server/routes/paymentRoutes.js#L133) uses `if (expectedSig !== signature)`. Neither uses `crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))`, exposing the endpoint to timing side-channel attacks.

#### b. Does a webhook endpoint exist? If so, does it use the raw body for signature verification?
- **Webhook Exists:** Yes, `POST /api/payments/webhook` at [server/routes/paymentRoutes.js:110](../server/routes/paymentRoutes.js#L110).
- **Raw Body Handling Flaw:** In [server/server.js:28](../server/server.js#L28), `app.use(express.json())` is mounted globally before route registration. By the time requests reach `express.raw({ type: "application/json" })` on the webhook route, the stream has already been consumed and parsed into a plain object. As a result, [server/routes/paymentRoutes.js:127](../server/routes/paymentRoutes.js#L127) falls back to `JSON.stringify(req.body)`. Because `JSON.stringify` does not guarantee original raw byte/key ordering and spacing, live Razorpay webhook HMAC verification will fail under production webhook payloads.

#### c. Can client verify and webhook both update the order? Is there any shared function, or are they separate code paths?
- **Shared Function:** Both the client verify endpoint ([server/routes/paymentRoutes.js:87](../server/routes/paymentRoutes.js#L87)) and the webhook `payment.captured` event ([server/routes/paymentRoutes.js:151](../server/routes/paymentRoutes.js#L151)) call the shared `PaymentService.confirmPayment(...)` helper.
- **Divergence on Refunds:** `refund.created` and `refund.processed` webhook handlers ([server/routes/paymentRoutes.js:183-241](../server/routes/paymentRoutes.js#L183-L241)) do NOT use `PaymentService.processRefund()`; they duplicate inline stock adjustments and status updates.

#### d. How is order status updated? Is it a plain assignment, or a conditional update that checks the current status?
- **Update Mechanism:** **PLAIN ASSIGNMENT.** In [server/services/paymentService.js:314-328](../server/services/paymentService.js#L314-L328):
  ```javascript
  order.paymentStatus = "paid";
  order.status = "confirmed";
  await order.save();
  ```
  It checks `order.paymentStatus === "paid"` earlier in JS (lines 280–293), but does NOT use an atomic conditional DB update (`Order.findOneAndUpdate({ _id: orderId, paymentStatus: { $ne: "paid" } })`). Concurrent requests can both pass the in-memory check and duplicate state transitions.

#### e. Is the Razorpay payment ID stored? Is there a unique index preventing the same payment being applied twice?
- **Storage:** `order.razorpayPaymentId` is stored in the document ([server/models/order.js:105](../server/models/order.js#L105)).
- **Unique Index:** **NOT FOUND.** There is no unique or sparse index on `razorpayPaymentId` in `orderSchema`.

#### f. What happens if payment succeeds but the order write fails?
- If `await order.save()` fails at [server/services/paymentService.js:328](../server/services/paymentService.js#L328), an unhandled exception is thrown back to the caller and inventory commit is skipped. Because money was already captured in Razorpay, the customer is charged while their order remains in `pending_payment` with no automated compensation or refund initiated.

---

## 5. Authorization Audit

### 5.1 Route-by-Route ID Ownership Verification

| Route | ID Parameter | Check Location | Vulnerability / Analysis |
|---|---|---|---|
| `GET /api/customer/orders/:orderId` | `orderId` | Part of DB query | **Secure.** Uses `Order.findOne({ _id: orderId, customer: userId })` ([customerRoutes.js:1119](../server/routes/customerRoutes.js#L1119)). |
| `PATCH /api/customer/orders/:orderId/cancel` | `orderId` | Part of DB query | **Secure.** Uses `Order.findOne({ _id: orderId, customer: userId })` ([customerRoutes.js:1145](../server/routes/customerRoutes.js#L1145)). |
| `POST /api/payments/create-order` | `orderId` (body) | Part of DB query | **Secure.** Uses `Order.findOne({ _id: orderId, customer: userId })` ([paymentRoutes.js:28](../server/routes/paymentRoutes.js#L28)). |
| `POST /api/payments/verify` | `orderId` (body) | Part of DB query | **Secure.** Uses `Order.findOne({ _id: orderId, customer: userId })` ([paymentRoutes.js:71](../server/routes/paymentRoutes.js#L71)). |
| `POST /api/payments/failure` | `orderId` (body) | Part of DB query | **Secure.** Uses `Order.findOne({ _id: orderId, customer: userId })` ([paymentRoutes.js:265](../server/routes/paymentRoutes.js#L265)). |
| `POST /api/payments/refund` | `orderId` (body) | **MISSING** | **CRITICAL IDOR.** Route has `requireRole("admin", "store-owner")` but `PaymentService.processRefund(orderId)` fetches `Order.findById(orderId)` without verifying that the store-owner owns the store on the order. Any authenticated store-owner can trigger refunds on other stores' orders! |
| `GET /api/store-owner/orders/:orderId` | `orderId` | After fetching | **Secure (Post-fetch).** Fetches `Order.findById(orderId)` and asserts `order.store.toString() === store._id.toString()` ([storeRoutes.js:453](../server/routes/storeRoutes.js#L453)). |
| `PATCH /api/store-owner/orders/:orderId/status` | `orderId` | After fetching | **Secure (Post-fetch).** Fetches `Order.findById(orderId)` and asserts `order.store.toString() === store._id.toString()` ([storeRoutes.js:499](../server/routes/storeRoutes.js#L499)). |
| `POST /api/store-owner/products` | `storeId` (body) | After fetching | **Secure (Post-fetch).** Fetches `Store.findById(storeId)` and checks `store.owner.toString() === req.user.id` ([storeRoutes.js:173](../server/routes/storeRoutes.js#L173)). |
| `PUT /api/store-owner/products/:productId` | `productId` | After fetching | **Secure (Post-fetch).** Fetches product and store, checks `store.owner.toString() === req.user.id` ([storeRoutes.js:242](../server/routes/storeRoutes.js#L242)). |
| `DELETE /api/store-owner/products/:productId/:storeId` | `productId`, `storeId` | After fetching | **Secure (Post-fetch).** Checks store ownership before deletion ([storeRoutes.js:301](../server/routes/storeRoutes.js#L301)). |
| `PATCH /api/store-owner/inventory/update` | `productId` (body) | Part of DB query | **Secure.** Uses `Product.findOne({ _id: productId, store: store._id })` ([storeRoutes.js:822](../server/routes/storeRoutes.js#L822)). |
| `GET /api/delivery/orders/:id/track` | `id` | **NONE** | **CRITICAL DATA LEAK.** Public, unauthenticated endpoint returns entire order lifecycle, delivery address, runner phone number, and **unhashed `deliveryOtp`** ([deliveryRoutes.js:248-315](../server/routes/deliveryRoutes.js#L248-L315)). |
| `PATCH /api/delivery/orders/:id/status` | `id` | Partial | **IDOR.** If caller has `store-owner` role, the route allows them to transition order status without verifying they own the order's store ([deliveryRoutes.js:177-185](../server/routes/deliveryRoutes.js#L177-L185)). |
| `PATCH /api/notifications/:id/read` | `id` | Part of DB query | **Secure.** Uses `Notification.findOneAndUpdate({ _id: id, recipient: userId })` ([notificationRoutes.js:40](../server/routes/notificationRoutes.js#L40)). |
| `PATCH /api/subscriptions/:id/status` | `id` | Part of DB query | **Secure.** Uses `Subscription.findOneAndUpdate({ _id: id, customer: userId })` ([subscriptionRoutes.js:104](../server/routes/subscriptionRoutes.js#L104)). |

### 5.2 JWT Security & NoSQL Injection Review
- **Secret Source:** `process.env.JWT_SECRET || "your_jwt_secret"` ([server/middleware/authMiddleware.js:20](../server/middleware/authMiddleware.js#L20)). Fallback to hardcoded string if environment variable is missing.
- **Token Expiry:** `24h` ([server/routes/customerRoutes.js:54](../server/routes/customerRoutes.js#L54), [server/routes/storeRoutes.js:131](../server/routes/storeRoutes.js#L131)).
- **Algorithm Pinning:** **NOT PINNED.** `jwt.verify(token, secret)` does not specify `algorithms: ["HS256"]`.
- **Role Trust:** **VERIFIED SAFELY AGAINST DB.** In `authMiddleware.requireRole` ([server/middleware/authMiddleware.js:41-55](../server/middleware/authMiddleware.js#L41-L55)), the role is NOT trusted directly from the decoded token; the middleware executes `User.findById(req.user.id)` to confirm `user.role` and `user.isActive`.
- **NoSQL Operator Injection:** IDs are explicitly sanitized using `mongoose.Types.ObjectId.isValid()`. In search endpoints, search strings are sanitized into regexes via `new RegExp(q.trim(), "i")`.

---

## 6. Tests Audit

### 6.1 Test Execution Output
Command executed: `npm test` (`jest --runInBand` in `server/`) against active local MongoDB instance:
- **Test Suites:** 1 failed, 16 passed, 17 total
- **Test Cases:** 2 failed, 198 passed, 200 total
- **Runtime:** 71.939 s

#### Failed Tests Breakdown
Both failures occurred in [server/__tests__/store.auth.test.js](../server/__tests__/store.auth.test.js):
1. `Store Authentication & Authorization Tests › should return 403 if JWT is invalid`: Expected `403`, received `401` ([store.auth.test.js:148](../server/__tests__/store.auth.test.js#L148)).
2. `Store Authentication & Authorization Tests › should return 403 if JWT is expired`: Expected `403`, received `401` ([store.auth.test.js:169](../server/__tests__/store.auth.test.js#L169)).
*(Note: Returning HTTP 401 Unauthorized for missing/expired credentials in `authMiddleware.js` is correct REST behavior; the test assertion was expecting 403).*

### 6.2 Test Categorisation

| Category | Suites & Files | Test Count | Description |
|---|---|---|---|
| **Unit Models & Auth** | `user.model.test.js`, `product.model.test.js`, `store.auth.test.js` | 27 tests | Password hashing, schema validation, role access. |
| **Integration: Commerce & Cart** | `customer.cart.test.js`, `customer.checkout.test.js`, `customer.orders.test.js`, `customer.products.test.js`, `commerce.platform.test.js` | 74 tests | Cart additions, single-store cart constraint, price snapshots, order creation. |
| **Integration: Store & Geo** | `store.orders.test.js`, `store.geo.test.js`, `store.nearby.test.js` | 28 tests | Geospatial $geoNear queries, merchant order status transitions. |
| **Payment: Razorpay** | `payment.razorpay.test.js` | 14 tests | HMAC verification, mock payment provider, idempotency flag. |
| **AI Assistant** | `ai.foundation.test.js`, `ai.assistant.test.js`, `ai.intent.basket.test.js`, `ai.hardening.test.js` | 55 tests | Gemini adapter mocks, prompt generation, tool calling loop, rate limiting. |
| **Placeholder / Redundant** | `example.test.js` | 2 tests | Asserts `1+1 === 2` and `true === true` ([example.test.js:1-16](../server/__tests__/example.test.js#L1-L16)). |

### 6.3 Concurrency Verification
- **Plain Statement:** **ZERO TESTS IN THIS REPOSITORY EXECUTE CONCURRENT REQUESTS AGAINST MONGODB.**
  - All 17 test suites run sequentially with `jest --runInBand`.
  - There are no tests simulating parallel checkout requests, simultaneous stock reservations on the last unit of inventory, or concurrent payment webhook invocations.

---

## 7. Baseline Query Plans (`explain("executionStats")`)

Dataset: Seeded with 20 stores and 256 products using [server/scripts/seedDemoData.js](../server/scripts/seedDemoData.js).

### 7.1 Store Listing / Discovery

#### Query A: Filtered Store Listing (`GET /api/customer/stores?category=Kirana`)
- **Query:** `Store.find({ category: /Kirana/i })`
- **Total Docs Examined:** `20`
- **nReturned:** `5`
- **Execution Stage:** `COLLSCAN`
- **Indexes Present on Store:** `{ _id: 1 }`, `{ location: "2dsphere" }`.
- **Finding:** Complete collection scan. `category` and `name` are unindexed on `Store`.

#### Query B: Geospatial Nearby Store Discovery (`GET /api/customer/stores/nearby`)
- **Query:** `Store.aggregate([{ $geoNear: { near: [77.6389, 12.9121], maxDistance: 8000, spherical: true } }])`
- **Total Docs Examined:** `14`
- **nReturned:** `14`
- **Execution Stage:** `IXSCAN` (`location_2dsphere`)
- **Finding:** Properly utilizes 2dsphere index.

---

### 7.2 Product Listing for Store (`GET /api/customer/stores/:storeId/products`)
- **Query:** `Product.find({ store: ObjectId("...") })`
- **Total Docs Examined:** `11`
- **nReturned:** `11`
- **Execution Stage:** `FETCH -> IXSCAN`
- **Index Used:** `store_1_available_1`
- **Indexes Present on Product:** `{ _id: 1 }`, `{ category: 1 }`, `{ available: 1 }`, `{ tags: 1 }`, `{ store: 1, available: 1 }`, `{ name/description/category/brand: "text" }`.
- **Finding:** Index scan efficiently bounds by store ID.

---

### 7.3 Product Search (`GET /api/customer/products/search`)

#### Query A: Regex Search across Product Name/Category/Description
- **Query:** `Product.find({ store: ObjectId("..."), $or: [{ name: /atta/i }, { description: /atta/i }, { category: /atta/i }] })`
- **Total Docs Examined:** `11`
- **nReturned:** `1`
- **Execution Stage:** `FETCH -> IXSCAN` (`store_1_available_1`)
- **Finding:** Uses `store_1_available_1` index to narrow down store products, but evaluates regex in memory.

#### Query B: Text Index Search (`$text: { $search: "atta" }`)
- **Query:** `Product.find({ $text: { $search: "atta" } })`
- **Total Docs Examined:** `20`
- **nReturned:** `20`
- **Execution Stage:** `TEXT_MATCH -> FETCH -> IXSCAN` (`name_text_description_text_category_text_brand_text`)
- **Finding:** Uses full-text index.

---

### 7.4 Cart Fetch (`GET /api/customer/cart`)
- **Query:** `Cart.findOne({ user: ObjectId("...") })`
- **Total Docs Examined:** `1`
- **nReturned:** `1`
- **Execution Stage:** `EXPRESS_IXSCAN`
- **Index Used:** `user_1` (unique)
- **Indexes Present on Cart:** `{ _id: 1 }`, `{ user: 1 }`.
- **Finding:** Single-document point lookup.

---

### 7.5 Order List (`GET /api/customer/orders`)
- **Query:** `Order.find({ customer: ObjectId("...") }).sort({ createdAt: -1 })`
- **Total Docs Examined:** `1`
- **nReturned:** `1`
- **Execution Stage:** `FETCH -> IXSCAN`
- **Index Used:** `customer_1_createdAt_-1`
- **Indexes Present on Order:** `{ _id: 1 }`, `{ customer: 1 }`, `{ status: 1 }`, `{ customer: 1, createdAt: -1 }`, `{ store: 1, status: 1 }`, `{ deliveryPartner: 1, status: 1 }`.
- **Finding:** Optimal compound index scan without in-memory sort. (Note: `{ customer: 1 }` is redundant with `{ customer: 1, createdAt: -1 }`).

---

## 8. README vs Code Discrepancies

### 8.1 Claims in README Not Supported by Code
1. **Frontend Tech Stack:** README states frontend is "HTML, CSS, JavaScript" ([README.md:83, 105, 119-136](../README.md#L83)), but the production frontend is a complete **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS** application in `src/app/`.
2. **API Surface:** README lists only 4 authentication endpoints ([README.md:142-148](../README.md#L142-L148)), omitting over 30 active production API routes.
3. **Repository URL:** README clone instructions cite `https://github.com/Jyatin/KiranaWala.git` ([README.md:160](../README.md#L160)), which differs from remote origins in git history.
4. **Local Validation Claim:** User claim of "validation with 5 local stores" is **NOT SUPPORTED BY CODE**. The repository contains only synthetic seeding data ([server/scripts/seedDemoData.js](../server/scripts/seedDemoData.js)) with fictitious mock stores and email addresses (`owner_gupta_hsr@kiranawala.demo`). There is no telemetry, operational logs, or store validation artifacts.

### 8.2 Important Implemented Features Omitted from README
1. **Razorpay Payment Gateway:** Complete checkout order creation, client HMAC-SHA256 signature verification, webhook processing, and local development sandbox mock provider.
2. **Atomic Inventory Reservation:** Conditional decrement (`availableStock -= qty`, `reservedStock += qty`) with single-store cart conflict enforcement.
3. **Delivery Partner Network:** Runner dispatch, self-claiming orders, tracking timeline, and OTP-verified delivery completion (`/api/delivery/*`).
4. **Smart Coupons & Subscriptions:** Dynamic coupon validation engine and recurring scheduled delivery subscriptions.
5. **Verified Reviews System:** Verified-purchase review submission and product rating recalculations.
6. **Gemini AI Shopping Assistant:** Tool-calling AI assistant with intent-to-basket conversion, rate-limiting, and structured JSON observability logging.
7. **Comprehensive Test Suite:** 17 Jest test suites comprising 200 automated tests.

---

## 9. Confirmed Bugs Table

| Severity | File : Line | Description |
|---|---|---|
| **CRITICAL** | [server/routes/paymentRoutes.js:288-306](../server/routes/paymentRoutes.js#L288-L306) | **Broken Authorization (IDOR) on Refunds:** `POST /api/payments/refund` permits any authenticated store owner to issue monetary refunds on orders belonging to other stores because store ownership is not validated. |
| **CRITICAL** | [server/routes/deliveryRoutes.js:248-315](../server/routes/deliveryRoutes.js#L248-L315) | **Unauthenticated Delivery OTP & Address Leak:** `GET /api/delivery/orders/:id/track` has no authentication middleware and returns unhashed `order.deliveryOtp` and customer address to any anonymous caller. |
| **CRITICAL** | [server/routes/deliveryRoutes.js:177-185](../server/routes/deliveryRoutes.js#L177-L185) | **IDOR in Delivery Status Transition:** `PATCH /api/delivery/orders/:id/status` allows any store-owner to transition the delivery status of orders from other stores. |
| **HIGH** | [server/routes/reviewRoutes.js:52-64](../server/routes/reviewRoutes.js#L52-L64) | **Schema Validation Crash on Review Submission:** `POST /api/reviews` instantiates `new Review({ customer: userId })` but `Review` schema requires `user`, `userName`, and `order`. `review.save()` always crashes with Mongoose ValidationError. |
| **HIGH** | [server/routes/subscriptionRoutes.js:53-75](../server/routes/subscriptionRoutes.js#L53-L75) | **Schema Validation Crash on Subscription Creation:** `POST /api/subscriptions` fails to set required `title` and item `name` required by `subscriptionSchema`. `subscription.save()` always crashes with Mongoose ValidationError. |
| **HIGH** | [server/services/inventoryService.js:134-159](../server/services/inventoryService.js#L134-L159) | **Unscheduled Reservation Expiration:** `cleanupExpiredReservations()` is never invoked by any cron/timer. Expired pending checkouts leave stock permanently locked in `reservedStock`. |
| **HIGH** | [server/routes/paymentRoutes.js:110, 125-127](../server/routes/paymentRoutes.js#L110) | **Broken Webhook Signature Verification:** Global `express.json()` runs before webhook handler, causing `JSON.stringify(req.body)` to be used for HMAC verification instead of raw bytes, breaking live Razorpay webhooks. |
| **MEDIUM** | [server/services/paymentService.js:62, 71](../server/services/paymentService.js#L62) | **Timing Attack Vulnerability:** Razorpay signatures are compared using `===` instead of `crypto.timingSafeEqual()`. |
| **MEDIUM** | [server/routes/customerRoutes.js:900-1065](../server/routes/customerRoutes.js#L900-L1065) | **Missing Duplicate Checkout Guard:** Submitting checkout concurrently creates duplicate orders and double-deducts inventory. |
| **LOW** | [package.json:2, 11](../package.json#L2) | **Manifest Inaccuracies:** Root `package.json` has `"name": "claude"` and a failing `"test"` script. |
| **LOW** | [server/__tests__/store.auth.test.js:148, 169](../server/__tests__/store.auth.test.js#L148) | **Test Status Code Assertion Mismatch:** Test expects 403 for invalid/expired tokens while middleware returns standard 401. |

---

## 10. Risks That Need a Test to Prove or Disprove

1. **Concurrent Checkout Race Condition:** Two requests calling `POST /api/customer/orders` with the same cart simultaneously. Test needed: send 2 parallel requests using `Promise.all` to verify whether 1 or 2 orders are created and whether inventory is double-reserved.
2. **Parallel Inventory Over-allocation:** 10 concurrent requests attempting to purchase the last 2 remaining units of a product. Test needed: verify that exactly 2 succeed and 8 fail with 400.
3. **Webhook vs Client Verification Race:** Webhook `payment.captured` and client `POST /api/payments/verify` arriving simultaneously. Test needed: fire both concurrently against a single order to verify that inventory is committed exactly once (`soldStock += qty`) and not twice.
4. **Crash-Mid-Reservation Integrity:** Process interruption after item 1 is reserved but before item 2 is checked. Test needed: verify whether stock on item 1 is recoverable without server restart.
5. **NoSQL Query Injection via Search Query Strings:** Passing regex special characters and nested objects in `GET /api/customer/stores?q=...` to test for catastrophic backtracking (ReDoS) or schema filter bypass.

---

## 11. What is Already Good (Verified Facts Only)

1. **Atomic Single-Product Inventory Reservation:** `Product.findOneAndUpdate` correctly checks `{ available: true, availableStock: { $gte: qty } }` with `$inc: { availableStock: -qty, reservedStock: qty }`.
2. **Single-Store Cart Enforcement:** `POST /api/customer/cart/items` and `POST /api/customer/cart/basket` reject items from different stores with `400 CROSS_STORE_CONFLICT`.
3. **Server-Authoritative Price & Subtotal Calculation:** `POST /api/customer/orders` and `POST /api/payments/create-order` ignore client-provided prices and recalculate totals exclusively from database product records.
4. **Geospatial 2dsphere Indexing:** Store discovery uses a valid Mongo `2dsphere` index and `$geoNear` aggregation stage.
5. **Non-Trivial Role Verification in Middleware:** `requireRole` checks the database record (`User.findById`) rather than blindly trusting claims in JWT payloads.
6. **Robust AI Guardrails & Observability:** The Gemini AI assistant implements input character bounds (2000 chars), an in-memory IP/user rate-limiter (20 req/min), credential sanitization in structured logs, and automatic out-of-stock product filtering.
7. **Extensive Base Test Coverage:** 198 automated integration tests pass across authentication, geospatial querying, checkout flows, and AI shopping.
