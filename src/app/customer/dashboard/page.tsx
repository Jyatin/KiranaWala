"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStoredAuth, clearStoredAuth, isMerchant, isCustomer } from "@/lib/auth";
import {
  ShoppingBag,
  ArrowRight,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  Store,
  Truck,
  RotateCw,
  ShieldCheck,
  MapPin,
  Phone,
  Copy,
  Check,
  Sparkles,
  ChevronRight,
  TrendingDown,
  CreditCard,
  AlertCircle,
  Repeat,
} from "lucide-react";

interface OrderItem {
  product: {
    _id?: string;
    name: string;
    price: number;
    image?: string;
    unit?: string;
  };
  quantity: number;
}

interface Order {
  _id: string;
  store?: {
    _id?: string;
    name: string;
    category?: string;
    phone?: string;
    address?: string;
  };
  items: OrderItem[];
  total: number;
  status:
    | "placed"
    | "pending_payment"
    | "confirmed"
    | "packing"
    | "ready"
    | "assigned"
    | "picked_up"
    | "out_for_delivery"
    | "delivered"
    | "completed"
    | "cancelled"
    | "payment_failed";
  paymentMethod?: string;
  paymentStatus?: string;
  razorpayPaymentId?: string;
  signatureVerified?: boolean;
  deliveryOtp?: string;
  deliveryAddress?: {
    fullName?: string;
    phone?: string;
    address?: string;
    city?: string;
    pincode?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

const ACTIVE_STATUSES = [
  "placed",
  "pending_payment",
  "confirmed",
  "packing",
  "ready",
  "assigned",
  "picked_up",
  "out_for_delivery",
];

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "delivered" | "cancelled">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");

  const fetchOrders = useCallback(async (isManual = false) => {
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

    if (isManual) setRefreshing(true);

    try {
      const res = await fetch("/api/customer/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.replace("/customer/login");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load orders");
      }

      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not load your orders.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    const email = localStorage.getItem("userEmail") || "";
    const name = localStorage.getItem("username") || email.split("@")[0] || "Shopper";
    setUserEmail(email);
    setUsername(name);

    fetchOrders();

    // Auto-poll every 12 seconds for real-time delivery status updates
    const pollInterval = setInterval(() => {
      fetchOrders();
    }, 12000);

    return () => clearInterval(pollInterval);
  }, [fetchOrders]);

  const handleLogout = () => {
    clearStoredAuth();
    router.replace("/");
  };

  const copyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order? Reserved items will be returned to store shelves.")) {
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;

    setCancellingId(orderId);
    try {
      const res = await fetch(`/api/customer/orders/${orderId}/cancel`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to cancel order");
      }

      await fetchOrders(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setCancellingId(null);
    }
  };

  const handleReorder = async (order: Order) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setReorderingId(order._id);
    try {
      // Re-add items to customer cart
      for (const item of order.items) {
        if (item.product?._id) {
          await fetch("/api/customer/cart/items", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              productId: item.product._id,
              quantity: item.quantity,
            }),
          });
        }
      }
      router.push("/customer/products?cart=open");
    } catch (err) {
      console.error("Reorder error:", err);
      router.push("/customer/products");
    } finally {
      setReorderingId(null);
    }
  };

  const getStatusBadge = (status: Order["status"]) => {
    switch (status) {
      case "placed":
      case "pending_payment":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2.5 py-1 text-xs font-bold text-[#1D4ED8] border border-[#BFDBFE]">
            <Clock className="h-3 w-3" /> Placed
          </span>
        );
      case "confirmed":
      case "packing":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFFBEB] px-2.5 py-1 text-xs font-bold text-[#D97706] border border-[#FDE68A]">
            <Package className="h-3 w-3" /> Packing at Store
          </span>
        );
      case "ready":
      case "assigned":
      case "picked_up":
      case "out_for_delivery":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-xs font-bold text-[#046234] border border-[#A7F3D0]">
            <span className="relative flex h-2 w-2 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#046234]"></span>
            </span>
            <Truck className="h-3 w-3" /> Out for Delivery
          </span>
        );
      case "delivered":
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-xs font-bold text-[#046234] border border-[#A7F3D0]">
            <CheckCircle2 className="h-3 w-3" /> Delivered
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2.5 py-1 text-xs font-bold text-[#DC2626] border border-[#FECACA]">
            <XCircle className="h-3 w-3" /> Cancelled
          </span>
        );
      case "payment_failed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2.5 py-1 text-xs font-bold text-[#DC2626] border border-[#FECACA]">
            <AlertCircle className="h-3 w-3" /> Payment Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F3F5] px-2.5 py-1 text-xs font-bold text-[#504F5F]">
            {status}
          </span>
        );
    }
  };

  const getStageStep = (status: Order["status"]) => {
    switch (status) {
      case "placed":
      case "pending_payment":
        return 1;
      case "confirmed":
      case "packing":
        return 2;
      case "ready":
      case "assigned":
        return 3;
      case "picked_up":
      case "out_for_delivery":
        return 4;
      case "delivered":
      case "completed":
        return 5;
      default:
        return 0;
    }
  };

  // Metrics
  const activeOrders = useMemo(
    () => orders.filter((o) => ACTIVE_STATUSES.includes(o.status)),
    [orders]
  );
  const deliveredOrders = useMemo(
    () => orders.filter((o) => o.status === "delivered" || o.status === "completed"),
    [orders]
  );
  const cancelledOrders = useMemo(
    () => orders.filter((o) => o.status === "cancelled" || o.status === "payment_failed"),
    [orders]
  );

  const totalSpent = useMemo(
    () => deliveredOrders.reduce((acc, o) => acc + (o.total || 0), 0),
    [deliveredOrders]
  );

  // KiranaWala 0% Markup Savings: ~12% saved vs dark-store quick commerce markups
  const totalSavings = Math.round(totalSpent * 0.12);

  const filteredOrders = useMemo(() => {
    switch (activeTab) {
      case "active":
        return activeOrders;
      case "delivered":
        return deliveredOrders;
      case "cancelled":
        return cancelledOrders;
      default:
        return orders;
    }
  }, [activeTab, orders, activeOrders, deliveredOrders, cancelledOrders]);

  return (
    <main className="min-h-screen bg-[#FAF8F5] py-8 sm:py-12 text-[#0B051D]">
      <div className="kw-container max-w-6xl space-y-8">
        
        {/* Editorial Top Profile Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-[32px] bg-white border border-[#E8E2D9] p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0B051D] text-white font-display text-2xl font-black shrink-0">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFA8CD]/30 px-3 py-0.5 text-xs font-bold text-[#0B051D]">
                  <Sparkles className="h-3 w-3 text-[#0B051D]" />
                  Verified Neighbor
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-xs font-bold text-[#046234] border border-[#A7F3D0]">
                  <ShieldCheck className="h-3 w-3" />
                  0% Markup Pass
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#0B051D]">
                Welcome back, {username}
              </h1>
              <p className="text-xs text-[#504F5F]">
                {userEmail || "Connected via KiranaWala Neighborhood Network"} · Bengaluru Hub
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#E8E2D9] bg-white px-4 text-xs font-bold text-[#0B051D] hover:bg-[#F3F3F5] transition-colors cursor-pointer"
            >
              <RotateCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Updating..." : "Live Sync"}</span>
            </button>

            <Link
              href="/customer/products"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#FFA8CD] px-5 text-xs font-bold text-[#0B051D] transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Shop Shelves</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#E8E2D9] bg-white px-4 text-xs font-bold text-[#504F5F] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        {/* Real-time Order Intelligence KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-[24px] bg-white border border-[#E8E2D9] p-5 space-y-1 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#504F5F]">
              Total Orders
            </span>
            <div className="font-display text-2xl sm:text-3xl font-black text-[#0B051D]">
              {orders.length}
            </div>
            <p className="text-[11px] text-[#504F5F]">Across local stores</p>
          </div>

          <div className="rounded-[24px] bg-white border border-[#E8E2D9] p-5 space-y-1 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#504F5F]">
              Active In-Transit
            </span>
            <div className="font-display text-2xl sm:text-3xl font-black text-[#046234] flex items-center gap-2">
              {activeOrders.length}
              {activeOrders.length > 0 && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#046234]"></span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#504F5F]">15-20 min delivery</p>
          </div>

          <div className="rounded-[24px] bg-white border border-[#E8E2D9] p-5 space-y-1 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#504F5F]">
              Zero-Markup Savings
            </span>
            <div className="font-display text-2xl sm:text-3xl font-black text-[#0B051D] flex items-center gap-1">
              <span>₹{totalSavings}</span>
              <TrendingDown className="h-4 w-4 text-[#046234]" />
            </div>
            <p className="text-[11px] text-[#046234] font-semibold">Saved vs dark stores</p>
          </div>

          <div className="rounded-[24px] bg-white border border-[#E8E2D9] p-5 space-y-1 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#504F5F]">
              Fulfillment Speed
            </span>
            <div className="font-display text-2xl sm:text-3xl font-black text-[#0B051D]">
              ~18m
            </div>
            <p className="text-[11px] text-[#504F5F]">Doorstep delivery avg</p>
          </div>
        </div>

        {/* Featured Live Active Delivery Spotlight */}
        {activeOrders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#046234]"></span>
              </span>
              <h2 className="font-display text-lg font-bold uppercase tracking-wider text-[#0B051D]">
                Live Delivery in Progress
              </h2>
            </div>

            <div className="space-y-4">
              {activeOrders.map((activeOrder) => {
                const currentStep = getStageStep(activeOrder.status);
                const isOutForDelivery = activeOrder.status === "out_for_delivery" || activeOrder.status === "picked_up";

                return (
                  <div
                    key={`active-${activeOrder._id}`}
                    className="rounded-[32px] bg-white border-2 border-[#0B051D] p-6 sm:p-8 shadow-md space-y-6 relative overflow-hidden"
                  >
                    {/* Top status bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F2EFE9] pb-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#504F5F]">
                          <Store className="h-4 w-4 text-[#0B051D]" />
                          <span className="text-[#0B051D] font-bold">
                            {activeOrder.store?.name || "Neighborhood Kirana"}
                          </span>
                          <span>•</span>
                          <span className="font-mono">#{activeOrder._id.slice(-6).toUpperCase()}</span>
                        </div>
                        <h3 className="font-display text-xl sm:text-2xl font-black text-[#0B051D]">
                          {isOutForDelivery
                            ? "Runner is on the way to your doorstep (~10 mins)"
                            : "Store is packing your fresh neighborhood basket"}
                        </h3>
                      </div>

                      {/* Delivery OTP Badge */}
                      {activeOrder.deliveryOtp && (
                        <div className="rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] px-4 py-3 text-center shrink-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#065F46] block">
                            Delivery OTP
                          </span>
                          <span className="font-mono text-xl font-black text-[#065F46] tracking-widest block">
                            {activeOrder.deliveryOtp}
                          </span>
                          <span className="text-[10px] text-[#047857]">Share with runner</span>
                        </div>
                      )}
                    </div>

                    {/* Multi-stage Progress Stepper */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "Placed", step: 1 },
                          { label: "Confirmed & Packing", step: 2 },
                          { label: "Rider Assigned", step: 3 },
                          { label: "Out for Delivery", step: 4 },
                        ].map((s) => {
                          const isDone = currentStep >= s.step;
                          const isCurrent = currentStep === s.step;
                          return (
                            <div
                              key={s.step}
                              className={`rounded-2xl p-3 border text-center transition-all ${
                                isCurrent
                                  ? "bg-[#0B051D] text-white border-[#0B051D] shadow-xs"
                                  : isDone
                                  ? "bg-[#FAF8F5] text-[#0B051D] border-[#0B051D]/30"
                                  : "bg-[#FAF8F5]/60 text-[#8C8794] border-[#E8E2D9]"
                              }`}
                            >
                              <div className="text-[10px] font-bold uppercase opacity-75">
                                Step {s.step}
                              </div>
                              <div className="text-xs font-bold mt-0.5 truncate">
                                {s.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[#F2EFE9]">
                      <div className="text-xs text-[#504F5F]">
                        <span>{activeOrder.items.length} items</span>
                        <span> · Total: </span>
                        <strong className="text-[#0B051D] font-bold">₹{activeOrder.total}</strong>
                        {activeOrder.paymentMethod && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#046234]">
                            <ShieldCheck className="h-3 w-3" />
                            {activeOrder.paymentMethod === "razorpay" ? "Razorpay Verified" : "Cash on Delivery"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {(activeOrder.status === "placed" || activeOrder.status === "pending_payment") && (
                          <button
                            type="button"
                            disabled={cancellingId === activeOrder._id}
                            onClick={() => handleCancelOrder(activeOrder._id)}
                            className="text-xs font-bold text-[#DC2626] hover:underline cursor-pointer"
                          >
                            {cancellingId === activeOrder._id ? "Cancelling..." : "Cancel Order"}
                          </button>
                        )}

                        <Link
                          href={`/customer/orders/${activeOrder._id}`}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#0B051D] text-white px-5 text-xs font-bold transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          <span>Fullscreen Live Tracking & Map</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order History Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h2 className="font-display text-2xl font-bold tracking-tight text-[#0B051D]">
                Order History
              </h2>
              <p className="text-xs text-[#504F5F]">
                Review all past deliveries, track receipts, or reorder staples in one tap.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex rounded-full bg-white border border-[#E8E2D9] p-1 text-xs font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`rounded-full px-4 py-1.5 transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "bg-[#0B051D] text-white"
                    : "text-[#504F5F] hover:text-[#0B051D]"
                }`}
              >
                All ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("active")}
                className={`rounded-full px-4 py-1.5 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "active"
                    ? "bg-[#0B051D] text-white"
                    : "text-[#504F5F] hover:text-[#0B051D]"
                }`}
              >
                <span>Active</span>
                {activeOrders.length > 0 && (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#10B981] text-[10px] text-white font-bold">
                    {activeOrders.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("delivered")}
                className={`rounded-full px-4 py-1.5 transition-all cursor-pointer ${
                  activeTab === "delivered"
                    ? "bg-[#0B051D] text-white"
                    : "text-[#504F5F] hover:text-[#0B051D]"
                }`}
              >
                Delivered ({deliveredOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("cancelled")}
                className={`rounded-full px-4 py-1.5 transition-all cursor-pointer ${
                  activeTab === "cancelled"
                    ? "bg-[#0B051D] text-white"
                    : "text-[#504F5F] hover:text-[#0B051D]"
                }`}
              >
                Cancelled ({cancelledOrders.length})
              </button>
            </div>
          </div>

          {/* Orders Listing State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-[#E8E2D9]">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#0B051D] border-t-transparent" />
              <p className="mt-4 text-xs font-bold text-[#504F5F]">Loading your neighborhood orders...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-[24px] bg-[#FEF2F2] border border-[#FCA5A5] text-sm text-[#DC2626]">
              {error}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-[32px] border border-[#E8E2D9] bg-white p-12 text-center space-y-4 shadow-xs">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#FAF8F5] border border-[#E8E2D9] text-[#0B051D]">
                <Package className="h-7 w-7 text-[#0B051D]" />
              </div>
              <h3 className="font-display text-xl font-bold text-[#0B051D]">
                {activeTab === "active"
                  ? "No active deliveries right now"
                  : activeTab === "delivered"
                  ? "No delivered orders yet"
                  : "No orders found"}
              </h3>
              <p className="text-xs text-[#504F5F] max-w-sm mx-auto">
                Explore shelves at your neighborhood kirana store and get zero-markup delivery in 15 minutes.
              </p>
              <div className="pt-2">
                <Link
                  href="/customer/products"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0B051D] px-6 text-xs font-bold text-white transition-transform hover:scale-[1.02]"
                >
                  <span>Explore Stores & Shelves</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {filteredOrders.map((order) => {
                const isActive = ACTIVE_STATUSES.includes(order.status);
                const isPaid = order.paymentStatus === "paid" || order.signatureVerified;

                return (
                  <div
                    key={order._id}
                    className="rounded-[28px] border border-[#E8E2D9] bg-white p-6 sm:p-7 space-y-5 transition-all hover:border-[#0B051D] hover:shadow-xs"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F2EFE9] pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FAF8F5] border border-[#E8E2D9]">
                          <Store className="h-5 w-5 text-[#0B051D]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-display text-base font-bold text-[#0B051D]">
                              {order.store?.name || "Neighborhood Kirana"}
                            </h4>
                            {order.store?.category && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#504F5F]">
                                {order.store.category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#504F5F] mt-0.5">
                            <span className="font-mono">#{order._id.slice(-6).toUpperCase()}</span>
                            <span>·</span>
                            <span>{new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <button
                              type="button"
                              onClick={() => copyOrderId(order._id)}
                              className="text-[#8C8794] hover:text-[#0B051D] transition-colors cursor-pointer"
                              title="Copy full order ID"
                            >
                              {copiedId === order._id ? (
                                <Check className="h-3 w-3 text-[#046234]" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {getStatusBadge(order.status)}
                        <span className="font-display text-xl font-black text-[#0B051D]">
                          ₹{order.total}
                        </span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {order.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-[#FAF8F5] p-3 rounded-2xl border border-[#E8E2D9]/70 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-bold text-[#0B051D] bg-white border border-[#E8E2D9] h-5 w-5 rounded-md flex items-center justify-center text-[10px] shrink-0">
                              {it.quantity}×
                            </span>
                            <span className="text-[#0B051D] font-medium truncate">
                              {it.product?.name || "Grocery Item"}
                            </span>
                          </div>
                          <span className="font-bold text-[#0B051D] ml-2 shrink-0">
                            ₹{it.product?.price ? it.product.price * it.quantity : ""}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Delivery Address & Payment Metadata Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#504F5F] bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E2D9]/60">
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="h-3.5 w-3.5 text-[#8C8794] shrink-0" />
                        <span className="truncate">
                          Deliver to: <strong className="text-[#0B051D]">{order.deliveryAddress?.fullName || username}</strong>
                          {order.deliveryAddress?.address && ` · ${order.deliveryAddress.address}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <CreditCard className="h-3.5 w-3.5 text-[#8C8794]" />
                          {order.paymentMethod === "razorpay" ? "Razorpay" : "Cash on Delivery"}
                          {isPaid && (
                            <span className="text-[#046234] font-bold">· Paid</span>
                          )}
                        </span>

                        {order.deliveryOtp && !order.status.includes("deliver") && !order.status.includes("cancel") && (
                          <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-[#E8E2D9] font-bold text-[#0B051D]">
                            OTP: {order.deliveryOtp}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Order Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <Link
                            href={`/customer/orders/${order._id}`}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#0B051D] text-white px-4 text-xs font-bold hover:bg-[#2C2242] transition-colors"
                          >
                            <Truck className="h-3 w-3" />
                            <span>Track Live Delivery</span>
                          </Link>
                        )}

                        <button
                          type="button"
                          disabled={reorderingId === order._id}
                          onClick={() => handleReorder(order)}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#E8E2D9] bg-white px-4 text-xs font-bold text-[#0B051D] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                        >
                          <Repeat className="h-3 w-3 text-[#504F5F]" />
                          <span>{reorderingId === order._id ? "Adding to Cart..." : "Reorder All"}</span>
                        </button>

                        <Link
                          href={`/customer/orders/${order._id}`}
                          className="inline-flex h-9 items-center justify-center gap-1 rounded-full px-3 text-xs font-bold text-[#504F5F] hover:text-[#0B051D] transition-colors"
                        >
                          <span>Receipt Details</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      {(order.status === "placed" || order.status === "pending_payment") && (
                        <button
                          type="button"
                          disabled={cancellingId === order._id}
                          onClick={() => handleCancelOrder(order._id)}
                          className="text-xs font-bold text-[#DC2626] hover:underline cursor-pointer"
                        >
                          {cancellingId === order._id ? "Cancelling..." : "Cancel Order"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
