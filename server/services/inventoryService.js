"use strict";

const mongoose = require("mongoose");
const Product = require("../models/product");
const Order = require("../models/order");

/**
 * Smart Inventory Service
 * Manages atomic inventory reservations, commits upon payment, and safe rollbacks.
 */
class InventoryService {
  /**
   * Atomically reserve stock for checkout.
   * @param {Array<{productId: string, quantity: number}>} items 
   * @param {number} ttlMinutes 
   * @returns {Promise<{success: boolean, expiresAt: Date, reservedItems: Array}>}
   */
  static async reserveStock(items, ttlMinutes = 15) {
    const reservedItems = [];
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    try {
      for (const item of items) {
        const pid = item.productId || item.product || item._id;
        const qty = parseInt(item.quantity, 10);

        if (!pid || !mongoose.Types.ObjectId.isValid(pid) || isNaN(qty) || qty <= 0) {
          throw new Error(`Invalid product ID or quantity: ${pid}`);
        }

        // Atomic reservation: check availableStock >= qty
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

        if (!updated) {
          const product = await Product.findById(pid);
          const currentAvailable = product ? product.availableStock : 0;
          const prodName = product ? product.name : "Product";
          throw new Error(
            `Insufficient available stock for "${prodName}". Requested: ${qty}, Available: ${currentAvailable}`
          );
        }

        reservedItems.push({
          productId: pid,
          productName: updated.name,
          quantity: qty,
          unitPrice: updated.price
        });
      }

      return {
        success: true,
        expiresAt,
        reservedItems
      };
    } catch (err) {
      // Rollback any reserved items in this batch
      for (const rollbackItem of reservedItems) {
        await Product.updateOne(
          { _id: rollbackItem.productId },
          {
            $inc: {
              availableStock: rollbackItem.quantity,
              reservedStock: -rollbackItem.quantity
            }
          }
        ).catch(() => {});
      }
      throw err;
    }
  }

  /**
   * Commit reserved stock to sold stock upon successful payment verification.
   * @param {Array<{product: string, quantity: number}>} items 
   */
  static async commitReservation(items) {
    for (const item of items) {
      const pid = item.product || item.productId;
      const qty = parseInt(item.quantity, 10);
      if (!pid || !qty) continue;

      await Product.updateOne(
        { _id: pid },
        {
          $inc: {
            reservedStock: -qty,
            soldStock: qty,
            stock: -qty
          }
        }
      );
    }
  }

  /**
   * Release reserved stock back to available stock (e.g., checkout abandoned or payment failed).
   * @param {Array<{product: string, quantity: number}>} items 
   */
  static async releaseReservation(items) {
    for (const item of items) {
      const pid = item.product || item.productId;
      const qty = parseInt(item.quantity, 10);
      if (!pid || !qty) continue;

      await Product.updateOne(
        { _id: pid },
        {
          $inc: {
            availableStock: qty,
            reservedStock: -qty
          }
        }
      );
    }
  }

  /**
   * Scan for expired pending_payment orders and atomically release their reservations.
   * Race-safe & idempotent: Uses atomic findOneAndUpdate per candidate order so only 1 runner transitions the order.
   */
  static async cleanupExpiredReservations() {
    try {
      const expirationThreshold = new Date(Date.now() - 15 * 60 * 1000);
      const candidates = await Order.find({
        status: "pending_payment",
        createdAt: { $lt: expirationThreshold },
      }).select("_id items");

      let cleanedCount = 0;

      for (const candidate of candidates) {
        // Atomically claim and expire the order
        const claimedOrder = await Order.findOneAndUpdate(
          {
            _id: candidate._id,
            status: "pending_payment",
          },
          {
            $set: {
              status: "payment_failed",
              paymentStatus: "failed",
            },
            $push: {
              timeline: {
                status: "payment_failed",
                note: "Reservation expired after 15 minutes of inactivity",
                timestamp: new Date(),
              },
            },
          },
          { new: false }
        );

        if (claimedOrder) {
          cleanedCount++;
          await this.releaseReservation(claimedOrder.items);
        }
      }

      return cleanedCount;
    } catch (err) {
      console.error("Cleanup expired reservations error:", err);
      return 0;
    }
  }

  /**
   * Start recurring background worker for reservation cleanup.
   * @param {number} intervalMs 
   */
  static startCleanupWorker(intervalMs = 60000) {
    if (this._workerInterval) return;
    this._isCleaning = false;
    this._workerInterval = setInterval(async () => {
      if (this._isCleaning) return;
      this._isCleaning = true;
      try {
        const cleaned = await this.cleanupExpiredReservations();
        if (cleaned > 0) {
          console.log(`[InventoryWorker] Cleaned up ${cleaned} expired reservation(s).`);
        }
      } catch (err) {
        console.error("[InventoryWorker] Error during cleanup:", err.message);
      } finally {
        this._isCleaning = false;
      }
    }, intervalMs);

    if (this._workerInterval && this._workerInterval.unref) {
      this._workerInterval.unref();
    }
  }

  /**
   * Stop recurring background worker.
   */
  static stopCleanupWorker() {
    if (this._workerInterval) {
      clearInterval(this._workerInterval);
      this._workerInterval = null;
    }
    this._isCleaning = false;
  }
}

module.exports = InventoryService;
