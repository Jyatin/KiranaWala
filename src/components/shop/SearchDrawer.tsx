"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Sparkles, ArrowRight, ShoppingBag, Store as StoreIcon, Clock, Loader2 } from "lucide-react";
import { Product, Store } from "./types";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  stores: Store[];
  onSelectProduct: (product: Product) => void;
  onSelectCategory: (category: string) => void;
  onTriggerAiPrompt: (promptText: string) => void;
}

export function SearchDrawer({
  isOpen,
  onClose,
  products,
  stores,
  onSelectProduct,
  onSelectCategory,
  onTriggerAiPrompt,
}: SearchDrawerProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const POPULAR_SEARCHES = [
    "Aashirvaad Atta",
    "Amul Butter",
    "Toor Dal",
    "Basmati Rice",
    "Fortune Oil",
    "Tata Salt",
    "Maggi 2-Minute",
    "Brooke Bond Tea",
  ];

  const AI_IDEAS = [
    { label: "Healthy breakfast for 2", prompt: "Healthy breakfast for 2 people with milk, oats, and bananas" },
    { label: "Dal Tadka dinner kit", prompt: "Everything needed to make home style dal tadka with jeera rice" },
    { label: "Evening tea & snacks", prompt: "Chai masala, premium tea leaves, and tea-time biscuits" },
  ];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = "unset";
      setQuery("");
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const debouncedQuery = useDebounce(query, 200);
  const isSearching = query.trim() !== debouncedQuery.trim() && query.trim().length > 0;

  if (!isOpen) return null;

  const activeSearchTerm = debouncedQuery.trim().toLowerCase();

  const filteredProducts = activeSearchTerm
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(activeSearchTerm) ||
            p.category.toLowerCase().includes(activeSearchTerm) ||
            (p.brand && p.brand.toLowerCase().includes(activeSearchTerm))
        )
        .slice(0, 8)
    : [];

  const filteredStores = activeSearchTerm
    ? stores
        .filter(
          (s) =>
            s.name.toLowerCase().includes(activeSearchTerm) ||
            s.category.toLowerCase().includes(activeSearchTerm)
        )
        .slice(0, 3)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-white border-b border-[#E8E2D9] shadow-2xl transition-all max-h-[85vh] flex flex-col"
      >
        <div className="kw-container py-6">
          {/* Top Search Input Box */}
          <div className="relative flex items-center">
            <Search className="absolute left-5 h-5 w-5 text-[#0B051D]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for rice, atta, fruits, spices, or cooking ideas..."
              className="w-full h-14 sm:h-16 pl-14 pr-12 rounded-full border border-[#E8E2D9] bg-[#FAF8F5] text-base font-medium text-[#0B051D] placeholder:text-[#96959F] focus:border-[#0B051D] focus:bg-white focus:outline-none transition-all shadow-inner"
            />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 flex h-8 w-8 items-center justify-center rounded-full text-[#64748B] hover:text-[#0B051D] hover:bg-[#E8E2D9]/60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick AI Basket Builder Card (Klarna Intent Paradigm) */}
          <div className="mt-4 rounded-2xl border border-[#FAD2DE] bg-[#FFF5F8] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FAD2DE] text-[#0B051D]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-xs font-bold text-[#0B051D]">
                  Need meal ingredients? Ask KiranaWala AI
                </span>
                <span className="block text-[11px] text-[#504F5F]">
                  Type dishes like &quot;breakfast for 2&quot; or &quot;paneer butter masala&quot; to build a 1-click basket.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {AI_IDEAS.map((idea) => (
                <button
                  key={idea.label}
                  type="button"
                  onClick={() => {
                    onClose();
                    onTriggerAiPrompt(idea.prompt);
                  }}
                  className="shrink-0 rounded-full border border-[#FAD2DE] bg-white px-3 py-1 text-[11px] font-bold text-[#0B051D] hover:bg-[#FAD2DE] transition-colors cursor-pointer"
                >
                  {idea.label} →
                </button>
              ))}
            </div>
          </div>

          {/* Results Area */}
          <div className="mt-6 overflow-y-auto max-h-[55vh] pr-2 space-y-6">
            {query.trim().length > 0 ? (
              <div className="space-y-6">
                {/* Store Matches */}
                {filteredStores.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2">
                      Matching Stores
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {filteredStores.map((s) => (
                        <div
                          key={s._id}
                          className="flex items-center gap-2.5 p-3 rounded-xl border border-[#E8E2D9] bg-[#FAF8F5] text-xs font-semibold text-[#0B051D]"
                        >
                          <StoreIcon className="h-4 w-4 text-[#059669]" />
                          <span className="truncate">{s.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product Matches */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2">
                    Products ({filteredProducts.length})
                  </h4>
                  {filteredProducts.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#64748B]">
                      No products found matching &quot;{query}&quot;. Try searching for general terms like &quot;milk&quot;, &quot;atta&quot;, or &quot;dal&quot;.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {filteredProducts.map((p) => (
                        <div
                          key={p._id}
                          onClick={() => {
                            onClose();
                            onSelectProduct(p);
                          }}
                          className="group flex items-center gap-3 p-2.5 rounded-xl border border-[#E8E2D9] bg-white hover:border-[#0B051D] transition-all cursor-pointer"
                        >
                          <div className="h-11 w-11 shrink-0 rounded-lg bg-[#F8F7FA] p-1 flex items-center justify-center overflow-hidden">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                className="h-full w-full object-contain mix-blend-multiply"
                              />
                            ) : (
                              <ShoppingBag className="h-5 w-5 text-[#94A3B8]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-[#0B051D] truncate group-hover:text-[#D9531E]">
                              {p.name}
                            </span>
                            <span className="text-[11px] font-semibold text-[#64748B]">
                              ₹{p.price}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Empty state: Popular Searches & Categories */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-3">
                    Popular In Bengaluru Today
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SEARCHES.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setQuery(term)}
                        className="rounded-full border border-[#E8E2D9] bg-[#FAF8F5] px-3.5 py-1.5 text-xs font-semibold text-[#0B051D] hover:border-[#0B051D] hover:bg-white transition-all cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-3">
                    Direct Aisles
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {["Dairy & Eggs", "Atta & Flours", "Rice & Grains", "Dal & Pulses", "Spices & Masalas", "Cooking Oils & Ghee"].map(
                      (cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectCategory(cat);
                          }}
                          className="rounded-full border border-[#E8E2D9] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#475569] hover:text-[#0B051D] hover:border-[#0B051D] transition-all cursor-pointer"
                        >
                          {cat}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
