"use strict";

const Order = require("../models/order");

/**
 * Order state transitions.
 *
 * Moving an order between states (pay, fail, cancel, expire) also moves stock
 * between the available / reserved / sold buckets and may touch coupons. Those
 * side effects must run exactly once per order, which is impossible with a
 * "read the order, check its status in memory, save" sequence: two overlapping
 * requests (client verify + Razorpay webhook, a double-clicked cancel, an
 * expiry sweep racing a payment) would both pass the in-memory check and both
 * apply their side effects, or the slower one would overwrite the newer state.
 *
 * `transitionOrder` performs the status change as a single atomic
 * compare-and-set in MongoDB. Exactly one caller can win a given transition;
 * only the winner may apply the side effects, using the order as it was
 * *before* the transition (`previous`).
 */

/**
 * Atomically moves an order to a new status if (and only if) it is currently
 * in one of the allowed `from` statuses and matches the optional extra filter.
 *
 * @param {string|import("mongoose").Types.ObjectId} orderId
 * @param {object} options
 * @param {string[]} options.from   Statuses the order may currently be in.
 * @param {string} options.to       Target status.
 * @param {object} [options.set]    Extra fields to set in the same atomic write.
 * @param {string} [options.note]   Timeline note for this transition.
 * @param {object} [options.filter] Extra query conditions (e.g. owner, paymentStatus).
 * @returns {Promise<{previous: object, order: object}|null>}
 *   `previous` is the order before the change, `order` the order after it.
 *   Returns null when the order was not in an allowed state (lost the race,
 *   or the transition is not valid any more).
 */
async function transitionOrder(
  orderId,
  { from, to, set = {}, note = "", filter = {} },
) {
  const previous = await Order.findOneAndUpdate(
    { _id: orderId, status: { $in: from }, ...filter },
    {
      $set: { status: to, ...set },
      $push: { timeline: { status: to, note, timestamp: new Date() } },
    },
    { new: false, runValidators: true },
  );

  if (!previous) return null;

  const order = await Order.findById(orderId);
  return { previous, order };
}

module.exports = { transitionOrder };
