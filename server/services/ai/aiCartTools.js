"use strict";

const mongoose = require("mongoose");
const Product = require("../../models/product");
const Cart = require("../../models/cart");

function isValidObjectId(id) {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
}

/**
 * Server-authoritative tool for applying an AI-recommended product to a customer's cart.
 * Enforces strict backend validation: product existence, active status, quantity bounds,
 * stock availability, and single-store cart isolation.
 *
 * @param {object} params
 * @param {string} params.userId     - Authenticated customer ID
 * @param {string} params.productId  - Product ObjectId
 * @param {number} [params.quantity] - Quantity to add (1..50)
 * @returns {Promise<object>}
 */
async function validateAndApplyCartAction({ userId, productId, quantity = 1 } = {}) {
  if (!isValidObjectId(userId)) {
    throw new Error("validateAndApplyCartAction: Invalid or missing userId");
  }
  if (!isValidObjectId(productId)) {
    throw new Error("validateAndApplyCartAction: Invalid or missing productId");
  }

  const parsedQty = parseInt(quantity, 10);
  if (isNaN(parsedQty) || parsedQty <= 0 || parsedQty > 50) {
    throw new Error(
      `validateAndApplyCartAction: Invalid quantity (${quantity}). Must be an integer between 1 and 50.`
    );
  }

  const product = await Product.findById(productId);
  if (!product || product.available === false) {
    throw new Error(
      "validateAndApplyCartAction: Product does not exist or is unavailable"
    );
  }

  if (product.availableStock < parsedQty || product.stock < parsedQty) {
    throw new Error(
      `validateAndApplyCartAction: Insufficient stock for "${product.name}". Requested: ${parsedQty}, Available: ${product.availableStock}`
    );
  }

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [], store: product.store });
  }

  // Cross-store validation
  if (
    cart.store &&
    cart.items.length > 0 &&
    cart.store.toString() !== product.store.toString()
  ) {
    throw new Error(
      "CROSS_STORE_CONFLICT: Cannot add products from multiple stores to the same cart"
    );
  }

  if (!cart.store || cart.items.length === 0) {
    cart.store = product.store;
  }

  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId.toString()
  );

  if (existingItemIndex > -1) {
    const newTotalQty = cart.items[existingItemIndex].quantity + parsedQty;
    if (product.availableStock < newTotalQty) {
      throw new Error(
        `validateAndApplyCartAction: Cannot add ${parsedQty} more. Total in cart (${newTotalQty}) exceeds available stock (${product.availableStock})`
      );
    }
    cart.items[existingItemIndex].quantity = newTotalQty;
  } else {
    cart.items.push({ product: product._id, quantity: parsedQty });
  }

  await cart.save();
  await cart.populate("items.product", "name price category availableStock image");

  return {
    success: true,
    message: `Added ${parsedQty}x "${product.name}" to cart`,
    cart: {
      storeId: cart.store.toString(),
      itemCount: cart.items.length,
      items: cart.items,
    },
  };
}

module.exports = {
  validateAndApplyCartAction,
};
