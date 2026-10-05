"use client";

import { motion } from "motion/react";
import { Sparkles, MapPin, Search, ShoppingBag, Star, Check } from "lucide-react";

export function CustomerPhoneVisual() {
  return (
    <div className="relative w-full h-full min-h-[580px] lg:min-h-[720px] flex items-center justify-center p-6 sm:p-10 lg:p-12 overflow-hidden rounded-[36px] sm:rounded-[44px] bg-[#EFECE6] border border-[#E5E0D6]">
      {/* Ambient Studio Lighting Glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-[#E5DFD3]/60 blur-3xl pointer-events-none" />

      {/* Floating Eyebrow Badge in Studio Backdrop */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="absolute top-6 left-8 sm:top-8 sm:left-10 z-20 flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-[#0F172A] border border-white/60 shadow-xs"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#D9531E]" />
        <span>KIRANAWALA SUITE · CUSTOMER APP</span>
      </motion.div>

      {/* Physical Smartphone Device Composition */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[340px] sm:max-w-[360px] rounded-[52px] p-3.5 bg-gradient-to-b from-[#2E2C2A] via-[#1E1D1C] to-[#121110] shadow-[0_35px_70px_-15px_rgba(15,23,42,0.35),0_15px_30px_-10px_rgba(15,23,42,0.2)] border border-[#4A4744]/40"
      >
        {/* Outer Titanium Edge Chamfer Highlight */}
        <div className="absolute inset-0 rounded-[52px] ring-1 ring-white/20 pointer-events-none" />

        {/* Device Screen Container */}
        <div className="relative w-full overflow-hidden rounded-[42px] bg-[#FAF8F5] text-[#0F172A] border border-black/10 shadow-inner select-none">
          {/* Glass Gloss Sheen Reflection */}
          <div className="absolute -inset-full bg-gradient-to-tr from-transparent via-white/18 to-transparent rotate-45 pointer-events-none z-30" />

          {/* Screen Top Status Bar */}
          <div className="relative pt-3 px-6 pb-2 flex items-center justify-between text-[11px] font-semibold text-[#0F172A] z-20">
            <span>9:41</span>
            {/* Dynamic Camera Cutout Pill */}
            <div className="absolute left-1/2 -translate-x-1/2 top-2.5 h-4 w-20 rounded-full bg-black flex items-center justify-end px-2">
              <span className="h-2 w-2 rounded-full bg-[#1A1A1A] ring-1 ring-[#333]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-5 h-2.5 rounded-[3px] border border-[#0F172A] p-0.5 flex items-center">
                <div className="h-full w-3 bg-[#0F172A] rounded-xs" />
              </div>
            </div>
          </div>

          {/* App Header */}
          <div className="px-5 pt-2 pb-3 border-b border-[#E8E2D9]/70 space-y-2.5 bg-white">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-black tracking-tight text-[#0F172A]">
                KiranaWala<span className="text-[#D9531E]">.</span>
              </span>
              <div className="flex items-center gap-1 text-[10px] font-bold text-[#D9531E] bg-[#FFF7ED] px-2 py-0.5 rounded-full border border-[#FED7AA]">
                <MapPin className="h-3 w-3" />
                <span>HSR Layout · 12m</span>
              </div>
            </div>

            {/* Simulated Search Bar */}
            <div className="flex items-center gap-2 rounded-full bg-[#F3EFEA] px-3 py-1.5 text-xs text-[#94A3B8]">
              <Search className="h-3.5 w-3.5 text-[#64748B]" />
              <span className="text-[11px]">Search milk, atta, farm veggies...</span>
            </div>
          </div>

          {/* App Screen Content Feed */}
          <div className="p-4 space-y-3.5 text-left text-xs bg-[#FAF8F5]">
            {/* AI Shopping Assistant Intent-to-Basket Card */}
            <div className="rounded-2xl border border-[#D9531E]/20 bg-gradient-to-br from-white to-[#FFF9F5] p-3.5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D9531E] text-white">
                    <Sparkles className="h-2.5 w-2.5" />
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D9531E]">
                    AI Smart Basket
                  </span>
                </div>
                <span className="text-[10px] text-[#059669] font-bold">Auto-Planned</span>
              </div>

              {/* User Prompt Bubble */}
              <div className="rounded-xl bg-[#F3EFEA] p-2 text-[11px] font-medium text-[#0F172A] italic">
                &ldquo;I need ingredients for breakfast for four.&rdquo;
              </div>

              {/* Basket Items List */}
              <div className="space-y-1.5 pt-0.5">
                {[
                  { name: "Farm Fresh Milk 1L", price: "₹68", qty: "1L" },
                  { name: "Brown Eggs (Pack of 6)", price: "₹55", qty: "1 pk" },
                  { name: "Whole Wheat Bread", price: "₹45", qty: "400g" },
                  { name: "Robusta Bananas", price: "₹32", qty: "500g" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[11px] text-[#334155] border-b border-[#E8E2D9]/40 pb-1 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-[#059669]" />
                      <span className="font-medium text-[#0F172A]">{item.name}</span>
                    </div>
                    <span className="font-semibold text-[#0F172A]">{item.price}</span>
                  </div>
                ))}
              </div>

              {/* Action Button inside Phone */}
              <button
                type="button"
                className="w-full h-8 rounded-full bg-[#D9531E] text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs"
              >
                <span>Build my basket → ₹200</span>
              </button>
            </div>

            {/* Nearby Verified Store Card */}
            <div className="rounded-2xl border border-[#E8E2D9] bg-white p-3 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-[#0F172A]">
                  Gupta Kirana & General Store
                </span>
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#F59E0B]">
                  <Star className="h-2.5 w-2.5 fill-[#F59E0B]" />
                  <span>4.9</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                <span>0.6 km away · Sector 2</span>
                <span className="text-[#059669] font-semibold">Live shelf synced</span>
              </div>
            </div>
          </div>

          {/* Device Home Bar */}
          <div className="py-2.5 flex justify-center bg-[#FAF8F5]">
            <div className="h-1 w-28 rounded-full bg-black/30" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
