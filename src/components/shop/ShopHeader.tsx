"use client";

import { Search, MapPin, Store as StoreIcon } from "lucide-react";
import Image from "next/image";

interface ShopHeaderProps {
  onOpenSearch: () => void;
  selectedStore?: any;
  onOpenStoreModal?: () => void;
  onOpenAiAssistant?: () => void;
  totalProductsCount?: number;
}

export function ShopHeader({
  onOpenSearch,
  selectedStore,
  onOpenStoreModal,
}: ShopHeaderProps) {
  return (
    <section className="relative w-full bg-white pt-6 pb-12 sm:pt-8 sm:pb-16 overflow-hidden">
      {/* ─── Top Micro Context: Local Neighborhood Delivery ─── */}
      <div className="kw-container mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E2D9] bg-[#FAF8F5] px-3.5 py-1.5 text-[#0B051D]">
            <MapPin className="h-3.5 w-3.5 text-[#059669]" />
            <span className="font-semibold">Bengaluru · HSR Layout</span>
            <span className="h-1 w-1 rounded-full bg-[#CBD5E1]" />
            <span className="text-[#059669] font-bold">12 Kirana Stores Delivering</span>
          </div>

          {selectedStore && (
            <button
              type="button"
              onClick={onOpenStoreModal}
              className="group inline-flex items-center gap-2 rounded-full border border-[#E8E2D9] bg-white px-3.5 py-1.5 text-[#475569] transition-all hover:border-[#0B051D] hover:text-[#0B051D] cursor-pointer"
            >
              <StoreIcon className="h-3.5 w-3.5 text-[#059669]" />
              <span>
                Ordering from: <strong className="text-[#0B051D]">{selectedStore.name}</strong>
              </span>
              <span className="text-[11px] font-bold text-[#D9531E] underline group-hover:no-underline ml-1">
                Change store
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ─── FLOATING GROCERY STILL-LIFE HERO COMPOSITION ─── */}
      <div className="kw-container relative min-h-[340px] sm:min-h-[420px] lg:min-h-[460px] flex flex-col justify-center items-center">
        
        {/* ─── LEFT SIDE: CURATED GROCERY STILL-LIFE OBJECTS ─── */}
        {/* Tile 1: Farm Fresh Milk (Top-Left) */}
        <div
          className="absolute top-2 left-[10%] sm:left-[8%] lg:left-[11%] z-10 hidden sm:flex items-center justify-center rounded-[22px] bg-[#F8F7FA] p-3 shadow-[0_8px_25px_rgba(0,0,0,0.06)] border border-[#EAE6DF] w-20 h-20 sm:w-24 sm:h-24 transition-transform duration-700 hover:scale-108 select-none"
          style={{ animation: "floatSlow 6s ease-in-out infinite" }}
        >
          <img
            src="/images/grocery-float/milk-bottle.jpg"
            alt="Pure Farm Milk"
            className="w-full h-full object-cover rounded-xl"
          />
        </div>

        {/* Tile 2: Fresh Farm Greens (Mid-Left, subtle depth blur) */}
        <div
          className="absolute top-28 left-[3%] sm:left-[2%] lg:left-[3%] z-0 hidden sm:flex items-center justify-center rounded-[22px] bg-[#F8F7FA] p-2.5 shadow-sm border border-[#EAE6DF] w-20 h-20 sm:w-26 sm:h-26 blur-[1.2px] opacity-80 transition-transform duration-700 hover:blur-none hover:opacity-100 hover:scale-105 select-none"
          style={{ animation: "floatSlow 8s ease-in-out infinite 1s" }}
        >
          <img
            src="/images/grocery-float/fresh-greens.jpg"
            alt="Fresh Organic Spinach"
            className="w-full h-full object-cover rounded-xl"
          />
        </div>

        {/* Tile 3: Whole Grains & Basmati Rice (Bottom-Left) */}
        <div
          className="absolute bottom-4 left-[9%] sm:left-[7%] lg:left-[9%] z-10 hidden sm:flex items-center justify-center rounded-[24px] bg-[#F8F7FA] p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.06)] border border-[#EAE6DF] w-22 h-22 sm:w-28 sm:h-28 transition-transform duration-700 hover:scale-108 select-none"
          style={{ animation: "floatSlow 7s ease-in-out infinite 2s" }}
        >
          <img
            src="/images/grocery-float/basmati-grains.jpg"
            alt="Organic Basmati Rice"
            className="w-full h-full object-cover rounded-xl"
          />
        </div>

        {/* ─── RIGHT SIDE: ARTISANAL SPICES, PRODUCE & EGGS ─── */}
        {/* Tile 4: Artisanal Turmeric & Spices (Top-Right) */}
        <div
          className="absolute top-2 right-[10%] sm:right-[8%] lg:right-[11%] z-10 hidden sm:flex items-center justify-center rounded-[22px] bg-[#F8F7FA] p-3 shadow-[0_8px_25px_rgba(0,0,0,0.06)] border border-[#EAE6DF] w-20 h-20 sm:w-24 sm:h-24 transition-transform duration-700 hover:scale-108 select-none"
          style={{ animation: "floatSlow 6.5s ease-in-out infinite 0.5s" }}
        >
          <img
            src="/images/grocery-float/spice-turmeric.jpg"
            alt="Golden Turmeric Spice"
            className="w-full h-full object-cover rounded-xl"
          />
        </div>

        {/* Tile 5: Fresh Orchard Citrus & Fruits (Mid-Right, soft depth blur) */}
        <div
          className="absolute top-28 right-[3%] sm:right-[2%] lg:right-[3%] z-0 hidden sm:flex items-center justify-center rounded-[22px] bg-[#F8F7FA] p-2.5 shadow-sm border border-[#EAE6DF] w-20 h-20 sm:w-26 sm:h-26 blur-[1.2px] opacity-80 transition-transform duration-700 hover:blur-none hover:opacity-100 hover:scale-105 select-none"
          style={{ animation: "floatSlow 8.5s ease-in-out infinite 1.5s" }}
        >
          <img
            src="/images/grocery-float/fresh-citrus.jpg"
            alt="Fresh Citrus Fruits"
            className="w-full h-full object-cover rounded-xl"
          />
        </div>

        {/* Tile 6: Farm Fresh Eggs (Bottom-Right) */}
        <div
          className="absolute bottom-4 right-[9%] sm:right-[7%] lg:right-[9%] z-10 hidden sm:flex items-center justify-center rounded-[24px] bg-[#F8F7FA] p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.06)] border border-[#EAE6DF] w-22 h-22 sm:w-28 sm:h-28 transition-transform duration-700 hover:scale-108 select-none"
          style={{ animation: "floatSlow 7.5s ease-in-out infinite 2.5s" }}
        >
          <img
            src="/images/grocery-float/organic-eggs.jpg"
            alt="Farm Fresh Eggs"
            className="w-full h-full object-cover rounded-xl"
          />
        </div>

        {/* ─── CENTER HEADLINE & SEARCH CAPSULE ─── */}
        <div className="relative z-10 max-w-3xl w-full text-center space-y-4 sm:space-y-6 px-4">
          {/* Master Original KiranaWala Headline */}
          <h1 className="font-display text-[38px] sm:text-[54px] lg:text-[64px] font-bold tracking-[-0.035em] text-[#0B051D] leading-[0.94]">
            Everything your <br className="hidden sm:inline" />
            neighbourhood needs. <br />
            All in one place.
          </h1>

          <p className="text-sm sm:text-base text-[#504F5F] font-normal max-w-lg mx-auto leading-relaxed">
            Fresh groceries, pantry staples, and household goods from your trusted local kirana stores — delivered with zero shelf-price markups.
          </p>

          {/* Large Center Capsule Search Bar */}
          <div className="pt-2 max-w-xl sm:max-w-2xl mx-auto w-full">
            <div
              onClick={onOpenSearch}
              className="group relative flex h-14 sm:h-16 w-full items-center rounded-full border border-[#E2E2E7] bg-[#F4F4F6] px-5 sm:px-7 text-sm text-[#504F5F] shadow-xs transition-all duration-200 hover:border-[#0B051D] hover:bg-white cursor-pointer"
              role="search"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onOpenSearch()}
            >
              <div className="flex items-center gap-3.5 w-full">
                <Search className="h-5 w-5 text-[#0B051D] shrink-0 transition-transform duration-200 group-hover:scale-110" />
                <span className="truncate text-sm sm:text-base font-normal text-[#504F5F]">
                  Search for groceries, brands or your local store
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes floatSlow {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </section>
  );
}
