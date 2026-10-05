"use client";

import { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Store as StoreIcon,
  Search,
  Star,
  Clock,
  ShieldCheck,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Truck,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { Product, Store, CartItem } from "@/components/shop/types";
import { CATEGORIES, enrichProduct } from "@/components/shop/shopData";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductDetailDrawer } from "@/components/shop/ProductDetailDrawer";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { Footer } from "@/components/footer/Footer";

export default function StoreDetailPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = use(params);
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [inStockOnly, setInStockOnly] = useState(false);

  // Cart & Modals
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);

  // Fetch Store & Products
  useEffect(() => {
    const fetchStoreData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/customer/stores/${storeId}/products`);
        if (!res.ok) {
          throw new Error("Store not found or unavailable.");
        }
        const data = await res.json();
        setStore(data.store || null);
        const enriched: Product[] = Array.isArray(data.products)
          ? data.products.map((p: any) => enrichProduct(p))
          : [];
        setProducts(enriched);
      } catch (err: any) {
        setError(err.message || "Failed to load store catalog.");
      } finally {
        setLoading(false);
      }
    };

    if (storeId) fetchStoreData();
  }, [storeId]);

  // Fetch active server cart
  useEffect(() => {
    const fetchCart = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch("/api/customer/cart", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.items && Array.isArray(data.items)) {
            const mapped: CartItem[] = data.items.map((item: any) => ({
              product: enrichProduct(item.product),
              quantity: item.quantity,
            }));
            setCartItems(mapped);
          }
        }
      } catch { /* best effort */ }
    };

    fetchCart();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (inStockOnly && (!p.available || p.stock <= 0)) return false;

      if (activeCategory !== "all") {
        const catObj = CATEGORIES.find((c) => c.id === activeCategory);
        if (catObj && !p.category.toLowerCase().includes(catObj.name.toLowerCase())) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesBrand = p.brand && p.brand.toLowerCase().includes(q);
        const matchesCategory = p.category.toLowerCase().includes(q);
        if (!matchesName && !matchesBrand && !matchesCategory) return false;
      }

      return true;
    });
  }, [products, activeCategory, searchQuery, inStockOnly]);

  // Cart operations
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.product._id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cartItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  return (
    <main className="min-h-screen bg-[#FAF8F5] text-[#0B051D] selection:bg-[#FAD2DE] selection:text-[#0B051D]">
      {/* Top Breadcrumb Header */}
      <section className="bg-white border-b border-[#E8E2D9] py-4">
        <div className="kw-container flex items-center justify-between">
          <Link
            href="/stores"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#504F5F] hover:text-[#0B051D] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>All Kirana Stores</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 rounded-full bg-[#0B051D] px-4 py-2 text-xs font-bold text-white hover:bg-[#2C2242] transition-all cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4 text-[#FFA8CD]" />
            <span>Basket ({totalCartCount})</span>
            {totalCartCount > 0 && (
              <span className="ml-1 rounded-full bg-[#FFA8CD] px-2 py-0.5 text-[10px] font-black text-[#0B051D]">
                ₹{cartSubtotal}
              </span>
            )}
          </button>
        </div>
      </section>

      {loading ? (
        <div className="kw-container py-16 text-center space-y-4">
          <div className="h-12 w-12 border-3 border-[#0B051D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#504F5F]">Loading store catalog...</p>
        </div>
      ) : error || !store ? (
        <div className="kw-container py-16 text-center space-y-4 max-w-md mx-auto">
          <div className="h-16 w-16 rounded-full bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center mx-auto text-[#DC2626]">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="font-display text-xl font-bold text-[#0B051D]">
            Store Not Found
          </h2>
          <p className="text-xs text-[#504F5F]">{error || "The requested store does not exist."}</p>
          <Link
            href="/stores"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#0B051D] px-6 text-xs font-bold text-white hover:bg-[#2C2242]"
          >
            Back to All Stores →
          </Link>
        </div>
      ) : (
        <>
          {/* Store Banner Hero */}
          <section className="bg-white border-b border-[#E8E2D9] pt-6 pb-8">
            <div className="kw-container space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#ECFDF5] border border-[#059669]/20 px-3 py-0.5 text-xs font-bold text-[#059669] flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#059669] animate-pulse" />
                      Open Now · 15–20m Delivery
                    </span>
                    <span className="rounded-full bg-[#FAF8F5] border border-[#E8E2D9] px-3 py-0.5 text-xs font-bold text-[#0B051D]">
                      {store.category || "General Store"}
                    </span>
                  </div>

                  <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B051D]">
                    {store.name}
                  </h1>

                  <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed">
                    {store.description}
                  </p>
                </div>

                {/* Store Metrics Card */}
                <div className="shrink-0 rounded-2xl border border-[#E8E2D9] bg-[#FAF8F5] p-4 text-xs space-y-2 min-w-[220px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Rating</span>
                    <span className="font-bold text-[#0B051D] flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                      4.8 (120+)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Shelf Price Markup</span>
                    <span className="font-bold text-[#059669]">₹0 (Guaranteed)</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#E8E2D9]">
                    <span className="text-[#64748B]">Available Catalog</span>
                    <span className="font-bold text-[#0B051D]">{products.length} Products</span>
                  </div>
                </div>
              </div>

              {/* Search Inside Store Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 h-4 w-4 text-[#0B051D] pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search inside ${store.name} (e.g. Milk, Atta, Oil)...`}
                    className="w-full h-11 rounded-full border border-[#E8E2D9] bg-[#FAF8F5] pl-10 pr-4 text-xs font-medium text-[#0B051D] focus:bg-white focus:border-[#0B051D] focus:outline-none focus:ring-1 focus:ring-[#0B051D] transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 text-xs text-[#64748B] hover:text-[#0B051D]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-[#0B051D] shrink-0 cursor-pointer bg-[#FAF8F5] border border-[#E8E2D9] px-4 h-11 rounded-full">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="rounded text-[#0B051D] focus:ring-0 cursor-pointer"
                  />
                  In-Stock Only
                </label>
              </div>
            </div>
          </section>

          {/* Category Strip & Product Grid */}
          <section className="kw-container py-8 space-y-6">
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeCategory === cat.id
                      ? "bg-[#0B051D] text-white shadow-xs"
                      : "bg-white border border-[#E8E2D9] text-[#504F5F] hover:border-[#0B051D] hover:bg-[#FAF8F5]"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Results Title */}
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#0B051D]">
                Products from {store.name} ({filteredProducts.length})
              </h2>
            </div>

            {/* Product Cards Grid */}
            {filteredProducts.length === 0 ? (
              <div className="rounded-3xl border border-[#E8E2D9] bg-white p-12 text-center space-y-3 max-w-sm mx-auto my-8">
                <ShoppingBag className="h-10 w-10 text-[#94A3B8] mx-auto" />
                <h3 className="font-bold text-sm text-[#0B051D]">No products found</h3>
                <p className="text-xs text-[#504F5F]">
                  Try clearing your search or category filter to view all products.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                    setInStockOnly(false);
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-[#0B051D] px-5 text-xs font-bold text-white"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onAddToCart={(p) => handleAddToCart(p, 1)}
                    onOpenDetail={(p) => setSelectedProductDetail(p)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Floating Bottom Cart Bar */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full h-14 rounded-full bg-[#0B051D] hover:bg-[#2C2242] text-white p-2.5 px-6 flex items-center justify-between shadow-2xl transition-all active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFA8CD] text-xs font-black text-[#0B051D]">
                {totalCartCount}
              </span>
              <div className="text-left text-xs">
                <span className="font-bold block text-white">View Grocery Basket</span>
                <span className="text-[11px] text-[#94A3B8]">{store?.name || "Local Store"}</span>
              </div>
            </div>
            <span className="font-display font-bold text-sm text-[#FFA8CD]">
              ₹{cartSubtotal} →
            </span>
          </button>
        </div>
      )}

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        product={selectedProductDetail}
        onClose={() => setSelectedProductDetail(null)}
        onAddToCart={(p, qty) => {
          handleAddToCart(p, qty);
          setSelectedProductDetail(null);
        }}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        cartStore={store}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCartItems([])}
        onCheckoutSuccess={() => setIsCartOpen(false)}
      />

      <Footer />
    </main>
  );
}
