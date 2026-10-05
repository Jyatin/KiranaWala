# KiranaWala Frontend-Backend Integration Notes

This document contains all API contracts, authentication flows, data schemas, business rules, and integration details needed to build the new frontend from scratch.

---

## 1. Authentication & Session Architecture

### JWT Handling & Storage
- **Token Type:** Bearer JWT in `Authorization` header: `Authorization: Bearer <token>`
- **Storage Keys:**
  - `token`: JWT authentication token string
  - `user`: (Optional client cache) Serialized user details object
  - `role`: `'customer'` or `'store-owner'`
  - `storeId`: (For store owners) MongoDB ObjectId of the owned store

### User Roles & Permissions
1. **Customer (`role: 'customer'`):**
   - Discovers stores & products
   - Manages personal shopping cart (strictly 1 store at a time)
   - Places orders & views personal order history
   - Interacts with AI Shopping Assistant (`/api/customer/ai/chat`)
2. **Store Owner (`role: 'store-owner'`):**
   - Owns a specific store document linked via `owner` field
   - Manages products (Add, Update, Delete)
   - Views store orders and updates status (`placed` → `processing` → `completed` / `cancelled`)
   - Accesses merchant KPI metrics

---

## 2. API Endpoint Specification

### 2.1 Customer Authentication & Discovery

#### `POST /api/customer/register`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepassword"
  }
  ```
- **Response (201):**
  ```json
  {
    "message": "Customer registered successfully"
  }
  ```

#### `POST /api/customer/login`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "securepassword"
  }
  ```
- **Response (200):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```

#### `GET /api/customer/stores`
- **Auth:** Public
- **Response (200):** Array of Store objects with populated owner:
  ```json
  [
    {
      "_id": "6a9f0becfcd31ec5b1eb8083",
      "name": "Gupta Kirana & General Store",
      "description": "Fresh dairy, pantry essentials, spices & daily staples.",
      "category": "Kirana & Grocery",
      "owner": {
        "_id": "6a9f0becfcd31ec5b1eb8082",
        "username": "gupta_kirana"
      },
      "products": ["..."],
      "location": {
        "type": "Point",
        "coordinates": [77.6387, 12.9121]
      }
    }
  ]
  ```

#### `GET /api/customer/stores/nearby`
- **Auth:** Public
- **Query Parameters:**
  - `latitude` (Number, required, -90 to 90)
  - `longitude` (Number, required, -180 to 180)
  - `radiusKm` (Number, optional, default: 8)
- **Response (200):** Array of stores with computed `distance` (meters) and populated owner.

#### `GET /api/customer/stores/:storeId/products`
- **Auth:** Public
- **Response (200):**
  ```json
  {
    "store": {
      "_id": "6a9f0becfcd31ec5b1eb8083",
      "name": "Gupta Kirana & General Store",
      "category": "Kirana & Grocery",
      "description": "Fresh dairy..."
    },
    "products": [
      {
        "_id": "6a9f0becfcd31ec5b1eb8085",
        "name": "Aashirvaad Superior MP Sharbati Atta 5kg",
        "price": 310,
        "description": "100% pure MP Sharbati wheat flour.",
        "image": "https://images.unsplash.com/...",
        "category": "Atta, Flours & Grains",
        "stock": 25,
        "available": true,
        "store": "6a9f0becfcd31ec5b1eb8083"
      }
    ]
  }
  ```

---

### 2.2 Customer Cart Operations

#### `GET /api/customer/cart`
- **Auth:** Bearer Token (Customer)
- **Response (200):**
  ```json
  {
    "_id": "...",
    "store": {
      "_id": "6a9f0becfcd31ec5b1eb8083",
      "name": "Gupta Kirana & General Store",
      "category": "Kirana & Grocery",
      "description": "..."
    },
    "items": [
      {
        "_id": "...",
        "product": {
          "_id": "6a9f0becfcd31ec5b1eb8085",
          "name": "Aashirvaad Atta 5kg",
          "price": 310,
          "description": "...",
          "image": "...",
          "category": "Atta, Flours & Grains",
          "stock": 25,
          "available": true,
          "store": "6a9f0becfcd31ec5b1eb8083"
        },
        "quantity": 2,
        "subtotal": 620
      }
    ],
    "subtotal": 620,
    "deliveryFee": 0,
    "total": 620
  }
  ```

#### `POST /api/customer/cart/items`
- **Auth:** Bearer Token (Customer)
- **Request Body:**
  ```json
  {
    "productId": "6a9f0becfcd31ec5b1eb8085",
    "quantity": 1
  }
  ```
- **Special Error (400 - Cross Store Conflict):**
  ```json
  {
    "message": "Your cart contains items from another store. Clear your cart to shop from this store.",
    "code": "CROSS_STORE_CONFLICT"
  }
  ```

#### `PATCH /api/customer/cart/items/:productId`
- **Auth:** Bearer Token (Customer)
- **Request Body:** `{ "quantity": 3 }`

#### `DELETE /api/customer/cart/items/:productId`
- **Auth:** Bearer Token (Customer)

#### `DELETE /api/customer/cart`
- **Auth:** Bearer Token (Customer)
- Clears all items and resets `store` to null.

#### `POST /api/customer/cart/basket` (AI Intent / Batch Add)
- **Auth:** Bearer Token (Customer)
- **Request Body:**
  ```json
  {
    "storeId": "6a9f0becfcd31ec5b1eb8083",
    "items": [
      { "productId": "6a9f0becfcd31ec5b1eb8085", "quantity": 1 },
      { "productId": "6a9f0becfcd31ec5b1eb8086", "quantity": 2 }
    ],
    "clearExisting": true
  }
  ```

---

### 2.3 Customer Orders & Checkout

#### `POST /api/customer/orders`
- **Auth:** Bearer Token (Customer)
- **Request Body:**
  ```json
  {
    "deliveryAddress": {
      "fullName": "Aarav Sharma",
      "phone": "+91 98765 43210",
      "address": "Flat 402, Green Glen Heights, HSR Sector 2",
      "city": "Bengaluru",
      "pincode": "560102"
    }
  }
  ```
- **Response (201):** Order object with `status: "placed"`.

#### `GET /api/customer/orders`
- **Auth:** Bearer Token (Customer)
- **Response (200):** Array of past orders sorted by newest first.

#### `GET /api/customer/orders/:orderId`
- **Auth:** Bearer Token (Customer)
- **Response (200):** Single order detail populated with store and item snapshots.

#### `PATCH /api/customer/orders/:orderId/cancel`
- **Auth:** Bearer Token (Customer)
- Only succeeds if order status is currently `"placed"`. Automatically restores inventory.

---

### 2.4 Store Owner Endpoints

#### `POST /api/store/register`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "username": "sharma_super",
    "email": "sharma@store.com",
    "password": "password123",
    "storeName": "Sharma Super Mart",
    "storeDescription": "One-stop daily grocery shop",
    "storeCategory": "Supermarket & Daily Needs",
    "latitude": 12.9716,
    "longitude": 77.5946
  }
  ```

