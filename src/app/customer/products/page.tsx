"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
  ChevronDown,
  Store as StoreIcon,
  Search,
} from "lucide-react";
import { Product, Store, CartItem } from "@/components/shop/types";
import { CATEGORIES, enrichProduct } from "@/components/shop/shopData";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { CategoryStrip } from "@/components/shop/CategoryStrip";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductDetailDrawer } from "@/components/shop/ProductDetailDrawer";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { StoreSelectorModal } from "@/components/shop/StoreSelectorModal";
import { SearchDrawer } from "@/components/shop/SearchDrawer";
import { AiShoppingModal } from "@/components/shop/AiShoppingModal";
import { ProductGridSkeleton } from "@/components/ui/ProductCardSkeleton";
import { CartFloatingToast } from "@/components/shop/CartFloatingToast";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { getStoredAuth, isMerchant, isCustomer, clearStoredAuth } from "@/lib/auth";

export default function CustomerProductsPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Role Protection: Merchants cannot enter buyer shopping pages
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

  // Filter & Search states
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "discount">("featured");
  const [filterInStockOnly, setFilterInStockOnly] = useState(false);
  const [filterUnder100, setFilterUnder100] = useState(false);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartStore, setCartStore] = useState<Store | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [recentAddedId, setRecentAddedId] = useState<string | null>(null);
  const [lastAddedProductName, setLastAddedProductName] = useState<string | null>(null);
  const [showFloatingToast, setShowFloatingToast] = useState(false);

  // Modals & Drawers
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState("");

  // Store switch confirmation dialog
  const [switchStoreConflict, setSwitchStoreConflict] = useState<{
    newStore: Store;
    pendingProduct?: Product;
    pendingQuantity?: number;
  } | null>(null);

  // 1. Fetch Stores on Mount
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch("/api/customer/stores");
        if (res.ok) {
          const data = await res.json();
          const list: Store[] = Array.isArray(data) ? data : [];
          setStores(list);
          if (list.length > 0 && !selectedStore) {
            setSelectedStore(list[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load stores", err);
      } finally {
        setLoadingStores(false);
      }
    };

    fetchStores();
  }, []);

  // 2. Fetch Active Cart from Server
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
          if (data.store) {
            setCartStore(data.store);
          }
        }
      }
    } catch {
      // Cart fetch failover
    }
  };

  useEffect(() => {
    fetchCart();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("focus") === "search") {
        setIsSearchOpen(true);
      }
      const cat = params.get("category");
      if (cat) {
        setActiveCategory(cat.toLowerCase());
      }
    }
  }, []);

  // 3. Fetch Products for Selected Store
  useEffect(() => {
    if (!selectedStore) return;

    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const res = await fetch(`/api/customer/stores/${selectedStore._id}/products`);
        if (res.ok) {
          const data = await res.json();
          const rawList = data.products || [];
          const storeMap = new Map<string, Store>();
          stores.forEach((s) => storeMap.set(s._id, s));
          storeMap.set(selectedStore._id, selectedStore);

          const enriched = rawList.map((p: Product) => enrichProduct(p, storeMap));
          setProducts(enriched);
        }
      } catch (err) {
        console.error("Failed to load store products", err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [selectedStore, stores]);

  // Handle Cart Operations
  const executeAddToCart = async (product: Product, quantity: number = 1) => {
    // Check for single-store conflict
    const targetStoreId =
      typeof product.store === "object" && product.store !== null
        ? (product.store as Store)._id
        : (product.store as string);

    if (cartStore && cartItems.length > 0 && cartStore._id !== targetStoreId) {
      const storeObj = stores.find((s) => s._id === targetStoreId) || selectedStore;
      if (storeObj) {
        setSwitchStoreConflict({
          newStore: storeObj,
          pendingProduct: product,
          pendingQuantity: quantity,
        });
        return;
      }
    }

    // Update local state optimistically
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

    if (!cartStore && selectedStore) {
      setCartStore(selectedStore);
    }

    setRecentAddedId(product._id);
    setLastAddedProductName(product.name);
    setShowFloatingToast(true);
    setTimeout(() => setRecentAddedId(null), 2000);
    setTimeout(() => setShowFloatingToast(false), 3500);

    // Sync to backend if token present
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch("/api/customer/cart/items", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId: product._id, quantity }),
        });
      } catch (err) {
        console.error("Failed to sync cart to server", err);
      }
    }
  };

  const handleQuickAddToCart = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    executeAddToCart(product, 1);
  };

  const handleDetailAddToCart = (product: Product, quantity: number) => {
    executeAddToCart(product, quantity);
  };

  const handleIncrement = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const existing = cartItems.find((item) => item.product._id === product._id);
    const newQty = (existing ? existing.quantity : 0) + 1;
    handleUpdateQuantity(product._id, newQty);
  };

  const handleDecrement = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const existing = cartItems.find((item) => item.product._id === product._id);
    if (!existing) return;
    if (existing.quantity <= 1) {
      handleRemoveItem(product._id);
    } else {
      handleUpdateQuantity(product._id, existing.quantity - 1);
    }
  };

  const handleUpdateQuantity = async (productId: string, newQty: number) => {
    setCartItems((prev) =>
      prev.map((item) => (item.product._id === productId ? { ...item, quantity: newQty } : item))
    );

    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch(`/api/customer/cart/items/${productId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ quantity: newQty }),
        });
      } catch (err) {
        console.error("Cart update error", err);
      }
    }
  };

  const handleRemoveItem = async (productId: string) => {
    setCartItems((prev) => {
      const next = prev.filter((item) => item.product._id !== productId);
      if (next.length === 0) setCartStore(null);
      return next;
    });

    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch(`/api/customer/cart/items/${productId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error("Cart remove error", err);
      }
    }
  };

  const handleClearCart = async () => {
    setCartItems([]);
    setCartStore(null);

    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch("/api/customer/cart", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error("Cart clear error", err);
      }
    }
  };

  const handleConfirmStoreSwitch = async () => {
    if (!switchStoreConflict) return;
    await handleClearCart();
    setSelectedStore(switchStoreConflict.newStore);
    setCartStore(switchStoreConflict.newStore);

    if (switchStoreConflict.pendingProduct) {
      setCartItems([
        {
          product: switchStoreConflict.pendingProduct,
          quantity: switchStoreConflict.pendingQuantity || 1,
        },
      ]);
    }
    setSwitchStoreConflict(null);
  };

  // Add multiple items from AI Assistant
  const handleAddMultipleToCart = (items: { product: Product; quantity: number }[]) => {
    setCartItems((prev) => {
      let updated = [...prev];
      items.forEach((item) => {
        const foundIndex = updated.findIndex((i) => i.product._id === item.product._id);
        if (foundIndex >= 0) {
          updated[foundIndex] = {
            ...updated[foundIndex],
            quantity: updated[foundIndex].quantity + item.quantity,
          };
        } else {
          updated.push({ product: item.product, quantity: item.quantity });
        }
      });
      return updated;
    });
    if (!cartStore && selectedStore) {
      setCartStore(selectedStore);
    }
    setIsCartOpen(true);
  };

  // Helper to match product to 15 grocery categories
  const matchCategory = (prodCategory: string, catId: string): boolean => {
    if (catId === "all") return true;
    const pCat = prodCategory.toLowerCase();
    switch (catId) {
      case "produce":
      case "vegetables":
        return pCat.includes("produce") || pCat.includes("vegetable") || pCat.includes("fresh");
      case "fruits":
        return pCat.includes("fruit");
      case "dairy":
        return pCat.includes("dairy") || pCat.includes("egg") || pCat.includes("milk") || pCat.includes("paneer") || pCat.includes("butter");
      case "atta":
        return pCat.includes("atta") || pCat.includes("grain") || pCat.includes("flour") || pCat.includes("wheat") || pCat.includes("rice");
      case "pulses":
        return pCat.includes("pulse") || pCat.includes("dal") || pCat.includes("lentil");
      case "spices":
        return pCat.includes("spice") || pCat.includes("masala") || pCat.includes("seasoning") || pCat.includes("salt");
      case "snacks":
        return pCat.includes("snack") || pCat.includes("biscuit") || pCat.includes("cookie") || pCat.includes("noodle") || pCat.includes("poha");
      case "beverages":
        return pCat.includes("beverage") || pCat.includes("tea") || pCat.includes("coffee") || pCat.includes("drink");
      case "breakfast":
        return pCat.includes("breakfast") || pCat.includes("cereal") || pCat.includes("oat") || pCat.includes("butter");
      case "household":
        return pCat.includes("house") || pCat.includes("clean") || pCat.includes("detergent") || pCat.includes("soap") || pCat.includes("wash");
      case "personal":
        return pCat.includes("personal") || pCat.includes("care") || pCat.includes("soap") || pCat.includes("shampoo");
      case "baby":
        return pCat.includes("baby") || pCat.includes("kid");
      case "staples":
        return pCat.includes("staple") || pCat.includes("atta") || pCat.includes("rice") || pCat.includes("oil") || pCat.includes("dal");
      default:
        return pCat.includes(catId);
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    CATEGORIES.forEach((c) => {
      if (c.id !== "all") {
        counts[c.id] = products.filter((p) => matchCategory(p.category, c.id)).length;
      }
    });
    return counts;
  }, [products]);

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category Filter
        if (activeCategory !== "all" && !matchCategory(p.category, activeCategory)) {
          return false;
        }
        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchBrand = p.brand && p.brand.toLowerCase().includes(q);
          const matchCat = p.category.toLowerCase().includes(q);
          if (!matchName && !matchBrand && !matchCat) return false;
        }
        // In stock only
        if (filterInStockOnly && p.stock <= 0) return false;
        // Under ₹100
        if (filterUnder100 && p.price >= 100) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "discount") {
          const discA = a.originalPrice ? a.originalPrice - a.price : 0;
          const discB = b.originalPrice ? b.originalPrice - b.price : 0;
          return discB - discA;
        }
        return 0; // featured default
      });
  }, [products, activeCategory, searchQuery, sortBy, filterInStockOnly, filterUnder100]);

  // Popular Bestsellers Sub-collection
  const popularBestsellers = useMemo(() => {
    return products.slice(0, 4);
  }, [products]);

  // Lookup map for fast O(1) quantity check per product card
  const cartQuantityMap = useMemo(() => {
    const map = new Map<string, number>();
    cartItems.forEach((item) => {
      map.set(item.product._id, item.quantity);
    });
    return map;
  }, [cartItems]);

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartAmount = cartItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  return (
    <main className="min-h-screen bg-white text-[#0B051D] pb-32">
      {/* ─── 1. Editorial Header & Capsule Search ─── */}
      <ShopHeader
        selectedStore={selectedStore}
        onOpenStoreModal={() => setIsStoreModalOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAiAssistant={() => {
          setAiInitialPrompt("");
          setIsAiModalOpen(true);
        }}
        totalProductsCount={products.length}
      />

      {/* ─── 2. Horizontal Category Strip ─── */}
      <CategoryStrip
        activeCategory={activeCategory}
        onSelectCategory={(id) => {
          setActiveCategory(id);
          setSearchQuery("");
        }}
        categoryCounts={categoryCounts}
      />

      <div className="kw-container pt-8 space-y-12">
        {/* ─── 3. Filter & Sort Bar ─── */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-[#F1EDE6]">
          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterInStockOnly(!filterInStockOnly)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                filterInStockOnly
                  ? "border-[#0B051D] bg-[#0B051D] text-white"
                  : "border-[#E8E2D9] bg-[#FAF8F5] text-[#475569] hover:border-[#0B051D]"
              }`}
            >
              In Stock Only
            </button>

            <button
              type="button"
              onClick={() => setFilterUnder100(!filterUnder100)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                filterUnder100
                  ? "border-[#0B051D] bg-[#0B051D] text-white"
                  : "border-[#E8E2D9] bg-[#FAF8F5] text-[#475569] hover:border-[#0B051D]"
              }`}
            >
              Under ₹100
            </button>

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="rounded-full bg-[#FAD2DE] px-3.5 py-1.5 text-xs font-bold text-[#0B051D] flex items-center gap-1.5 cursor-pointer"
              >
                <span>Clear search: &quot;{searchQuery}&quot;</span>
                <span>×</span>
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs font-medium text-[#475569]">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent font-bold text-[#0B051D] border-none outline-none cursor-pointer pr-1"
            >
              <option value="featured">Featured Picks</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="discount">Highest Savings</option>
            </select>
          </div>
        </div>

        {/* ─── 4. Local Kirana Differentiator: Shop from stores around you ─── */}
        {activeCategory === "all" && !searchQuery && stores.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#059669]">
                  Hyperlocal Kirana Network
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-black text-[#0B051D]">
                  Shop from stores around you
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsStoreModalOpen(true)}
                className="text-xs font-bold text-[#0B051D] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>View all {stores.length} stores</span>
                <span>→</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.slice(0, 3).map((st, idx) => {
                const isSelected = selectedStore?._id === st._id;
                const distance = st.distanceKm || (0.4 + idx * 0.3).toFixed(1);
                const rating = st.rating || 4.8;
                return (
                  <div
                    key={st._id}
                    onClick={() => setSelectedStore(st)}
                    className={`group relative flex flex-col justify-between rounded-[22px] border p-5 transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "border-[#0B051D] bg-[#FAF8F5] shadow-xs ring-1 ring-[#0B051D]"
                        : "border-[#E8E2D9] bg-white hover:border-[#0B051D] hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            isSelected ? "bg-[#0B051D] text-white" : "bg-[#FAD2DE] text-[#0B051D]"
                          }`}
                        >
                          <StoreIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-display text-base font-bold text-[#0B051D] group-hover:text-[#D9531E] transition-colors line-clamp-1">
                            {st.name}
                          </h3>
                          <p className="text-xs text-[#64748B] line-clamp-1">
                            {st.category || "Kirana & Provisions"}
                          </p>
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="rounded-full bg-[#0B051D] px-2.5 py-1 text-[10px] font-bold text-white whitespace-nowrap">
                          Shopping Now
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#F4F4F6] px-2.5 py-1 text-[10px] font-semibold text-[#64748B] group-hover:bg-[#0B051D] group-hover:text-white transition-colors whitespace-nowrap">
                          Select
                        </span>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#EAE6DF] flex items-center justify-between text-xs text-[#64748B]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#0B051D]">{distance} km away</span>
                        <span>·</span>
                        <span className="text-[#059669] font-medium">15–20 min</span>
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-[#0B051D]">
                        <span className="text-[#059669]">★</span>
                        <span>{rating}</span>
                        <span className="text-[#94A3B8] font-normal">(120+)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── 5. Curated Section: Fresh picks for today ─── */}
        {activeCategory === "all" && !searchQuery && popularBestsellers.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D9531E]">
                  Curated Essentials
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-black text-[#0B051D]">
                  Fresh picks for today
                </h2>
              </div>
              <span className="text-xs text-[#64748B]">Hand-picked daily staples · 15–20m</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {popularBestsellers.map((product) => (
                <ProductCard
                  key={`popular-${product._id}`}
                  product={product}
                  onAddToCart={handleQuickAddToCart}
                  onOpenDetail={setSelectedProductDetail}
                  isAdded={recentAddedId === product._id}
                  cartQuantity={cartQuantityMap.get(product._id) || 0}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── 6. Editorial AI Cooking / Meal Assistant Banner ─── */}
        {activeCategory === "all" && !searchQuery && (
          <section className="rounded-[28px] border border-[#E8E2D9] bg-[#FAF8F5] p-6 sm:p-10 relative overflow-hidden">
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FAD2DE] px-3.5 py-1 text-xs font-bold text-[#0B051D]">
                <Sparkles className="h-3.5 w-3.5 text-[#0B051D]" />
                <span>Ask KiranaWala AI</span>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black text-[#0B051D] tracking-tight leading-tight">
                Not sure what to buy? <br className="hidden sm:inline" />
                Tell KiranaWala what you&apos;re cooking.
              </h2>

              <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed">
                Describe any meal, dinner party size, or quick pantry restock. Our assistant maps your recipe into fresh produce, lentils, and spices from {selectedStore?.name || "your local store"} in 1 click.
              </p>

              {/* Suggested meal ideas */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {[
                  "Make a dinner basket for 4",
                  "Healthy breakfast with milk & oats",
                  "Dal Tadka & Jeera Rice dinner kit",
                  "Chai time snacks & biscuits",
                ].map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => {
                      setAiInitialPrompt(idea);
                      setIsAiModalOpen(true);
                    }}
                    className="rounded-full border border-[#E8E2D9] bg-white px-3.5 py-1.5 text-xs font-medium text-[#0B051D] hover:border-[#0B051D] hover:bg-[#FAF8F5] transition-all cursor-pointer shadow-2xs"
                  >
                    &quot;{idea}&quot; →
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── 7. Main Product Grid: From your neighbourhood ─── */}
        <section className="space-y-6">
          <div className="flex items-baseline justify-between border-b border-[#F1EDE6] pb-3">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-black text-[#0B051D]">
                {activeCategory === "all"
                  ? "From your neighbourhood"
                  : CATEGORIES.find((c) => c.id === activeCategory)?.name || "Store Shelf"}
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Showing {filteredProducts.length} verified products from {selectedStore?.name}
              </p>
            </div>
          </div>

          {loadingProducts ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#504F5F]">
                <div className="h-2 w-2 rounded-full bg-[#059669] animate-pulse" />
                <span>Loading live stock from {selectedStore?.name || "local kirana"} shelf...</span>
              </div>
              <ProductGridSkeleton count={8} />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-[28px] border border-[#E8E2D9] bg-[#FAF8F5] p-8 space-y-3">
              <ShoppingBag className="h-10 w-10 text-[#94A3B8]" />
              <h3 className="font-display text-lg font-bold text-[#0B051D]">
                No products match this selection
              </h3>
              <p className="text-xs text-[#64748B] max-w-sm">
                Try switching categories or clearing search filters to see all available goods.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("all");
                  setSearchQuery("");
                  setFilterInStockOnly(false);
                  setFilterUnder100(false);
                }}
                className="mt-2 rounded-full bg-[#0B051D] text-white px-5 py-2 text-xs font-bold hover:bg-[#2C2242] transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onAddToCart={handleQuickAddToCart}
                  onOpenDetail={setSelectedProductDetail}
                  isAdded={recentAddedId === product._id}
                  cartQuantity={cartQuantityMap.get(product._id) || 0}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ─── 8. Affirmative Add-to-Basket Toast ─── */}
      <CartFloatingToast
        isVisible={showFloatingToast}
        productName={lastAddedProductName}
        itemCount={totalCartCount}
        totalAmount={totalCartAmount}
        onViewCart={() => {
          setShowFloatingToast(false);
          setIsCartOpen(true);
        }}
      />

      {/* ─── 9. Persistent Floating Basket Pill (When items exist and toast hidden) ─── */}
      {totalCartCount > 0 && !showFloatingToast && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
          <div
            onClick={() => setIsCartOpen(true)}
            className="pointer-events-auto flex items-center justify-between gap-4 sm:gap-6 rounded-full bg-[#0B051D] text-white px-5 sm:px-7 py-3.5 shadow-2xl transition-all duration-300 hover:scale-103 active:scale-98 cursor-pointer max-w-md w-full"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FAD2DE] text-[#0B051D] font-bold text-xs">
                {totalCartCount}
              </div>
              <div>
                <span className="block text-xs font-bold text-white">
                  View Basket · ₹{totalCartAmount}
                </span>
                <span className="block text-[10px] text-[#CBD5E1]">
                  From {cartStore?.name || "Local Store"} · 15–20m
                </span>
              </div>
            </div>

            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
              Checkout →
            </span>
          </div>
        </div>
      )}

      {/* ─── 10. Drawers & Modals ─── */}
      {/* Product Detail Experience */}
      <ProductDetailDrawer
        product={selectedProductDetail}
        onClose={() => setSelectedProductDetail(null)}
        onAddToCart={handleDetailAddToCart}
        allStores={stores}
      />

      {/* Slide-out Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        cartStore={cartStore}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
      />

      {/* Store Selector Modal */}
      <StoreSelectorModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        stores={stores}
        selectedStore={selectedStore}
        onSelectStore={(store) => {
          setSelectedStore(store);
          setActiveCategory("all");
        }}
      />

      {/* Instant Search Drawer */}
      <SearchDrawer
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        products={products}
        stores={stores}
        onSelectProduct={(p) => {
          setSelectedProductDetail(p);
        }}
        onSelectCategory={(catName) => {
          const match = CATEGORIES.find(
            (c) => c.name.toLowerCase() === catName.toLowerCase()
          );
          if (match) setActiveCategory(match.id);
        }}
        onTriggerAiPrompt={(promptText) => {
          setAiInitialPrompt(promptText);
          setIsAiModalOpen(true);
        }}
      />

      {/* Ask KiranaWala AI Modal */}
      <AiShoppingModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        availableProducts={products}
        currentStore={selectedStore}
        onAddMultipleToCart={handleAddMultipleToCart}
        initialPrompt={aiInitialPrompt}
      />

      {/* Cross-Store Conflict Alert Dialog */}
      {switchStoreConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-[24px] border border-[#E8E2D9] bg-white p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-[#0B051D]">
              Switch Neighborhood Store?
            </h3>
            <p className="text-xs text-[#504F5F] leading-relaxed">
              Your basket contains items from <strong>{cartStore?.name}</strong>. KiranaWala fulfills each order from a single local store for fastest 20-min delivery.
            </p>
            <p className="text-xs text-[#504F5F] leading-relaxed">
              Would you like to clear your current basket and switch to <strong>{switchStoreConflict.newStore.name}</strong>?
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={handleConfirmStoreSwitch}
              >
                Clear Basket &amp; Switch Store
              </Button>
              <Button
                variant="outline"
                size="md"
                className="w-full"
                onClick={() => setSwitchStoreConflict(null)}
              >
                Keep Current Basket
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
