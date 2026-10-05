"use client";

import { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  ShoppingBag,
  Plus,
  Check,
  Loader2,
  ArrowRight,
  Store as StoreIcon,
} from "lucide-react";
import { Product, Store } from "./types";

interface AiShoppingModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableProducts: Product[];
  currentStore: Store | null;
  onAddMultipleToCart: (items: { product: Product; quantity: number }[]) => void;
  initialPrompt?: string;
}

interface BasketRecommendation {
  product: Product;
  quantity: number;
  reason: string;
}

export function AiShoppingModal({
  isOpen,
  onClose,
  availableProducts,
  currentStore,
  onAddMultipleToCart,
  initialPrompt = "",
}: AiShoppingModalProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<BasketRecommendation[]>([]);
  const [basketAdded, setBasketAdded] = useState(false);

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
      generateRecommendations(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
      setRecommendations([]);
      setBasketAdded(false);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const generateRecommendations = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setBasketAdded(false);

    try {
      const token = localStorage.getItem("token");
      let successFromBackend = false;

      if (token) {
        try {
          const res = await fetch("/api/customer/ai/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ message: queryText }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.basket && Array.isArray(data.basket.items) && data.basket.items.length > 0) {
              const matched: BasketRecommendation[] = [];
              for (const item of data.basket.items) {
                const found = availableProducts.find(
                  (p) =>
                    p._id === item.productId ||
                    p.name.toLowerCase().includes(item.name?.toLowerCase())
                );
                if (found) {
                  matched.push({
                    product: found,
                    quantity: item.quantity || 1,
                    reason: "AI selected for your recipe",
                  });
                }
              }
              if (matched.length > 0) {
                setRecommendations(matched);
                successFromBackend = true;
              }
            }
          }
        } catch {
          // Backend AI fallback
        }
      }

      if (!successFromBackend) {
        // Smart Local Intent Recommendation Logic matching real available products
        const lower = queryText.toLowerCase();
        const results: BasketRecommendation[] = [];

        if (lower.includes("breakfast") || lower.includes("morning")) {
          const milk = availableProducts.find((p) => p.category === "Dairy & Eggs" && p.name.includes("Milk"));
          const butter = availableProducts.find((p) => p.name.includes("Butter"));
          const breadOrOats = availableProducts.find((p) => p.name.includes("Paneer") || p.category === "Dairy & Eggs");
          const tea = availableProducts.find((p) => p.name.includes("Tea") || p.category === "Tea & Beverages");

          if (milk) results.push({ product: milk, quantity: 2, reason: "Fresh morning staple" });
          if (butter) results.push({ product: butter, quantity: 1, reason: "Breakfast essential" });
          if (breadOrOats) results.push({ product: breadOrOats, quantity: 1, reason: "Protein breakfast" });
          if (tea) results.push({ product: tea, quantity: 1, reason: "Morning hot beverage" });
        } else if (lower.includes("dal") || lower.includes("dinner") || lower.includes("lunch")) {
          const dal = availableProducts.find((p) => p.category === "Dal & Pulses");
          const rice = availableProducts.find((p) => p.category === "Rice & Grains");
          const oil = availableProducts.find((p) => p.category === "Cooking Oils & Ghee");
          const spices = availableProducts.find((p) => p.category === "Spices & Masalas");

          if (dal) results.push({ product: dal, quantity: 1, reason: "Core protein staple" });
          if (rice) results.push({ product: rice, quantity: 1, reason: "Aromatic grain" });
          if (oil) results.push({ product: oil, quantity: 1, reason: "Cooking & tadka medium" });
          if (spices) results.push({ product: spices, quantity: 1, reason: "Flavor seasoning" });
        } else if (lower.includes("tea") || lower.includes("chai") || lower.includes("snack")) {
          const tea = availableProducts.find((p) => p.name.includes("Tea"));
          const milk = availableProducts.find((p) => p.name.includes("Milk"));
          const biscuits = availableProducts.find((p) => p.category === "Snacks & Biscuits");

          if (tea) results.push({ product: tea, quantity: 1, reason: "Rich Assam & CTC blend" });
          if (milk) results.push({ product: milk, quantity: 2, reason: "Creamy whole milk" });
          if (biscuits) results.push({ product: biscuits, quantity: 2, reason: "Tea-time crisp snack" });
        } else {
          // General essentials
          const items = availableProducts.slice(0, 4);
          items.forEach((p) => {
            results.push({ product: p, quantity: 1, reason: "Recommended local essential" });
          });
        }

        setRecommendations(results);
      }
    } finally {
      setLoading(false);
    }
  };

  const totalBasketAmount = recommendations.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const handleAddAll = () => {
    onAddMultipleToCart(recommendations);
    setBasketAdded(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-[28px] border border-[#E8E2D9] bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAD2DE] text-[#0B051D]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-xl font-black text-[#0B051D]">
                Ask KiranaWala AI
              </h3>
              <p className="text-xs text-[#64748B]">
                Natural language meal planning &amp; instant grocery basket generation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8E2D9] text-[#0B051D] hover:bg-[#F8F7FA]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Prompt Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            generateRecommendations(prompt);
          }}
          className="space-y-3"
        >
          <div className="relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. 'Healthy breakfast for 2', 'Dinner for family of 4', 'Dal Tadka kit'..."
              className="w-full h-12 pl-4 pr-24 rounded-full border border-[#E8E2D9] bg-[#FAF8F5] text-xs font-medium text-[#0B051D] focus:border-[#0B051D] focus:bg-white focus:outline-none transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-full bg-[#0B051D] text-white text-xs font-bold transition-all hover:bg-[#2C2242] disabled:opacity-40 cursor-pointer"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Build Basket"}
            </button>
          </div>
        </form>

        {/* Recommendations Output */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#0B051D]" />
              <p className="text-xs font-medium text-[#504F5F]">
                Matching verified ingredients from {currentStore?.name || "local stores"}...
              </p>
            </div>
          ) : recommendations.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#0B051D]">
                <span>Generated Basket ({recommendations.length} items)</span>
                <span className="text-[#059669]">Available for immediate delivery</span>
              </div>

              <div className="space-y-2">
                {recommendations.map((rec) => (
                  <div
                    key={rec.product._id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-[#E8E2D9] bg-[#FAF8F5] text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-white border border-[#E8E2D9] p-1 flex items-center justify-center overflow-hidden">
                        {rec.product.image ? (
                          <img
                            src={rec.product.image}
                            alt={rec.product.name}
                            className="h-full w-full object-contain mix-blend-multiply"
                          />
                        ) : (
                          <ShoppingBag className="h-4 w-4 text-[#94A3B8]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[#0B051D] block truncate">
                          {rec.product.name}
                        </span>
                        <span className="text-[11px] text-[#64748B]">
                          Qty: {rec.quantity} · {rec.reason}
                        </span>
                      </div>
                    </div>

                    <span className="font-bold text-sm text-[#0B051D] shrink-0">
                      ₹{rec.product.price * rec.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#64748B] space-y-2">
              <p>Type any recipe or occasion above, and our AI will build an optimal basket from your neighborhood store shelf.</p>
            </div>
          )}
        </div>

        {/* Modal Action CTA */}
        {recommendations.length > 0 && !loading && (
          <div className="border-t border-[#E8E2D9] pt-4 flex items-center justify-between gap-4">
            <div>
              <span className="block text-[11px] text-[#64748B]">Total Basket</span>
              <span className="font-display text-xl font-black text-[#0B051D]">
                ₹{totalBasketAmount}
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddAll}
              disabled={basketAdded}
              className={`h-11 px-6 rounded-full font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                basketAdded
                  ? "bg-[#046234] text-white"
                  : "bg-[#FAD2DE] hover:bg-[#F8BDCE] text-[#0B051D]"
              }`}
            >
              {basketAdded ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Added to Basket!</span>
                </>
              ) : (
                <>
                  <span>Add All {recommendations.length} Items to Basket</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
