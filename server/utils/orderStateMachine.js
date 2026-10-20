"use strict";

/**
 * KiranaWala Order & Payment State Machine
 * Defines canonical statuses, transitions, and transition validators.
 */

const ORDER_STATUSES = [
  "pending_payment",
  "placed",
  "confirmed",
  "packing",
  "ready",
  "processing",
  "assigned",
  "picked_up",
  "out_for_delivery",
  "delivered",
  "completed",
  "payment_failed",
  "cancelled",
  "refund_pending",
  "refunded",
];

const ORDER_TRANSITIONS = {
  pending_payment: ["placed", "confirmed", "payment_failed", "cancelled"],
  placed: ["confirmed", "packing", "processing", "cancelled"],
  confirmed: [
    "packing",
    "ready",
    "processing",
    "cancelled",
    "refund_pending",
    "refunded",
  ],
  packing: [
    "ready",
    "out_for_delivery",
    "completed",
    "cancelled",
    "refund_pending",
    "refunded",
  ],
  ready: [
    "assigned",
    "picked_up",
    "out_for_delivery",
    "completed",
    "delivered",
    "cancelled",
    "refund_pending",
    "refunded",
  ],
  processing: [
    "ready",
    "out_for_delivery",
    "completed",
    "delivered",
    "cancelled",
    "refund_pending",
    "refunded",
  ],
  assigned: [
    "picked_up",
    "out_for_delivery",
    "cancelled",
    "refund_pending",
    "refunded",
  ],
  picked_up: ["out_for_delivery", "completed", "delivered", "cancelled"],
  out_for_delivery: ["delivered", "completed", "cancelled"],
  delivered: [],
  completed: [],
  payment_failed: [],
  cancelled: ["refund_pending", "refunded"],
  refund_pending: ["refunded", "cancelled", "confirmed", "placed"],
  refunded: [],
};

const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refund_pending",
  "refunded",
];

const PAYMENT_TRANSITIONS = {
  pending: ["paid", "failed", "refund_pending"],
  paid: ["refund_pending", "refunded"],
  refund_pending: ["refunded", "paid"],
  failed: [],
  refunded: [],
};

/**
 * Check if an order status transition is allowed.
 * @param {string} fromStatus 
 * @param {string} toStatus 
 * @returns {boolean}
 */
function canTransitionOrderStatus(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true; // Idempotent self-transition
  const allowed = ORDER_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

/**
 * Check if a payment status transition is allowed.
 * @param {string} fromPaymentStatus 
 * @param {string} toPaymentStatus 
 * @returns {boolean}
 */
function canTransitionPaymentStatus(fromPaymentStatus, toPaymentStatus) {
  if (fromPaymentStatus === toPaymentStatus) return true; // Idempotent self-transition
  const allowed = PAYMENT_TRANSITIONS[fromPaymentStatus];
  if (!allowed) return false;
  return allowed.includes(toPaymentStatus);
}

/**
 * Validate order status transition; throws descriptive Error if illegal.
 * @param {string} fromStatus 
 * @param {string} toStatus 
 */
function validateOrderStatusTransition(fromStatus, toStatus) {
  if (!ORDER_STATUSES.includes(toStatus)) {
    throw new Error(
      `Invalid target order status: '${toStatus}'. Allowed statuses: [${ORDER_STATUSES.join(", ")}]`
    );
  }
  if (!canTransitionOrderStatus(fromStatus, toStatus)) {
    const allowed = ORDER_TRANSITIONS[fromStatus] || [];
    throw new Error(
      `Illegal order status transition: Cannot transition from '${fromStatus}' to '${toStatus}'. Allowed transitions: [${allowed.join(", ")}]`
    );
  }
}

/**
 * Validate payment status transition; throws descriptive Error if illegal.
 * @param {string} fromPaymentStatus 
 * @param {string} toPaymentStatus 
 */
function validatePaymentStatusTransition(fromPaymentStatus, toPaymentStatus) {
  if (!PAYMENT_STATUSES.includes(toPaymentStatus)) {
    throw new Error(
      `Invalid target payment status: '${toPaymentStatus}'. Allowed statuses: [${PAYMENT_STATUSES.join(", ")}]`
    );
  }
  if (!canTransitionPaymentStatus(fromPaymentStatus, toPaymentStatus)) {
    const allowed = PAYMENT_TRANSITIONS[fromPaymentStatus] || [];
    throw new Error(
      `Illegal payment status transition: Cannot transition from '${fromPaymentStatus}' to '${toPaymentStatus}'. Allowed transitions: [${allowed.join(", ")}]`
    );
  }
}

module.exports = {
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  PAYMENT_STATUSES,
  PAYMENT_TRANSITIONS,
  canTransitionOrderStatus,
  canTransitionPaymentStatus,
  validateOrderStatusTransition,
  validatePaymentStatusTransition,
};
