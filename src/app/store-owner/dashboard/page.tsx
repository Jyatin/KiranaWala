"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { getStoredAuth, clearStoredAuth, isCustomer, isMerchant } from "@/lib/auth";
import {
  Store,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  ArrowRight,
  RefreshCw,
  Search,
  Plus,
  SlidersHorizontal,
  TrendingUp,
  AlertTriangle,
  Bot,
  DollarSign,
  Truck,
  Sparkles,
  Check,
  Send,
  Power,
  ChevronRight,
  ShieldCheck,
  Phone,
  MapPin,
  Flame,
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

interface StoreOrder {
  _id: string;
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
    | "processing";
  paymentMethod?: string;
  paymentStatus?: string;
  razorpayPaymentId?: string;
  deliveryOtp?: string;
  deliveryAddress?: {
    fullName?: string;
    phone?: string;
    address?: string;
    city?: string;
    pincode?: string;
  };
  createdAt: string;
}

interface ProductItem {
  _id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  category?: string;
  brand?: string;
  unit?: string;
  stock: number;
  availableStock?: number;
  reorderLevel?: number;
  available: boolean;
  soldStock?: number;
}

interface StoreProfile {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  isOpen: boolean;
  address?: string;
}

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    pendingOrdersCount: number;
    completedOrdersCount: number;
    lowStockCount: number;
  };
  topProducts: Array<{
    _id: string;
    name: string;
    soldStock: number;
    price: number;
    revenueGenerated: number;
  }>;
  lowStockProducts: Array<{
    _id: string;
    name: string;
    availableStock: number;
    reorderLevel: number;
    suggestedReorder: number;
  }>;
}

