"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Star,
  Plus,
  Minus,
  Check,
  Heart,
  Store as StoreIcon,
  ShieldCheck,
  Truck,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { Product, Store } from "./types";

interface ProductDetailDrawerProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  allStores?: Store[];
}

export function ProductDetailDrawer({
  product,
  onClose,
  onAddToCart,
  allStores = [],
}: ProductDetailDrawerProps) {
  const [quantity, setQuantity] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setQuantity(1);
    setIsAdded(false);
    setImageError(false);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (product) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [product, onClose]);

  if (!product) return null;

  const currentStoreName =
    typeof product.store === "object" && product.store !== null
      ? (product.store as Store).name
      : "Gupta Kirana & General Store";

  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const handleAdd = () => {
    onAddToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-y-auto"
      >
        {/* Top Sticky Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E8E2D9] bg-white/95 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
            <StoreIcon className="h-4 w-4 text-[#059669]" />
            <span className="text-[#0B051D] font-bold">{currentStoreName}</span>
            <span>· 15–20m delivery</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close product drawer"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E2D9] text-[#0B051D] transition-colors hover:bg-[#F8F7FA]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Product Details Content Grid */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* Top Section: Large Photography & Core Purchase Information */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-8 items-start">
            {/* Left Gallery (5 cols) */}
            <div className="sm:col-span-6">
              <div className="relative aspect-square w-full rounded-[24px] bg-[#F8F7FA] border border-[#E8E2D9] p-6 flex items-center justify-center overflow-hidden">
                {discountPercent && discountPercent > 0 && (
                  <span className="absolute top-4 left-4 z-10 rounded-full bg-[#FAD2DE] px-3 py-1 text-xs font-bold text-[#0B051D]">
                    -{discountPercent}% OFF
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setIsSaved(!isSaved)}
                  className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[#E8E2D9] text-[#0B051D] transition-transform hover:scale-110 active:scale-95"
                >
                  <Heart
                    className={`h-4 w-4 transition-colors ${
                      isSaved ? "fill-[#D9531E] text-[#D9531E]" : "text-[#475569]"
                    }`}
                  />
                </button>

                {product.image && !imageError ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    onError={() => setImageError(true)}
                    className="h-full w-full object-contain mix-blend-multiply transition-transform duration-500 hover:scale-105"
                  />
                ) : (
                  <ShoppingBag className="h-16 w-16 text-[#CBD5E1]" />
                )}
              </div>
            </div>

            {/* Right Meta & Actions (6 cols) */}
            <div className="sm:col-span-6 flex flex-col justify-between space-y-5">
              <div className="space-y-2">
                <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  {product.brand || "Kirana Choice"} · {product.category}
                </span>

                <h2 className="font-display text-2xl sm:text-3xl font-black text-[#0B051D] leading-tight">
                  {product.name}
                </h2>

                <div className="flex items-center gap-2 text-xs font-medium text-[#475569]">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-[#059669] text-[#059669]" />
                    <span className="font-bold text-[#0B051D]">{product.rating || "4.8"}</span>
                    <span>({product.reviewCount || "128"} reviews)</span>
                  </div>
                  <span>·</span>
                  <span className="font-semibold text-[#059669]">In Stock ({product.stock} available)</span>
                </div>
              </div>

              {/* Price & Savings Presentation */}
              <div className="space-y-1 pt-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-black text-[#0B051D]">
                    ₹{product.price}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-sm text-[#94A3B8] line-through">
                      MRP ₹{product.originalPrice}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#64748B]">
                  Inclusive of all local taxes. Zero shelf-price markup guaranteed.
                </p>
              </div>

              {/* Quantity Selector & Add CTA */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 items-center rounded-full border border-[#E8E2D9] bg-[#F8F7FA] px-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white text-[#0B051D] disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-[#0B051D]">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white text-[#0B051D] cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleAdd}
                    className={`flex-1 h-11 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-xs ${
                      isAdded
                        ? "bg-[#046234] text-white"
                        : "bg-[#FAD2DE] text-[#0B051D] hover:bg-[#F8BDCE]"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Added to Basket</span>
                      </>
                    ) : (
                      <span>Add to Basket · ₹{product.price * quantity}</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Value Guarantees */}
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-[#475569]">
                <div className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-[#059669]" />
                  <span>15–20 Min Delivery</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#059669]" />
                  <span>Direct Shelf Price</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Product Specs */}
          <div className="space-y-3 pt-6 border-t border-[#E8E2D9]">
            <h3 className="font-display text-base font-bold text-[#0B051D]">
              About this item
            </h3>
            <p className="text-sm text-[#475569] leading-relaxed">
              {product.description ||
                "Finest quality pantry staple freshly procured from verified neighborhood distributor channels. Packed under strict hygienic food safety norms."}
            </p>
          </div>

          {/* Multi-Store Comparison Table (Klarna Shopping Architecture) */}
          <div className="space-y-4 pt-6 border-t border-[#E8E2D9]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-[#0B051D]">
                  Compare across neighborhood stores
                </h3>
                <p className="text-xs text-[#64748B]">
                  Transparent pricing from verified local merchants delivering to HSR Layout
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-[#E8E2D9] bg-[#FAF8F5] p-2">
              {allStores.slice(0, 3).map((s, idx) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E8E2D9]/70 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#0B051D] block">{s.name}</span>
                    <span className="text-[11px] text-[#64748B]">
                      {0.5 + idx * 0.4} km away · Delivery {15 + idx * 5}m
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-display text-base font-bold text-[#0B051D]">
                      ₹{product.price}
                    </span>
                    <span className="rounded-full bg-[#059669]/10 text-[#059669] px-2.5 py-0.5 text-[10px] font-bold">
                      In Stock
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
