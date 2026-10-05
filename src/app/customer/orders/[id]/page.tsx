"use strict";
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Store as StoreIcon,
  Truck,
  RotateCw,
  AlertCircle,
  Package,
} from "lucide-react";

interface OrderTrackingData {
  success: boolean;
  orderId: string;
  currentStatus: string;
  etaMinutes: number;
  deliveryOtp: string;
  store: {
    _id: string;
    name: string;
    category: string;
    address?: string;
    phone?: string;
    rating?: number;
  };
  runner: {
    name: string;
    phone: string;
    rating: number;
    vehicle: string;
  } | null;
  stages: Array<{
    key: string;
    label: string;
    done: boolean;
  }>;
  timeline: Array<{
    status: string;
    note: string;
    timestamp: string;
  }>;
}

import { useRouter } from "next/navigation";
import { getStoredAuth, isMerchant, isCustomer, clearStoredAuth } from "@/lib/auth";

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [tracking, setTracking] = useState<OrderTrackingData | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Role Protection: Merchants cannot enter buyer order pages
  useEffect(() => {
    const { token, role } = getStoredAuth();
    if (!token) {
      router.replace("/customer/login");
      return;
    }
    if (isMerchant(role)) {
      router.replace("/merchant/dashboard");
      return;
    }
    if (!isCustomer(role)) {
      router.replace("/customer/login");
      return;
    }
  }, [router]);

  const fetchTracking = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/delivery/orders/${orderId}/track`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load tracking data");
      }
      setTracking(data);

      // Also fetch order details for items summary
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) {
        const orderRes = await fetch(`/api/customer/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (orderRes.ok) {
          const oData = await orderRes.json();
          setOrderDetails(oData);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load order tracking");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(() => {
      fetchTracking();
    }, 10000); // 10s live poll
    return () => clearInterval(interval);
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this order? Stock will be released.")) {
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/customer/orders/${orderId}/cancel`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel order");
      alert("Order cancelled successfully.");
      fetchTracking(true);
    } catch (err: any) {
      alert(err.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] pt-12 pb-24 text-[#0B051D]">
        <div className="kw-container max-w-3xl flex flex-col items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#0B051D] border-t-transparent" />
          <p className="mt-4 text-sm font-semibold text-[#504F5F]">Connecting to live delivery runner...</p>
        </div>
      </main>
    );
  }

  if (error || !tracking) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] pt-12 pb-24 text-[#0B051D]">
        <div className="kw-container max-w-xl text-center py-20 space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-[#E11D48]" />
          <h1 className="font-display text-2xl font-bold">Unable to track order</h1>
          <p className="text-sm text-[#504F5F]">{error || "Order not found"}</p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-full bg-[#0B051D] text-white px-6 py-2.5 text-xs font-bold"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Marketplace</span>
          </Link>
        </div>
      </main>
    );
  }

  const isDelivered = tracking.currentStatus === "delivered";
  const isCancelled = tracking.currentStatus === "cancelled";

  return (
    <main className="min-h-screen bg-[#FAF8F5] pt-8 sm:pt-12 pb-24 text-[#0B051D]">
      <div className="kw-container max-w-3xl space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/customer/products"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#504F5F] hover:text-[#0B051D] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Marketplace</span>
          </Link>

          <button
            onClick={() => fetchTracking(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E2D9] bg-white px-3 py-1.5 text-xs font-bold text-[#0B051D] hover:bg-[#F2EFE9] transition-all cursor-pointer shadow-2xs"
          >
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Updating..." : "Live Refresh"}</span>
          </button>
        </div>

        {/* Hero Order Status Card */}
        <div className="rounded-3xl bg-white border border-[#E8E2D9] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F2EFE9] pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#504F5F] uppercase tracking-wider">
                <span>Order Tracking</span>
                <span>•</span>
                <span className="text-[#0B051D] font-mono">#{orderId.slice(-8).toUpperCase()}</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black text-[#0B051D] mt-1">
                {isDelivered
                  ? "Delivered to your doorstep"
                  : isCancelled
                  ? "Order Cancelled"
                  : `Arriving in ~${tracking.etaMinutes} minutes`}
              </h1>
            </div>

            {/* Delivery OTP Badge */}
            {tracking.deliveryOtp && !isDelivered && !isCancelled && (
              <div className="rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] p-4 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#065F46] block">
                  Delivery OTP
                </span>
                <span className="font-mono text-2xl font-black text-[#065F46] tracking-widest">
                  {tracking.deliveryOtp}
                </span>
                <span className="text-[10px] text-[#047857] block mt-0.5">Share with runner</span>
              </div>
            )}
          </div>

          {/* Visual Step Progression */}
          {!isCancelled && (
            <div className="py-2">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {tracking.stages.map((stage, idx) => (
                  <div
                    key={stage.key}
                    className={`rounded-2xl p-3 border text-center transition-all ${
                      stage.done
                        ? "bg-[#0B051D] text-white border-[#0B051D]"
                        : "bg-[#FAF8F5] text-[#8C8794] border-[#E8E2D9]"
                    }`}
                  >
                    <div className="text-[10px] font-bold opacity-70">Step {idx + 1}</div>
                    <div className="text-xs font-bold mt-1 line-clamp-1">{stage.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Runner Card */}
          {tracking.runner && (
            <div className="rounded-2xl bg-[#FAF8F5] border border-[#E8E2D9] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B051D] text-white shrink-0">
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#504F5F]">Your Delivery Partner</div>
                  <div className="font-bold text-[#0B051D] text-base">{tracking.runner.name}</div>
                  <div className="text-xs text-[#059669] font-medium flex items-center gap-1.5 mt-0.5">
                    <span>★ {tracking.runner.rating}</span>
                    <span>•</span>
                    <span>{tracking.runner.vehicle}</span>
                  </div>
                </div>
              </div>

              <a
                href={`tel:${tracking.runner.phone}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white border border-[#E8E2D9] hover:border-[#0B051D] text-[#0B051D] text-xs font-bold px-4 py-2.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Call Partner</span>
              </a>
            </div>
          )}

          {/* Store Info */}
          <div className="rounded-2xl border border-[#E8E2D9] p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FAF8F5] text-[#0B051D] border border-[#E8E2D9]">
                <StoreIcon className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold text-[#0B051D]">{tracking.store.name}</div>
                <div className="text-[#504F5F]">{tracking.store.category || "Neighborhood Kirana"}</div>
              </div>
            </div>

            <div className="text-right">
              <span className="font-bold text-[#059669]">Verified Partner</span>
              <div className="text-[11px] text-[#504F5F]">Zero platform markups</div>
            </div>
          </div>
        </div>

        {/* Order Details & Summary Card */}
        {orderDetails && (
          <div className="rounded-3xl bg-white border border-[#E8E2D9] p-6 sm:p-8 shadow-xs space-y-5">
            <h2 className="font-display text-lg font-bold text-[#0B051D] flex items-center gap-2">
              <Package className="h-5 w-5 text-[#504F5F]" />
              <span>Items in this delivery ({orderDetails.items?.length || 0})</span>
            </h2>

            <div className="divide-y divide-[#F2EFE9]">
              {orderDetails.items?.map((item: any, idx: number) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#0B051D]">{item.productNameSnapshot || "Grocery Item"}</span>
                    <span className="text-[#504F5F] ml-2">× {item.quantity}</span>
                  </div>
                  <span className="font-bold text-[#0B051D]">₹{item.subtotal || item.unitPrice * item.quantity}</span>
                </div>
              ))}
            </div>

            {/* Price Breakdown */}
            <div className="border-t border-[#E8E2D9] pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-[#504F5F]">
                <span>Item Subtotal</span>
                <span>₹{orderDetails.subtotal}</span>
              </div>
              {orderDetails.discount > 0 && (
                <div className="flex justify-between text-[#059669] font-bold">
                  <span>Coupon Savings ({orderDetails.couponCode})</span>
                  <span>-₹{orderDetails.discount}</span>
                </div>
              )}
              <div className="flex justify-between text-[#504F5F]">
                <span>Delivery Fee</span>
                <span>{orderDetails.deliveryFee === 0 ? "FREE" : `₹${orderDetails.deliveryFee}`}</span>
              </div>
              <div className="flex justify-between text-[#0B051D] font-bold text-sm pt-2 border-t border-[#F2EFE9]">
                <span>Total Paid</span>
                <span>₹{orderDetails.total}</span>
              </div>
            </div>

            {/* Cancel Button if order is still placed/pending */}
            {["placed", "pending_payment"].includes(tracking.currentStatus) && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="w-full rounded-2xl border border-[#F43F5E]/30 bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#E11D48] text-xs font-bold py-3 transition-colors cursor-pointer"
                >
                  {cancelling ? "Cancelling..." : "Cancel Order & Release Inventory"}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