export default function StoreOwnerDashboardPage() {
  const router = useRouter();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"orders" | "inventory" | "intelligence" | "analytics">("orders");

  // Core Store Data
  const [store, setStore] = useState<StoreProfile | null>(null);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // Loading States
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Packing Checklists per order
  const [checkedItems, setCheckedItems] = useState<Record<string, Record<number, boolean>>>({});

  // Inventory Filters & Search
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);

  // Add Product Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    category: "Groceries & Staples",
    unit: "1 kg",
    stock: "25",
    description: "Fresh quality item sourced locally.",
    image: "/images/features/feature-1.jpg",
  });
  const [addingProduct, setAddingProduct] = useState(false);

  // AI Assistant State
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch Store Orders
  const fetchStoreOrders = useCallback(async () => {
    const { token, role } = getStoredAuth();

    if (!token) {
      router.replace("/store-owner/login");
      return;
    }

    if (isCustomer(role)) {
      router.replace("/shop");
      return;
    }

    if (!isMerchant(role)) {
      router.replace("/store-owner/login");
      return;
    }

    try {
      const res = await fetch("/api/store-owner/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearStoredAuth();
        router.replace("/store-owner/login");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err: unknown) {
      console.error("Failed to load store orders", err);
    } finally {
      setLoadingOrders(false);
    }
  }, [router]);

  // Fetch Store Catalog & Profile
  const fetchStoreCatalog = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    setLoadingProducts(true);
    try {
      const res = await fetch("/api/store-owner/catalog", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.store) setStore(data.store);
        if (Array.isArray(data.products)) setProducts(data.products);
      } else {
        // Fallback: fetch store me
        const meRes = await fetch("/api/store-owner/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.store) {
            setStore(meData.store);
            const pRes = await fetch(`/api/store-owner/products/${meData.store._id}`);
            if (pRes.ok) {
              const pData = await pRes.json();
              setProducts(Array.isArray(pData) ? pData : []);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to load catalog", err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Fetch Analytics
  const fetchStoreAnalytics = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    setLoadingAnalytics(true);
    try {
      const res = await fetch("/api/store-owner/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to load analytics", err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  // Initial Load & Polling
  useEffect(() => {
    fetchStoreOrders();
    fetchStoreCatalog();
    fetchStoreAnalytics();

    const interval = setInterval(() => {
      fetchStoreOrders();
    }, 10000); // 10s auto-refresh for incoming orders

    return () => clearInterval(interval);
  }, [fetchStoreOrders, fetchStoreCatalog, fetchStoreAnalytics]);

  // Order Transition Action
  const updateOrderStatus = async (orderId: string, nextStatus: StoreOrder["status"]) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/store-owner/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update status");
      }

      await fetchStoreOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  // Real-Time Stock Availability Toggle
  const toggleProductStock = async (product: ProductItem) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const nextAvailable = !product.available;
    setTogglingProductId(product._id);

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) =>
        p._id === product._id
          ? {
              ...p,
              available: nextAvailable,
              availableStock: nextAvailable ? Math.max(p.availableStock || 0, 10) : 0,
            }
          : p
      )
    );

    try {
      const res = await fetch("/api/store-owner/inventory/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product._id,
          available: nextAvailable,
          availableStock: nextAvailable ? Math.max(product.availableStock || 0, 10) : 0,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to toggle product stock");
      }
    } catch (err) {
      console.error(err);
      // Revert on error
      setProducts((prev) =>
        prev.map((p) => (p._id === product._id ? { ...p, available: product.available } : p))
      );
    } finally {
      setTogglingProductId(null);
    }
  };

  // Adjust Product Stock Count
  const updateProductQuantity = async (productId: string, newStock: number) => {
    const token = localStorage.getItem("token");
    if (!token || newStock < 0) return;

    setProducts((prev) =>
      prev.map((p) =>
        p._id === productId
          ? { ...p, availableStock: newStock, stock: newStock, available: newStock > 0 }
          : p
      )
    );

    try {
      await fetch("/api/store-owner/inventory/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId,
          availableStock: newStock,
          available: newStock > 0,
        }),
      });
    } catch (err) {
      console.error("Failed to update stock", err);
    }
  };

  // Toggle Store Operating Status (Open/Closed)
  const toggleStoreStatus = async () => {
    const token = localStorage.getItem("token");
    if (!token || !store) return;

    setTogglingStatus(true);
    const nextIsOpen = !store.isOpen;

    try {
      const res = await fetch("/api/store-owner/store/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isOpen: nextIsOpen }),
      });

      if (res.ok) {
        setStore((prev) => (prev ? { ...prev, isOpen: nextIsOpen } : null));
      }
    } catch (err) {
      console.error("Failed to toggle store status", err);
    } finally {
      setTogglingStatus(false);
    }
  };

  // Add Product Submission
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token || !store) return;

    setAddingProduct(true);
    try {
      const res = await fetch("/api/store-owner/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newProduct.name,
          price: parseFloat(newProduct.price),
          category: newProduct.category,
          unit: newProduct.unit,
          stock: parseInt(newProduct.stock, 10) || 20,
          description: newProduct.description,
          image: newProduct.image,
          storeId: store._id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add product");
      }

      setIsAddModalOpen(false);
      setNewProduct({
        name: "",
        price: "",
        category: "Groceries & Staples",
        unit: "1 kg",
        stock: "25",
        description: "Fresh quality item sourced locally.",
        image: "/images/features/feature-1.jpg",
      });

      await fetchStoreCatalog();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error creating product");
    } finally {
      setAddingProduct(false);
    }
  };

  // AI Store Intelligence Query
  const askAiManager = async (presetQuery?: string) => {
    const q = presetQuery || aiQuestion;
    if (!q.trim()) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    setAiLoading(true);
    try {
      const res = await fetch("/api/store-owner/intelligence/ai-manager", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: q }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiAnswer(data.answer);
        setAiRecommendations(data.recommendations || []);
      }
    } catch (err) {
      console.error(err);
      setAiAnswer("Demand Intelligence service currently calculating neighborhood signals.");
    } finally {
      setAiLoading(false);
    }
  };

  const toggleCheckItem = (orderId: string, itemIdx: number) => {
    setCheckedItems((prev) => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [itemIdx]: !prev[orderId]?.[itemIdx],
      },
    }));
  };

  const handleLogout = () => {
    clearStoredAuth();
    router.replace("/");
  };

  // Metrics
  const pendingOrders = orders.filter((o) =>
    ["placed", "confirmed", "packing", "processing", "ready"].includes(o.status)
  );
  const outForDeliveryOrders = orders.filter((o) =>
    ["assigned", "picked_up", "out_for_delivery"].includes(o.status)
  );
  const completedOrders = orders.filter((o) =>
    ["completed", "delivered"].includes(o.status)
  );
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  // Filtered Products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(productSearch.toLowerCase()));
      const matchesCat =
        selectedCategory === "all" || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, productSearch, selectedCategory]);

  return (
    <AuthGuard requiredRole="merchant">
      <main className="min-h-screen bg-[#FAF8F5] py-8 sm:py-12 text-[#0B051D]">
      <div className="kw-container max-w-7xl space-y-8">
        
        {/* Merchant Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-[32px] bg-white border border-[#E8E2D9] p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0B051D] text-white shrink-0">
              <Store className="h-8 w-8 text-[#FFA8CD]" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0B051D] px-3 py-0.5 text-xs font-bold text-white">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
                  Verified Merchant Portal
                </span>
                <span className="text-xs text-[#504F5F]">
                  ID: {store?._id ? store._id.slice(-6).toUpperCase() : "KW-STORE"}
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#0B051D]">
                {store?.name || "Neighborhood Kirana Store"}
              </h1>
              <p className="text-xs text-[#504F5F]">
                {store?.category || "General Grocery"} · Live Neighborhood Order Dispatch & Stock Intelligence
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Store Status Toggle */}
            <button
              type="button"
              disabled={togglingStatus}
              onClick={toggleStoreStatus}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-xs font-bold transition-all cursor-pointer border ${
                store?.isOpen !== false
                  ? "bg-[#ECFDF5] text-[#046234] border-[#A7F3D0] hover:bg-[#D1FAE5]"
                  : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] hover:bg-[#FEE2E2]"
              }`}
            >
              <span className="relative flex h-2.5 w-2.5">
                {store?.isOpen !== false && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    store?.isOpen !== false ? "bg-[#046234]" : "bg-[#DC2626]"
                  }`}
                ></span>
              </span>
              <span>
                {togglingStatus
                  ? "Updating..."
                  : store?.isOpen !== false
                  ? "Store Open (Accepting Orders)"
                  : "Store Paused (Offline)"}
              </span>
            </button>

            <button
              type="button"
              onClick={fetchStoreOrders}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#E8E2D9] bg-white px-4 text-xs font-bold text-[#0B051D] hover:bg-[#F3F3F5] transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Queue</span>
            </button>

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

        {/* Real-time KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-[24px] bg-white border border-[#E8E2D9] p-5 space-y-1 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#504F5F]">
              Pending Fulfillment
            </span>
            <div className="font-display text-2xl sm:text-3xl font-black text-[#0B051D] flex items-center gap-2">
              {pendingOrders.length}
              {pendingOrders.length > 0 && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#FFA8CD] text-[10px] text-[#0B051D] font-black">
                  !
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#504F5F]">Needs packing / dispatch</p>
          </div>

          <div className="rounded-[24px] bg-white border border-[#E8E2D9] p-5 space-y-1 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#504F5F]">
              Out with Runners
            </span>
            <div className="font-display text-2xl sm:text-3xl font-black text-[#046234] flex items-center gap-1.5">
              {outForDeliveryOrders.length}
              <Truck className="h-4 w-4" />
            </div>
            <p className="text-[11px] text-[#504F5F]">En route to customers</p>
          </div>

          <div className="rounded-[24px] bg-white border border-[#E8E2D9] p-5 space-y-1 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#504F5F]">
              Completed Orders
            </span>
            <div className="font-display text-2xl sm:text-3xl font-black text-[#0B051D]">
              {completedOrders.length}
            </div>
            <p className="text-[11px] text-[#504F5F]">Delivered successfully</p>
          </div>

          <div className="rounded-[24px] bg-white border border-[#E8E2D9] p-5 space-y-1 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#504F5F]">
              Total Volume
            </span>
            <div className="font-display text-2xl sm:text-3xl font-black text-[#0B051D]">
              ₹{totalRevenue}
            </div>
            <p className="text-[11px] text-[#046234] font-semibold">100% merchant payout</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E8E2D9] gap-4 sm:gap-8 overflow-x-auto text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`pb-3.5 transition-all cursor-pointer flex items-center gap-2 shrink-0 border-b-2 ${
              activeTab === "orders"
                ? "border-[#0B051D] text-[#0B051D]"
                : "border-transparent text-[#504F5F] hover:text-[#0B051D]"
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Fulfillment Queue</span>
            {pendingOrders.length > 0 && (
              <span className="rounded-full bg-[#0B051D] px-2 py-0.5 text-[10px] text-white">
                {pendingOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`pb-3.5 transition-all cursor-pointer flex items-center gap-2 shrink-0 border-b-2 ${
              activeTab === "inventory"
                ? "border-[#0B051D] text-[#0B051D]"
                : "border-transparent text-[#504F5F] hover:text-[#0B051D]"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Real-Time Inventory & Stock Toggling</span>
            <span className="rounded-full bg-[#FAF8F5] border border-[#E8E2D9] px-2 py-0.5 text-[10px] text-[#504F5F]">
              {products.length} SKUs
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("intelligence")}
            className={`pb-3.5 transition-all cursor-pointer flex items-center gap-2 shrink-0 border-b-2 ${
              activeTab === "intelligence"
                ? "border-[#0B051D] text-[#0B051D]"
                : "border-transparent text-[#504F5F] hover:text-[#0B051D]"
            }`}
          >
            <Bot className="h-4 w-4 text-[#FFA8CD]" />
            <span>AI Demand Intelligence</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`pb-3.5 transition-all cursor-pointer flex items-center gap-2 shrink-0 border-b-2 ${
              activeTab === "analytics"
                ? "border-[#0B051D] text-[#0B051D]"
                : "border-transparent text-[#504F5F] hover:text-[#0B051D]"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Store Analytics</span>
          </button>
        </div>

        {/* TAB 1: ORDER FULFILLMENT QUEUE */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-[#0B051D]">
                  Incoming Orders Queue
                </h2>
                <p className="text-xs text-[#504F5F]">
                  Pack items accurately and click stage buttons to notify runners and customers in real time.
                </p>
              </div>

              <span className="text-xs font-bold text-[#504F5F]">
                {orders.length} total orders recorded
              </span>
            </div>

            {loadingOrders ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-[#E8E2D9]">
                <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#0B051D] border-t-transparent" />
                <p className="mt-4 text-xs font-bold text-[#504F5F]">Loading live orders queue...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-[32px] border border-[#E8E2D9] bg-white p-12 text-center space-y-4 shadow-xs">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#FAF8F5] border border-[#E8E2D9] text-[#0B051D]">
                  <Package className="h-7 w-7 text-[#FFA8CD]" />
                </div>
                <h3 className="font-display text-xl font-bold text-[#0B051D]">
                  No incoming orders yet
                </h3>
                <p className="text-xs text-[#504F5F] max-w-sm mx-auto">
                  Orders placed by nearby shoppers will appear here in real time. Keep your store status &quot;Open&quot; to receive orders.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {orders.map((order) => {
                  const isNew = order.status === "placed";
                  const isPacking = order.status === "packing" || order.status === "processing" || order.status === "confirmed";
                  const isReady = order.status === "ready";
                  const isOut = order.status === "assigned" || order.status === "picked_up" || order.status === "out_for_delivery";
                  const isDone = order.status === "completed" || order.status === "delivered";
                  const isCancelled = order.status === "cancelled";

                  return (
                    <div
                      key={order._id}
                      className={`rounded-[28px] border p-6 sm:p-7 space-y-5 transition-all bg-white ${
                        isNew
                          ? "border-[#0B051D] shadow-md ring-2 ring-[#FFA8CD]/40"
                          : "border-[#E8E2D9] shadow-2xs hover:border-[#0B051D]"
                      }`}
                    >
                      {/* Order Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F2EFE9] pb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-display text-lg font-black text-[#0B051D]">
                              Order #{order._id.slice(-6).toUpperCase()}
                            </span>
                            {isNew && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFA8CD] px-2.5 py-0.5 text-[11px] font-black text-[#0B051D]">
                                <Flame className="h-3 w-3" />
                                NEW ORDER
                              </span>
                            )}
                            <span className="text-xs text-[#504F5F]">
                              · {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Customer & Address Details */}
                          <div className="text-xs text-[#504F5F] mt-1 space-y-0.5">
                            {order.deliveryAddress && (
                              <p className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-[#8C8794]" />
                                <span>
                                  Deliver to: <strong className="text-[#0B051D]">{order.deliveryAddress.fullName || "Customer"}</strong>
                                  {order.deliveryAddress.phone && ` (${order.deliveryAddress.phone})`} · {order.deliveryAddress.address}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-[#E8E2D9] bg-[#FAF8F5] text-[#0B051D]">
                            {order.status}
                          </span>
                          <span className="font-display text-2xl font-black text-[#0B051D]">
                            ₹{order.total}
                          </span>
                        </div>
                      </div>

                      {/* Items Packing Checklist */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-[#504F5F]">
                          <span>Basket Items Checklist (Click items as you pack)</span>
                          <span>
                            {order.items.filter((_, idx) => checkedItems[order._id]?.[idx]).length} / {order.items.length} packed
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {order.items.map((it, idx) => {
                            const isChecked = Boolean(checkedItems[order._id]?.[idx]);
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleCheckItem(order._id, idx)}
                                className={`flex items-center justify-between p-3 rounded-2xl border text-xs cursor-pointer select-none transition-all ${
                                  isChecked
                                    ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]"
                                    : "bg-[#FAF8F5] border-[#E8E2D9] text-[#0B051D] hover:bg-[#F2EFE9]"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <div
                                    className={`h-5 w-5 rounded-md flex items-center justify-center border text-[11px] font-bold ${
                                      isChecked
                                        ? "bg-[#046234] text-white border-[#046234]"
                                        : "bg-white border-[#E8E2D9] text-[#0B051D]"
                                    }`}
                                  >
                                    {isChecked ? <Check className="h-3.5 w-3.5" /> : `${it.quantity}×`}
                                  </div>
                                  <span className={`truncate font-medium ${isChecked ? "line-through opacity-80" : ""}`}>
                                    {it.product?.name || "Item"}
                                  </span>
                                </div>

                                <span className="font-bold ml-2 shrink-0">
                                  ₹{it.product?.price ? it.product.price * it.quantity : ""}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Payment & OTP Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-[#FAF8F5] p-3 rounded-2xl border border-[#E8E2D9]/70">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#0B051D]">
                            Payment: {order.paymentMethod === "razorpay" ? "Razorpay Verified Online" : "Cash on Delivery"}
                          </span>
                          {order.paymentStatus === "paid" && (
                            <span className="inline-flex items-center gap-1 text-[#046234] font-bold">
                              <ShieldCheck className="h-3 w-3" /> Paid
                            </span>
                          )}
                        </div>

                        {order.deliveryOtp && !isDone && !isCancelled && (
                          <div className="flex items-center gap-2">
                            <span className="text-[#504F5F]">Customer OTP:</span>
                            <span className="font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-[#E8E2D9]">
                              {order.deliveryOtp}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Multi-Stage Action Workflow Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Placed -> Start Packing */}
                          {isNew && (
                            <button
                              type="button"
                              disabled={updatingId === order._id}
                              onClick={() => updateOrderStatus(order._id, "packing")}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#0B051D] px-6 text-xs font-bold text-white hover:bg-[#2C2242] active:scale-[0.98] cursor-pointer"
                            >
                              <Package className="h-4 w-4" />
                              <span>Accept & Start Packing</span>
                            </button>
                          )}

                          {/* Packing -> Ready for Runner */}
                          {isPacking && (
                            <button
                              type="button"
                              disabled={updatingId === order._id}
                              onClick={() => updateOrderStatus(order._id, "ready")}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#046234] px-6 text-xs font-bold text-white hover:opacity-90 active:scale-[0.98] cursor-pointer"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Bag Packed & Ready for Pickup</span>
                            </button>
                          )}

                          {/* Ready -> Dispatch with Runner / Out for Delivery */}
                          {isReady && (
                            <button
                              type="button"
                              disabled={updatingId === order._id}
                              onClick={() => updateOrderStatus(order._id, "out_for_delivery")}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#0B051D] px-6 text-xs font-bold text-white hover:bg-[#2C2242] active:scale-[0.98] cursor-pointer"
                            >
                              <Truck className="h-4 w-4" />
                              <span>Handover to Runner / Out for Delivery</span>
                            </button>
                          )}

                          {/* Out for Delivery -> Mark Delivered */}
                          {isOut && (
                            <button
                              type="button"
                              disabled={updatingId === order._id}
                              onClick={() => updateOrderStatus(order._id, "delivered")}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#046234] px-6 text-xs font-bold text-white hover:opacity-90 active:scale-[0.98] cursor-pointer"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Confirm Handover / Mark Delivered</span>
                            </button>
                          )}

                          {isDone && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#046234]">
                              <CheckCircle2 className="h-4 w-4" />
                              Order Completed
                            </span>
                          )}
                        </div>

                        {!isDone && !isCancelled && (
                          <button
                            type="button"
                            disabled={updatingId === order._id}
                            onClick={() => {
                              if (confirm("Are you sure you want to cancel this order? Customer will be notified.")) {
                                updateOrderStatus(order._id, "cancelled");
                              }
                            }}
                            className="inline-flex h-9 items-center justify-center rounded-full border border-[#DC2626]/30 text-[#DC2626] px-4 text-xs font-bold hover:bg-[#FEF2F2] cursor-pointer"
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REAL-TIME INVENTORY & STOCK TOGGLING */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-[#0B051D]">
                  Real-Time Stock & Catalog Management
                </h2>
                <p className="text-xs text-[#504F5F]">
                  Toggle items in-stock / out-of-stock in 1-click. Adjust available units instantly for neighborhood shoppers.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0B051D] text-white px-5 text-xs font-bold hover:bg-[#2C2242] transition-transform active:scale-[0.98] cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Product SKU</span>
              </button>
            </div>

            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-[24px] border border-[#E8E2D9] shadow-2xs">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8794]" />
                <input
                  type="text"
                  placeholder="Search catalog by name, brand, or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full h-10 rounded-full border border-[#E8E2D9] pl-10 pr-4 text-xs font-medium text-[#0B051D] focus:outline-none focus:border-[#0B051D]"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`rounded-full px-3.5 py-1.5 transition-all cursor-pointer ${
                    selectedCategory === "all"
                      ? "bg-[#0B051D] text-white"
                      : "bg-[#FAF8F5] text-[#504F5F] hover:text-[#0B051D]"
                  }`}
                >
                  All ({products.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full px-3.5 py-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat
                        ? "bg-[#0B051D] text-white"
                        : "bg-[#FAF8F5] text-[#504F5F] hover:text-[#0B051D]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Catalog Table / Cards */}
            {loadingProducts ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-[#E8E2D9]">
                <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#0B051D] border-t-transparent" />
                <p className="mt-4 text-xs font-bold text-[#504F5F]">Loading catalog inventory...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-[32px] border border-[#E8E2D9] bg-white p-12 text-center space-y-4">
                <Package className="mx-auto h-12 w-12 text-[#8C8794]" />
                <h3 className="font-display text-xl font-bold">No products match your search</h3>
                <p className="text-xs text-[#504F5F]">Try clearing filters or add new inventory items to your catalog.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProducts.map((p) => {
                  const availableUnits = p.availableStock !== undefined ? p.availableStock : p.stock;
                  const isLowStock = availableUnits <= (p.reorderLevel || 5);
                  const isOutOfStock = !p.available || availableUnits <= 0;

                  return (
                    <div
                      key={p._id}
                      className={`rounded-[28px] border bg-white p-5 space-y-4 transition-all shadow-2xs hover:shadow-xs ${
                        isOutOfStock
                          ? "border-[#FECACA] bg-[#FFFBFB]"
                          : isLowStock
                          ? "border-[#FDE68A]"
                          : "border-[#E8E2D9]"
                      }`}
                    >
                      {/* Top Info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#504F5F]">
                            {p.category || "General"}
                          </span>
                          <h4 className="font-display text-base font-bold text-[#0B051D] line-clamp-1">
                            {p.name}
                          </h4>
                          <span className="text-xs text-[#504F5F] block">
                            {p.unit || "1 unit"} · ₹{p.price}
                          </span>
                        </div>

                        {/* 1-CLICK REAL-TIME IN-STOCK TOGGLE */}
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            disabled={togglingProductId === p._id}
                            onClick={() => toggleProductStock(p)}
                            title={p.available ? "Click to mark Out of Stock" : "Click to mark In Stock"}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              p.available && availableUnits > 0 ? "bg-[#046234]" : "bg-[#D1D5DB]"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                p.available && availableUnits > 0 ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                          <span
                            className={`text-[10px] font-bold ${
                              p.available && availableUnits > 0 ? "text-[#046234]" : "text-[#DC2626]"
                            }`}
                          >
                            {p.available && availableUnits > 0 ? "In Stock" : "Out of Stock"}
                          </span>
                        </div>
                      </div>

                      {/* Stock Counter Stepper */}
                      <div className="flex items-center justify-between bg-[#FAF8F5] p-3 rounded-2xl border border-[#E8E2D9]/70 text-xs">
                        <span className="font-bold text-[#504F5F]">Available Units:</span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateProductQuantity(p._id, Math.max(0, availableUnits - 5))}
                            className="h-7 w-7 rounded-full bg-white border border-[#E8E2D9] text-[#0B051D] font-bold flex items-center justify-center hover:bg-[#F2EFE9] cursor-pointer"
                          >
                            -5
                          </button>
                          <button
                            type="button"
                            onClick={() => updateProductQuantity(p._id, Math.max(0, availableUnits - 1))}
                            className="h-7 w-7 rounded-full bg-white border border-[#E8E2D9] text-[#0B051D] font-bold flex items-center justify-center hover:bg-[#F2EFE9] cursor-pointer"
                          >
                            -1
                          </button>

                          <span className="font-mono font-black text-sm text-[#0B051D] w-8 text-center">
                            {availableUnits}
                          </span>

                          <button
                            type="button"
                            onClick={() => updateProductQuantity(p._id, availableUnits + 1)}
                            className="h-7 w-7 rounded-full bg-white border border-[#E8E2D9] text-[#0B051D] font-bold flex items-center justify-center hover:bg-[#F2EFE9] cursor-pointer"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => updateProductQuantity(p._id, availableUnits + 10)}
                            className="h-7 w-7 rounded-full bg-white border border-[#E8E2D9] text-[#0B051D] font-bold flex items-center justify-center hover:bg-[#F2EFE9] cursor-pointer"
                          >
                            +10
                          </button>
                        </div>
                      </div>

                      {/* Health Warning Badge */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#F2EFE9]">
                        <span className="text-[#8C8794]">
                          Reorder trigger: {p.reorderLevel || 5} units
                        </span>

                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#DC2626]">
                            <XCircle className="h-3 w-3" /> Sold Out
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#D97706]">
                            <AlertTriangle className="h-3 w-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-[#046234]">
                            <CheckCircle2 className="h-3 w-3" /> Safe Level
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AI DEMAND INTELLIGENCE & RESTOCK FORECAST */}
        {activeTab === "intelligence" && (
          <div className="space-y-6">
            <div className="rounded-[32px] bg-[#0B051D] text-white p-6 sm:p-8 space-y-6 shadow-md relative overflow-hidden">
              <div className="space-y-2 max-w-xl">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFA8CD]/20 px-3 py-0.5 text-xs font-bold text-[#FFA8CD]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Hyperlocal Demand Intelligence Engine
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight">
                  Tomorrow Morning&apos;s Restock Assistant
                </h2>
                <p className="text-xs text-white/70">
                  KiranaWala analyzes neighborhood purchase velocity, weather trends, and past customer baskets to predict exactly what stock you should procure.
                </p>
              </div>

              {/* Pre-set AI Questions */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-white/60 block">Quick Inquiries:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    "What should I restock tomorrow morning from APMC?",
                    "Which dairy and staple items are running low?",
                    "How can I boost evening basket size?",
                    "Analyze my inventory health and leakage",
                  ].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        setAiQuestion(q);
                        askAiManager(q);
                      }}
                      className="rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-1.5 text-xs font-semibold text-white transition-all cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Freeform Prompt Bar */}
              <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/20">
                <input
                  type="text"
                  placeholder="Ask the AI Store Advisor about your products, sales trends, or suppliers..."
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askAiManager()}
                  className="w-full bg-transparent px-3 text-xs text-white placeholder-white/50 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={() => askAiManager()}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#FFA8CD] text-[#0B051D] px-4 text-xs font-bold hover:bg-[#FFB8D7] transition-all cursor-pointer shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{aiLoading ? "Thinking..." : "Consult AI"}</span>
                </button>
              </div>

              {/* AI Response Card */}
              {aiAnswer && (
                <div className="rounded-2xl bg-white/10 border border-white/20 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#FFA8CD]">
                    <Bot className="h-4 w-4" />
                    <span>KiranaWala Intelligence Advisory:</span>
                  </div>
                  <p className="text-xs leading-relaxed text-white/90 whitespace-pre-line">
                    {aiAnswer}
                  </p>

                  {aiRecommendations.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      <span className="text-[11px] font-bold text-white/60">Actionable Steps:</span>
                      <ul className="space-y-1 text-xs text-white/80">
                        {aiRecommendations.map((r, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981] mt-0.5 shrink-0" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: STORE ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-bold tracking-tight text-[#0B051D]">
                Store Metrics & Performance
              </h2>
              <p className="text-xs text-[#504F5F]">
                Real-time transaction insights, revenue trends, and inventory turnover.
              </p>
            </div>

            {loadingAnalytics ? (
              <div className="py-20 text-center text-xs text-[#504F5F]">
                Loading store analytics...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Selling Products */}
                <div className="rounded-[28px] bg-white border border-[#E8E2D9] p-6 space-y-4 shadow-2xs">
                  <h3 className="font-display text-base font-bold text-[#0B051D] flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#046234]" />
                    <span>Top Velocity SKUs</span>
                  </h3>
                  <div className="space-y-2">
                    {analytics?.topProducts && analytics.topProducts.length > 0 ? (
                      analytics.topProducts.map((tp, idx) => (
                        <div
                          key={tp._id || idx}
                          className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D9]/60 text-xs"
                        >
                          <div className="space-y-0.5 truncate">
                            <span className="font-bold text-[#0B051D] block truncate">{tp.name}</span>
                            <span className="text-[10px] text-[#504F5F]">{tp.soldStock} units sold</span>
                          </div>
                          <span className="font-mono font-black text-sm text-[#0B051D]">
                            ₹{tp.revenueGenerated || tp.soldStock * tp.price}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#504F5F]">No sales data recorded yet.</p>
                    )}
                  </div>
                </div>

                {/* Critical Restock Alerts */}
                <div className="rounded-[28px] bg-white border border-[#E8E2D9] p-6 space-y-4 shadow-2xs">
                  <h3 className="font-display text-base font-bold text-[#0B051D] flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#D97706]" />
                    <span>Urgent Restock SKUs</span>
                  </h3>
                  <div className="space-y-2">
                    {analytics?.lowStockProducts && analytics.lowStockProducts.length > 0 ? (
                      analytics.lowStockProducts.map((lp, idx) => (
                        <div
                          key={lp._id || idx}
                          className="flex items-center justify-between p-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#0B051D] block">{lp.name}</span>
                            <span className="text-[10px] text-[#D97706] font-semibold">
                              Only {lp.availableStock} left (Trigger at {lp.reorderLevel})
                            </span>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#0B051D] border border-[#E8E2D9]">
                            Reorder +{lp.suggestedReorder || 25}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#065F46] font-semibold">
                        All catalog SKUs are currently maintaining safe buffer levels above reorder thresholds!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADD PRODUCT MODAL */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-[32px] bg-white p-6 sm:p-8 space-y-5 shadow-xl border border-[#E8E2D9]">
              <div className="flex items-center justify-between border-b border-[#F2EFE9] pb-4">
                <div className="space-y-0.5">
                  <h3 className="font-display text-xl font-black text-[#0B051D]">
                    Add New Product SKU
                  </h3>
                  <p className="text-xs text-[#504F5F]">
                    List a new item directly on your neighborhood storefront.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-full p-2 text-[#8C8794] hover:bg-[#F3F3F5] cursor-pointer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddProduct} className="space-y-4 text-xs font-bold text-[#0B051D]">
                <div>
                  <label className="block mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nandini Pasteurised Toned Milk"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full h-10 rounded-2xl border border-[#E8E2D9] px-3.5 font-medium text-xs focus:outline-none focus:border-[#0B051D]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1">Price (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 27"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      className="w-full h-10 rounded-2xl border border-[#E8E2D9] px-3.5 font-medium text-xs focus:outline-none focus:border-[#0B051D]"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Unit / Pack Size</label>
                    <input
                      type="text"
                      placeholder="e.g. 500 ml / 1 kg"
                      value={newProduct.unit}
                      onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                      className="w-full h-10 rounded-2xl border border-[#E8E2D9] px-3.5 font-medium text-xs focus:outline-none focus:border-[#0B051D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1">Category</label>
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="w-full h-10 rounded-2xl border border-[#E8E2D9] px-3 font-medium text-xs focus:outline-none focus:border-[#0B051D] bg-white"
                    >
                      <option value="Groceries & Staples">Groceries & Staples</option>
                      <option value="Dairy & Breakfast">Dairy & Breakfast</option>
                      <option value="Fresh Produce">Fresh Produce</option>
                      <option value="Snacks & Beverages">Snacks & Beverages</option>
                      <option value="Household Essentials">Household Essentials</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1">Initial Stock Count</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                      className="w-full h-10 rounded-2xl border border-[#E8E2D9] px-3.5 font-medium text-xs focus:outline-none focus:border-[#0B051D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1">Short Description</label>
                  <input
                    type="text"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full h-10 rounded-2xl border border-[#E8E2D9] px-3.5 font-medium text-xs focus:outline-none focus:border-[#0B051D]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F2EFE9]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="h-10 rounded-full border border-[#E8E2D9] px-5 text-xs font-bold text-[#504F5F] hover:bg-[#FAF8F5] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingProduct}
                    className="h-10 rounded-full bg-[#0B051D] text-white px-6 text-xs font-bold hover:bg-[#2C2242] active:scale-[0.98] cursor-pointer"
                  >
                    {addingProduct ? "Listing Item..." : "Publish to Store Shelves"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      </main>
    </AuthGuard>
  );
}
