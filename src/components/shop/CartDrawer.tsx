"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  X,
  Plus,
  Minus,
  Trash2,
  Store as StoreIcon,
  Truck,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Loader2,
  CheckCircle2,
  CreditCard,
  AlertTriangle,
  Tag,
  Banknote,
} from "lucide-react";
import { CartItem, Store } from "./types";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Badge } from "@/components/ui/Badge";

// Razorpay Checkout script loader
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  cartStore: Store | null;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckoutSuccess?: () => void;
}

type CheckoutStep = "cart" | "address" | "processing" | "razorpay" | "success" | "failed";

export function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  cartStore,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckoutSuccess,
}: CartDrawerProps) {
  const [step, setStep] = useState<CheckoutStep>("cart");
  const [address, setAddress] = useState("Flat 402, Green Glen Layout, HSR Sector 2");
  const [phone, setPhone] = useState("9876543210");
  const [name, setName] = useState("Kirana Customer");
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderComplete, setOrderComplete] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const [sandboxInfo, setSandboxInfo] = useState<{
    orderId: string;
    paymentData: any;
    token: string;
  } | null>(null);

  // Load Razorpay Checkout SDK
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => setRazorpayLoaded(true);
      script.onerror = () => {
        console.warn("Razorpay SDK failed to load — sandbox mode will be used");
        setRazorpayLoaded(false);
      };
      document.head.appendChild(script);
    } else if (window.Razorpay) {
      setRazorpayLoaded(true);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
      setStep("cart");
      setOrderComplete(null);
      setPaymentError(null);
      setOrderId(null);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  const deliveryFee = subtotal > 300 || subtotal === 0 ? 0 : 25;
  const discount = couponDiscount;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  // ── Apply coupon server-side ──
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");
    const token = localStorage.getItem("token");
    if (!token) {
      setCouponError("Please log in to apply coupons.");
      return;
    }
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: couponCode.trim(),
          subtotal,
          deliveryFee,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.message || "Invalid coupon");
        return;
      }
      setCouponApplied(data.code);
      setCouponDiscount(data.discountAmount || 0);
    } catch {
      setCouponError("Failed to validate coupon. Try again.");
    }
  };

  const removeCoupon = () => {
    setCouponApplied(null);
    setCouponDiscount(0);
    setCouponCode("");
    setCouponError("");
  };

  // ── Sync basket to backend DB cart before placing order ──
  const syncCartToBackend = async (token: string) => {
    const targetStoreId =
      cartStore?._id ||
      (typeof cartItems[0]?.product?.store === "object"
        ? (cartItems[0]?.product?.store as any)?._id
        : cartItems[0]?.product?.store);

    if (targetStoreId && cartItems.length > 0) {
      try {
        const syncRes = await fetch("/api/customer/cart/basket", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            storeId: targetStoreId,
            clearExisting: true,
            items: cartItems.map((ci) => ({
              productId: ci.product._id,
              quantity: ci.quantity,
            })),
          }),
        });
        if (!syncRes.ok) {
          const syncData = await syncRes.json().catch(() => ({}));
          console.warn("Basket sync notice:", syncData.message);
        }
      } catch (syncErr) {
        console.warn("Basket sync error:", syncErr);
      }
    }
  };

  // ── Step 1: Place order → Step 2: Create Razorpay order → Step 3: Open Razorpay Checkout ──
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please log in to complete your order.");
      window.location.href = "/customer/login";
      return;
    }

    setLoadingOrder(true);
    setPaymentError(null);
    setStep("processing");

    try {
      // Ensure backend cart is synced with frontend items
      await syncCartToBackend(token);

      // ── 1. Create order on backend (server calculates final amount) ──
      const orderRes = await fetch("/api/customer/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deliveryAddress: {
            fullName: name,
            phone,
            address,
            city: "Bengaluru",
            pincode: "560102",
          },
          couponCode: couponApplied || undefined,
          paymentMethod,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.message || orderData.error || "Order creation failed.");
      }

      const createdOrderId = orderData.order?._id || orderData._id;
      if (!createdOrderId) {
        throw new Error("Order created but no order ID returned.");
      }
      setOrderId(createdOrderId);

      // If Cash on Delivery, order is confirmed immediately
      if (paymentMethod === "cod") {
        setOrderComplete(createdOrderId);
        setStep("success");
        onClearCart();
        if (onCheckoutSuccess) onCheckoutSuccess();
        return;
      }

      // ── 2. Create Razorpay payment order ──
      const paymentRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: createdOrderId,
        }),
      });

      const paymentData = await paymentRes.json();
      if (!paymentRes.ok || !paymentData.success) {
        throw new Error(paymentData.message || "Failed to create payment order.");
      }

      // ── 3. Open Razorpay Checkout or handle sandbox ──
      if (paymentData.isSandbox) {
        setSandboxInfo({ orderId: createdOrderId, paymentData, token });
        setStep("razorpay");
      } else {
        await openRazorpayCheckout(createdOrderId, paymentData, token);
      }
    } catch (err: unknown) {
      setStep("failed");
      if (err instanceof Error) {
        setPaymentError(err.message);
      } else {
        setPaymentError("An unexpected error occurred during checkout.");
      }
    } finally {
      setLoadingOrder(false);
    }
  };

  // ── Open real Razorpay Checkout ──
  const openRazorpayCheckout = async (
    currentOrderId: string,
    paymentData: any,
    token: string
  ) => {
    if (!window.Razorpay) {
      // Graceful fallback to sandbox if SDK blocked or offline
      console.warn("Razorpay SDK not available, falling back to sandbox simulator");
      setSandboxInfo({ orderId: currentOrderId, paymentData, token });
      setStep("razorpay");
      return;
    }

    setStep("razorpay");

    return new Promise<void>((resolve, reject) => {
      const options = {
        key: paymentData.keyId,
        amount: paymentData.amount,
        currency: paymentData.currency || "INR",
        name: "KiranaWala",
        description: `Order #${currentOrderId.slice(-6).toUpperCase()} Payment`,
        order_id: paymentData.razorpayOrderId,
        prefill: {
          name,
          contact: phone,
        },
        theme: {
          color: "#0B051D",
        },
        modal: {
          ondismiss: async () => {
            // User closed Razorpay modal without completing
            try {
              await fetch("/api/payments/failure", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  orderId: currentOrderId,
                  razorpayOrderId: paymentData.razorpayOrderId,
                  reason: "Customer dismissed payment modal",
                }),
              });
            } catch { /* best effort */ }
            setStep("failed");
            setPaymentError("Payment was cancelled. Your order reservation is released — you can retry.");
            resolve();
          },
        },
        handler: async function (response: any) {
          // Payment completed — verify on backend
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                orderId: currentOrderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.message || "Payment verification failed.");
            }

            setOrderComplete(currentOrderId);
            setStep("success");
            onClearCart();
            if (onCheckoutSuccess) onCheckoutSuccess();
            resolve();
          } catch (verifyErr: any) {
            setStep("failed");
            setPaymentError(
              verifyErr.message || "Payment completed but verification failed. Contact support."
            );
            reject(verifyErr);
          }
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", async function (response: any) {
        try {
          await fetch("/api/payments/failure", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              orderId: currentOrderId,
              razorpayOrderId: paymentData.razorpayOrderId,
              razorpayPaymentId: response.error?.metadata?.payment_id,
              reason: response.error?.description || "Payment failed",
            }),
          });
        } catch { /* best effort */ }
        setStep("failed");
        setPaymentError(response.error?.description || "Payment failed. Please try again.");
        resolve();
      });

      rzp.open();
    });
  };

  // ── Sandbox payment simulation confirmation ──
  const handleConfirmSandboxPayment = async () => {
    if (!sandboxInfo) return;
    setLoadingOrder(true);
    try {
      const mockPaymentId = `pay_mock_${Date.now()}`;
      const mockSignature = `mock_sig_${Date.now()}`;

      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sandboxInfo.token}`,
        },
        body: JSON.stringify({
          orderId: sandboxInfo.orderId,
          razorpayOrderId: sandboxInfo.paymentData.razorpayOrderId,
          razorpayPaymentId: mockPaymentId,
          razorpaySignature: mockSignature,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.message || "Sandbox payment verification failed.");
      }

      setOrderComplete(sandboxInfo.orderId);
      setStep("success");
      onClearCart();
      if (onCheckoutSuccess) onCheckoutSuccess();
    } catch (err: any) {
      setStep("failed");
      setPaymentError(err.message || "Sandbox payment verification failed.");
    } finally {
      setLoadingOrder(false);
      setSandboxInfo(null);
    }
  };

  // ── Sandbox payment simulation cancellation ──
  const handleCancelSandboxPayment = async () => {
    if (!sandboxInfo) return;
    setLoadingOrder(true);
    try {
      await fetch("/api/payments/failure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sandboxInfo.token}`,
        },
        body: JSON.stringify({
          orderId: sandboxInfo.orderId,
          razorpayOrderId: sandboxInfo.paymentData.razorpayOrderId,
          reason: "Customer cancelled sandbox simulation",
        }),
      });
    } catch { /* best effort */ }
    setStep("failed");
    setPaymentError("Payment was cancelled. Your basket remains intact.");
    setLoadingOrder(false);
    setSandboxInfo(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#E8E2D9] px-6 py-4">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-[#0B051D]">
              {step === "address" ? "Checkout" : step === "processing" || step === "razorpay" ? "Processing Payment" : step === "success" ? "Order Confirmed" : step === "failed" ? "Payment Issue" : "Your Grocery Basket"}
            </h2>
            {step === "cart" && (
              <span className="rounded-full bg-[#FAD2DE] px-2 py-0.5 text-xs font-bold text-[#0B051D]">
                {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart drawer"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8E2D9] text-[#0B051D] hover:bg-[#F8F7FA]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3-Step Wizard Indicator */}
        {step !== "success" && step !== "failed" && step !== "processing" && (
          <div className="flex items-center justify-between border-b border-[#E8E2D9] px-6 py-2.5 bg-[#FAF8F5] text-xs">
            <div className={`flex items-center gap-1.5 font-bold ${step === "cart" ? "text-[#0B051D]" : "text-[#94A3B8]"}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step === "cart" ? "bg-[#0B051D] text-white" : "bg-[#E8E2D9] text-[#64748B]"}`}>1</span>
              <span>Basket</span>
            </div>
            <span className="text-[#CBD5E1]">→</span>
            <div className={`flex items-center gap-1.5 font-bold ${step === "address" ? "text-[#0B051D]" : "text-[#94A3B8]"}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step === "address" ? "bg-[#0B051D] text-white" : "bg-[#E8E2D9] text-[#64748B]"}`}>2</span>
              <span>Delivery &amp; Payment</span>
            </div>
            <span className="text-[#CBD5E1]">→</span>
            <div className="flex items-center gap-1.5 font-medium text-[#94A3B8]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] bg-[#E8E2D9] text-[#64748B]">3</span>
              <span>Done</span>
            </div>
          </div>
        )}

        {/* Store Context Badge */}
        {cartStore && cartItems.length > 0 && step === "cart" && (
          <div className="flex items-center justify-between bg-white border-b border-[#E8E2D9] px-6 py-2.5 text-xs">
            <div className="flex items-center gap-2 truncate text-[#475569]">
              <StoreIcon className="h-3.5 w-3.5 text-[#059669] shrink-0" />
              <span className="font-semibold text-[#0B051D] truncate">{cartStore.name}</span>
            </div>
            <span className="shrink-0 text-[11px] font-bold text-[#059669]">
              15–20 Min Delivery
            </span>
          </div>
        )}

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ── SUCCESS ── */}
          {step === "success" && orderComplete ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ECFDF5] text-[#059669]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="font-display text-2xl font-black text-[#0B051D]">
                Order Confirmed!
              </h3>
              <p className="text-xs text-[#504F5F] max-w-xs leading-relaxed">
                Your payment has been verified and order #{orderComplete.slice(-6).toUpperCase()} has been sent to {cartStore?.name || "your local store"}.
              </p>
              <div className="rounded-xl bg-[#ECFDF5] border border-[#059669]/20 px-4 py-2 text-xs text-[#059669] font-medium flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Payment verified securely
              </div>
              <div className="pt-4">
                <Link
                  href="/customer/orders"
                  onClick={onClose}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#0B051D] px-6 text-xs font-bold text-white transition-all hover:bg-[#2C2242]"
                >
                  Track Order in Dashboard →
                </Link>
              </div>
            </div>
          ) : step === "failed" ? (
            /* ── PAYMENT FAILED ── */
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF1F2] text-[#E11D48]">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h3 className="font-display text-xl font-black text-[#0B051D]">
                Payment Issue
              </h3>
              <p className="text-xs text-[#504F5F] max-w-xs leading-relaxed">
                {paymentError || "Something went wrong with your payment."}
              </p>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep("cart");
                    setPaymentError(null);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#E8E2D9] px-5 text-xs font-bold text-[#0B051D] hover:bg-[#F8F7FA]"
                >
                  Back to Basket
                </button>
                {orderId && (
                  <button
                    type="button"
                    onClick={() => setStep("address")}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#0B051D] px-5 text-xs font-bold text-white hover:bg-[#2C2242]"
                  >
                    Retry Payment
                  </button>
                )}
              </div>
            </div>
          ) : step === "processing" || step === "razorpay" ? (
            /* ── PROCESSING / RAZORPAY OPEN ── */
            sandboxInfo ? (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                <div className="w-full rounded-2xl border-2 border-[#D9531E]/30 bg-[#FAF8F5] p-5 text-left space-y-4 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 rounded-full bg-[#059669] animate-pulse" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-[#0B051D]">
                        Razorpay Test Gateway
                      </h4>
                    </div>
                    <span className="rounded-full bg-[#D9531E]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#D9531E]">
                      Sandbox Mode
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#64748B]">
                      <span>Order Reference</span>
                      <span className="font-mono font-bold text-[#0B051D]">
                        #{sandboxInfo.orderId.slice(-6).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#64748B]">
                      <span>Razorpay Order ID</span>
                      <span className="font-mono text-[11px] text-[#0B051D]">
                        {sandboxInfo.paymentData.razorpayOrderId}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-[#0B051D] pt-2 border-t border-[#E8E2D9]">
                      <span>Payable Amount</span>
                      <span>₹{total}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#64748B] leading-relaxed">
                    Local development sandbox is active. You can simulate instant payment success or test failure handling:
                  </p>

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleConfirmSandboxPayment}
                      disabled={loadingOrder}
                      className="w-full h-11 rounded-full bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {loadingOrder ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Verifying Payment...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Simulate Successful Payment (₹{total})</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelSandboxPayment}
                      disabled={loadingOrder}
                      className="w-full h-9 rounded-full border border-[#E8E2D9] hover:bg-[#F8F7FA] text-[#64748B] hover:text-[#DC2626] font-medium text-xs transition-colors cursor-pointer"
                    >
                      Simulate Payment Failure / Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="relative">
                  <div className="h-14 w-14 animate-spin rounded-full border-3 border-[#0B051D] border-t-transparent" />
                  <CreditCard className="absolute inset-0 m-auto h-5 w-5 text-[#0B051D]" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#0B051D]">
                  {step === "razorpay" ? "Complete Payment" : "Creating Your Order..."}
                </h3>
                <p className="text-xs text-[#504F5F] max-w-xs">
                  {step === "razorpay"
                    ? "Razorpay checkout modal is active. Complete your transaction to confirm the order."
                    : "Validating cart, reserving inventory, and preparing your payment..."}
                </p>
              </div>
            )
          ) : cartItems.length === 0 ? (
            /* ── EMPTY CART ── */
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F8F7FA] text-[#94A3B8]">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#0B051D]">
                Your basket is empty
              </h3>
              <p className="text-xs text-[#64748B] max-w-xs">
                Explore local fresh produce, grains, and dairy from nearby stores.
              </p>
            </div>
          ) : step === "address" ? (
            /* ── CHECKOUT STEP (Address + Payment) ── */
            <form onSubmit={handlePlaceOrder} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D9]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  Delivery & Payment
                </span>
                <button
                  type="button"
                  onClick={() => setStep("cart")}
                  className="text-xs font-bold text-[#0B051D] underline"
                >
                  Back to basket
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 rounded-full border border-[#E8E2D9] px-4 text-xs text-[#0B051D] focus:outline-none focus:ring-1 focus:ring-[#0B051D]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-10 rounded-full border border-[#E8E2D9] px-4 text-xs text-[#0B051D] focus:outline-none focus:ring-1 focus:ring-[#0B051D]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">
                  Delivery Address (HSR Layout / Bengaluru)
                </label>
                <textarea
                  required
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-2xl border border-[#E8E2D9] p-3 text-xs text-[#0B051D] focus:outline-none focus:ring-1 focus:ring-[#0B051D]"
                />
              </div>

              {/* Coupon */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-[#475569]">
                  Coupon Code (Optional)
                </label>
                {couponApplied ? (
                  <div className="flex items-center justify-between rounded-xl border border-[#059669]/30 bg-[#ECFDF5] px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-[#059669] font-medium">
                      <Tag className="h-3.5 w-3.5" />
                      <span>{couponApplied} applied — ₹{couponDiscount} off</span>
                    </div>
                    <button type="button" onClick={removeCoupon} className="text-xs text-[#E11D48] font-bold">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="e.g. KIRANA50"
                      className="flex-1 h-9 rounded-full border border-[#E8E2D9] px-3 text-xs text-[#0B051D] focus:outline-none focus:ring-1 focus:ring-[#0B051D]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="h-9 rounded-full bg-[#0B051D] px-4 text-xs font-bold text-white hover:bg-[#2C2242]"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {couponError && (
                  <p className="text-[11px] text-[#E11D48]">{couponError}</p>
                )}
              </div>

              {/* Order Summary */}
              <div className="rounded-xl border border-[#E8E2D9] bg-[#FAF8F5] p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#504F5F]">Subtotal</span>
                  <span className="font-semibold text-[#0B051D]">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#504F5F]">Delivery</span>
                  <span className="font-semibold text-[#059669]">
                    {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#059669]">Coupon Discount</span>
                    <span className="font-semibold text-[#059669]">-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-[#E8E2D9] text-sm font-bold text-[#0B051D]">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-[#475569]">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("razorpay")}
                    className={`flex flex-col text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                      paymentMethod === "razorpay"
                        ? "border-[#0B051D] bg-white ring-1.5 ring-[#0B051D] shadow-xs"
                        : "border-[#E8E2D9] bg-[#FAF8F5] hover:bg-white hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B051D]">
                      <CreditCard className="h-3.5 w-3.5 text-[#059669]" />
                      <span>Razorpay</span>
                    </div>
                    <span className="text-[10px] text-[#64748B] mt-1 leading-tight">
                      UPI, Cards & NetBanking
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    className={`flex flex-col text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                      paymentMethod === "cod"
                        ? "border-[#0B051D] bg-white ring-1.5 ring-[#0B051D] shadow-xs"
                        : "border-[#E8E2D9] bg-[#FAF8F5] hover:bg-white hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B051D]">
                      <Banknote className="h-3.5 w-3.5 text-[#D9531E]" />
                      <span>Pay on Delivery</span>
                    </div>
                    <span className="text-[10px] text-[#64748B] mt-1 leading-tight">
                      Cash or UPI at doorstep
                    </span>
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loadingOrder}
                className="w-full justify-center mt-4"
              >
                {paymentMethod === "razorpay"
                  ? `Pay ₹${total} with Razorpay`
                  : `Place Order (Cash on Delivery)`}
              </Button>
            </form>
          ) : (
            /* ── ITEMS LIST ── */
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div
                  key={item.product._id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[#E8E2D9] bg-white p-3 shadow-xs hover:border-[#0B051D] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 shrink-0 rounded-xl bg-[#F8F7FA] border border-[#E8E2D9] flex items-center justify-center overflow-hidden p-1">
                      {item.product.image ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="h-full w-full object-contain mix-blend-multiply"
                        />
                      ) : (
                        <ShoppingBag className="h-5 w-5 text-[#94A3B8]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-[#0B051D] truncate">
                        {item.product.name}
                      </h4>
                      <span className="text-[11px] text-[#64748B] block tabular-nums">
                        ₹{item.product.price} each
                      </span>
                    </div>
                  </div>

                  {/* Quantity Stepper & Item Total */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <QuantityStepper
                      quantity={item.quantity}
                      size="sm"
                      showTrashOnOne={true}
                      onIncrement={() =>
                        onUpdateQuantity(item.product._id, item.quantity + 1)
                      }
                      onDecrement={() => {
                        if (item.quantity <= 1) {
                          onRemoveItem(item.product._id);
                        } else {
                          onUpdateQuantity(item.product._id, item.quantity - 1);
                        }
                      }}
                    />

                    <span className="w-12 text-right text-xs font-bold text-[#0B051D] tabular-nums">
                      ₹{item.product.price * item.quantity}
                    </span>
                  </div>
                </div>
              ))}

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-[11px] font-medium text-[#94A3B8] hover:text-[#DC2626] transition-colors cursor-pointer"
                >
                  Clear basket
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Summary (if on cart step with items) */}
        {step === "cart" && cartItems.length > 0 && (
          <div className="border-t border-[#E8E2D9] bg-[#FAF8F5] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-4">
            <div className="space-y-1.5 text-xs text-[#504F5F]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-[#0B051D] tabular-nums">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery (Neighborhood Kirana)</span>
                <span className="font-semibold text-[#059669]">
                  {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Direct shelf markup</span>
                <span className="font-semibold text-[#059669]">₹0 (Guaranteed)</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E8E2D9] text-sm font-bold text-[#0B051D]">
                <span>Total</span>
                <span className="tabular-nums">₹{total}</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center"
              onClick={() => setStep("address")}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
