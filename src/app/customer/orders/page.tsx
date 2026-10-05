"use strict";
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Package,
  Clock,
  Store as StoreIcon,
  CheckCircle2,
  AlertCircle,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getStoredAuth, isMerchant, isCustomer, clearStoredAuth } from "@/lib/auth";

export default function CustomerOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
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

      try {
        const res = await fetch("/api/customer/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          clearStoredAuth();
          router.replace("/customer/login");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load orders", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [router]);

  return (
    <main className="min-h-screen bg-[#FAF8F5] pt-8 sm:pt-12 pb-24 text-[#0B051D]">
      <div className="kw-container max-w-4xl space-y-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/customer/products"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#504F5F] hover:text-[#0B051D] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Marketplace</span>
          </Link>
          <span className="text-xs font-bold text-[#504F5F]">
            {orders.length} Total Orders
          </span>
        </div>

        <div className="space-y-1">
          <h1 className="font-display text-3xl font-black text-[#0B051D]">
            Order History & Tracking
          </h1>
          <p className="text-xs text-[#504F5F]">
            Track live deliveries, view past receipts, and reorder from your favorite neighborhood stores.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#0B051D] border-t-transparent" />
            <p className="mt-4 text-xs font-bold text-[#504F5F]">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl bg-white border border-[#E8E2D9] p-12 text-center space-y-4">
            <Package className="mx-auto h-12 w-12 text-[#8C8794]" />
            <h2 className="font-display text-xl font-bold">No orders placed yet</h2>
            <p className="text-xs text-[#504F5F] max-w-xs mx-auto">
              Your grocery deliveries from neighborhood stores will show up here.
            </p>
            <Link
              href="/customer/products"
              className="inline-flex items-center gap-2 rounded-full bg-[#0B051D] text-white px-6 py-2.5 text-xs font-bold"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isDelivered = order.status === "delivered";
              const isCancelled = order.status === "cancelled";

              return (
                <div
                  key={order._id}
                  className="rounded-3xl bg-white border border-[#E8E2D9] p-6 shadow-xs hover:border-[#0B051D]/40 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2EFE9] pb-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-[#504F5F]">
                        <StoreIcon className="h-3.5 w-3.5 text-[#059669]" />
                        <span className="text-[#0B051D]">{order.store?.name || "Local Store"}</span>
                        <span>•</span>
                        <span className="font-mono">#{order._id.slice(-6).toUpperCase()}</span>
                      </div>
                      <div className="text-[11px] text-[#8C8794] mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                          isDelivered
                            ? "bg-[#ECFDF5] text-[#059669]"
                            : isCancelled
                            ? "bg-[#FFF1F2] text-[#E11D48]"
                            : "bg-[#FEF3C7] text-[#D97706]"
                        }`}
                      >
                        {order.status.replace("_", " ")}
                      </span>

                      <Link
                        href={`/customer/orders/${order._id}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#0B051D] text-white px-4 py-1.5 text-xs font-bold hover:bg-black transition-colors"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        <span>Track</span>
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="text-[#504F5F]">
                      <span className="font-bold text-[#0B051D]">{order.items?.length || 0} items: </span>
                      {order.items?.map((i: any) => i.productNameSnapshot || "Item").slice(0, 3).join(", ")}
                      {order.items?.length > 3 ? "..." : ""}
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-[#504F5F]">Total: </span>
                      <span className="font-bold text-[#0B051D] text-base">₹{order.total}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
