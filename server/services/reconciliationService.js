"use strict";

const Order = require("../models/order");
const Product = require("../models/product");
const PaymentService = require("./paymentService");

/**
 * Payment Reconciliation Service
 * Resolves distributed inconsistencies between Payment Provider (Razorpay) and MongoDB.
 */
class ReconciliationService {
  /**
   * Reconcile orders stuck in pending_payment where money was captured or payment failed.
   * @param {number} ageThresholdMinutes
   * @returns {Promise<{checked: number, recovered: number, failed: number}>}
   */
  static async reconcilePendingPayments(ageThresholdMinutes = 10) {
    const cutoff = new Date(Date.now() - ageThresholdMinutes * 60 * 1000);
    const pendingOrders = await Order.find({
      status: "pending_payment",
      paymentStatus: "pending",
      razorpayOrderId: { $exists: true, $ne: "" },
      createdAt: { $lt: cutoff },
    }).limit(50);

    let checked = 0;
    let recovered = 0;
    let failed = 0;

    for (const order of pendingOrders) {
      checked++;
      try {
        const provider = PaymentService.getProvider();
        // In real mode or mock mode, check if provider has status
        if (provider.isSandbox) {
          // In mock/sandbox mode, if order was not confirmed within ageThreshold, expire it
          await PaymentService.handlePaymentFailure({
            orderId: order._id,
            razorpayOrderId: order.razorpayOrderId,
            reason: "Reconciliation: unconfirmed payment timed out",
          });
          failed++;
        } else {
          // Call Razorpay API to fetch order/payments status
          const response = await fetch(
            `${provider.baseUrl}/orders/${order.razorpayOrderId}/payments`,
            {
              headers: { Authorization: provider.authHeader },
            }
          );
          if (response.ok) {
            const data = await response.json();
            const successfulPayment = (data.items || []).find(
              (p) => p.status === "captured" || p.status === "authorized"
            );

            if (successfulPayment) {
              await PaymentService.confirmPayment({
                orderId: order._id,
                razorpayOrderId: order.razorpayOrderId,
                razorpayPaymentId: successfulPayment.id,
                source: "reconciliation",
              });
              recovered++;
            } else {
              await PaymentService.handlePaymentFailure({
                orderId: order._id,
                razorpayOrderId: order.razorpayOrderId,
                reason: "Reconciliation: no captured payment found at provider",
              });
              failed++;
            }
          }
        }
      } catch (err) {
        console.error(
          `[Reconciliation] Error reconciling order ${order._id}:`,
          err.message
        );
      }
    }

    return { checked, recovered, failed };
  }

  /**
   * Reconcile orders stuck in refund_pending due to network timeouts or application crashes.
   * @param {number} ageThresholdMinutes
   * @returns {Promise<{checked: number, refunded: number, reverted: number}>}
   */
  static async reconcilePendingRefunds(ageThresholdMinutes = 5) {
    const cutoff = new Date(Date.now() - ageThresholdMinutes * 60 * 1000);
    const pendingRefunds = await Order.find({
      paymentStatus: "refund_pending",
      updatedAt: { $lt: cutoff },
    }).limit(50);

    let checked = 0;
    let refunded = 0;
    let reverted = 0;

    for (const order of pendingRefunds) {
      checked++;
      try {
        const provider = PaymentService.getProvider();
        if (provider.isSandbox) {
          // Auto-settle sandbox pending refund
          const updated = await Order.findOneAndUpdate(
            { _id: order._id, paymentStatus: "refund_pending" },
            {
              $set: { paymentStatus: "refunded", status: "refunded" },
              $push: {
                timeline: {
                  status: "refunded",
                  note: "Reconciliation: Sandbox refund finalized",
                  timestamp: new Date(),
                },
              },
            },
            { new: true }
          );
          if (updated) {
            refunded++;
            // Restore inventory for pre-dispatch orders
            for (const item of order.items) {
              if (item.product) {
                await Product.updateOne(
                  { _id: item.product },
                  {
                    $inc: {
                      stock: item.quantity,
                      availableStock: item.quantity,
                      soldStock: -item.quantity,
                    },
                  }
                );
              }
            }
          }
        } else if (order.razorpayPaymentId) {
          // Fetch payment refunds from Razorpay
          const response = await fetch(
            `${provider.baseUrl}/payments/${order.razorpayPaymentId}/refunds`,
            {
              headers: { Authorization: provider.authHeader },
            }
          );
          if (response.ok) {
            const data = await response.json();
            const processedRefund = (data.items || []).find(
              (r) => r.status === "processed"
            );
            if (processedRefund) {
              await Order.findOneAndUpdate(
                { _id: order._id, paymentStatus: "refund_pending" },
                {
                  $set: { paymentStatus: "refunded", status: "refunded" },
                  $push: {
                    timeline: {
                      status: "refunded",
                      note: `Reconciliation: Verified refund ${processedRefund.id} at provider`,
                      timestamp: new Date(),
                    },
                  },
                }
              );
              refunded++;
            }
          }
        }
      } catch (err) {
        console.error(
          `[Reconciliation] Error reconciling refund for order ${order._id}:`,
          err.message
        );
      }
    }

    return { checked, refunded, reverted };
  }

  /**
   * Start recurring background reconciliation job.
   * @param {number} intervalMs
   */
  static startReconciliationWorker(intervalMs = 300000) {
    if (this._workerInterval) return;
    this._workerInterval = setInterval(async () => {
      try {
        await this.reconcilePendingPayments(15);
        await this.reconcilePendingRefunds(10);
      } catch (err) {
        console.error("[ReconciliationWorker] Error during reconciliation:", err.message);
      }
    }, intervalMs);

    if (this._workerInterval && this._workerInterval.unref) {
      this._workerInterval.unref();
    }
  }

  /**
   * Stop recurring background reconciliation job.
   */
  static stopReconciliationWorker() {
    if (this._workerInterval) {
      clearInterval(this._workerInterval);
      this._workerInterval = null;
    }
  }
}

module.exports = ReconciliationService;