#### `POST /api/store/login`
- **Auth:** Public
- **Request Body:** `{ "email": "...", "password": "..." }`
- **Response (200):** `{ "token": "...", "storeId": "..." }`

#### `POST /api/store/products`
- **Auth:** Bearer Token (Store Owner)
- **Request Body:**
  ```json
  {
    "name": "Tata Salt 1kg",
    "price": 28,
    "description": "Vacuum evaporated iodized salt.",
    "image": "https://...",
    "storeId": "..."
  }
  ```

#### `PUT /api/store/products/:productId`
- **Auth:** Bearer Token (Store Owner)
- **Request Body:** `{ "name": "...", "price": 30, "description": "...", "image": "..." }`

#### `DELETE /api/store/products/:productId/:storeId`
- **Auth:** Bearer Token (Store Owner)

#### `GET /api/store-owner/orders` (or `/api/store/orders`)
- **Auth:** Bearer Token (Store Owner)
- **Query Parameters:** `status` (`placed` | `processing` | `completed` | `cancelled`)
- **Response (200):** Array of store orders with customer contact details.

#### `PATCH /api/store-owner/orders/:orderId/status`
- **Auth:** Bearer Token (Store Owner)
- **Request Body:** `{ "status": "processing" }`
- **Allowed Transitions:**
  - `placed` → `processing` or `cancelled`
  - `processing` → `completed` or `cancelled`
  - `completed` → none
  - `cancelled` → none

---

### 2.5 AI Shopping Assistant Endpoint

#### `POST /api/customer/ai/chat`
- **Auth:** Bearer Token (Customer only)
- **Rate Limit:** 20 requests per minute per customer
- **Request Body:**
  ```json
  {
    "message": "I want ingredients to make chai for 4 people",
    "context": {
      "latitude": 12.9121,
      "longitude": 77.6387
    }
  }
  ```
- **Response (200):**
  ```json
  {
    "message": "Here are the ingredients you need for tea: milk, tea powder, ginger, and sugar.",
    "products": [
      {
        "_id": "...",
        "name": "Red Label Tea 500g",
        "price": 270,
        "store": "...",
        "stock": 15
      }
    ],
    "toolsUsed": ["searchProducts"],
    "intent": {
      "type": "shopping_query",
      "category": "Tea & Beverages"
    },
    "basket": {
      "storeId": "6a9f0becfcd31ec5b1eb8083",
      "items": [
        { "productId": "...", "name": "Red Label Tea", "quantity": 1, "price": 270 }
      ],
      "totalEstimatedPrice": 270
    }
  }
  ```
- **Response (503):** When `GEMINI_API_KEY` is not set or provider is offline.

---

## 3. Server-Side Static Route Mappings

The Express backend (`server/server.js`) currently maps the following routes to views:

| Express Path | Purpose |
|---|---|
| `/` | Main landing / home page |
| `/customer/login` | Customer login |
| `/customer/register` | Customer registration |
| `/customer/dashboard` | Customer store discovery dashboard |
| `/customer/products` | Customer store product browsing (`?storeId=...`) |
| `/customer/cart` | Customer shopping cart |
| `/customer/checkout` | Customer order checkout |
| `/customer/orders` | Customer order history |
| `/customer/orders/:orderId` | Customer single order view |
| `/store-owner/login` | Store owner login |
| `/store-owner/register` | Store owner register |
| `/store-owner/dashboard` | Store owner merchant portal |
| `/health` | Server health check (`{ status: "ok" }`) |
| `/health/db` | MongoDB connection status |
