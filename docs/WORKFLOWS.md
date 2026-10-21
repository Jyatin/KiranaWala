# KiranaWala Workflows

This document preserves the key order-state and payment-flow diagrams so the root README can stay focused on a quick project overview.

## Order state machine

Orders follow an explicit lifecycle enforced by the backend state-transition logic.

```mermaid
stateDiagram-v2
    [*] --> pending_payment: Checkout (stock reserved)
    pending_payment --> confirmed: Payment succeeded
    pending_payment --> payment_failed: Payment failed / TTL expired

    confirmed --> packing: Merchant prepares
    packing --> ready: Packed and ready
    ready --> assigned: Runner claims order
    assigned --> out_for_delivery: Picked up
    out_for_delivery --> delivered: Customer OTP verified
    delivered --> [*]

    confirmed --> cancelled: Store/customer cancellation
    cancelled --> refunded: Compensating refund
    refunded --> [*]
    payment_failed --> [*]
```

## Payment lifecycle and webhook processing

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant App as Frontend (Next.js)
    participant API as Backend (Express)
    participant DB as MongoDB
    participant Pay as Razorpay

    Customer->>App: Checkout
    App->>API: POST /api/customer/checkout
    API->>DB: Atomically reserve stock
    API->>Pay: Create payment order
    Pay-->>API: Return razorpayOrderId
    API-->>App: Order pending_payment

    App->>Pay: Customer completes payment
    Pay-->>App: Return payment signature

    alt Browser callback
        App->>API: POST /api/payments/verify
    else Asynchronous webhook
        Pay->>API: POST /api/payments/webhook
    end

    API->>API: Verify HMAC-SHA256 signature
    API->>DB: Update order and inventory
    API-->>App: Confirmation response
```

## Reliability and security notes

- Checkout prices and discounts are recalculated by the backend; the client should not be trusted for payable totals.
- Inventory reservation uses conditional MongoDB updates to protect against concurrent checkout attempts.
- The browser verification endpoint provides quick feedback, while Razorpay webhooks provide an asynchronous payment notification path.
- Webhook HMAC verification requires the original request bytes. The backend preserves the raw body and uses timing-safe signature comparison.
- Payment callbacks can arrive late or more than once. State-transition guards and reconciliation help recover eligible pending orders; do not claim exactly-once processing without verifying idempotency behavior.
- Delivery completion requires the customer's OTP and is protected by attempt limits.
