"use client";

import { motion } from "motion/react";
import { Store, TrendingUp, AlertTriangle, Package, CheckCircle2, Clock } from "lucide-react";

export function MerchantPhoneVisual() {
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
        <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" />
        <span>KIRANAWALA SUITE · MERCHANT DESK</span>
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

          {/* Merchant App Header */}
          <div className="px-5 pt-2 pb-3 border-b border-[#E8E2D9]/70 space-y-1 bg-white">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-black tracking-tight text-[#0F172A]">
                KiranaWala<span className="text-[#D9531E]"> Merchant</span>
              </span>
              <div className="flex items-center gap-1 text-[10px] font-bold text-[#046234] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#059669] animate-pulse" />
                <span>Accepting Orders</span>
              </div>
            </div>
            <p className="text-[10px] text-[#64748B]">Gupta Kirana & General Store · HSR Sector 2</p>
          </div>

          {/* App Screen Content Feed */}
          <div className="p-4 space-y-3 text-left text-xs bg-[#FAF8F5]">
            {/* Today's Overview Metric Cards */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">
                Today&apos;s Overview
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white border border-[#E8E2D9] p-2 text-center shadow-xs">
                  <span className="block text-[10px] text-[#64748B]">Orders</span>
                  <span className="font-display text-base font-black text-[#0F172A]">24</span>
                </div>
                <div className="rounded-xl bg-white border border-[#E8E2D9] p-2 text-center shadow-xs">
                  <span className="block text-[10px] text-[#64748B]">Revenue</span>
                  <span className="font-display text-base font-black text-[#0F172A]">₹8,420</span>
                </div>
                <div className="rounded-xl bg-white border border-[#E8E2D9] p-2 text-center shadow-xs">
                  <span className="block text-[10px] text-[#DC2626]">Low stock</span>
                  <span className="font-display text-base font-black text-[#DC2626]">6</span>
                </div>
              </div>
            </div>

            {/* Live Inventory Quick-Check (Direct User Requirement) */}
            <div className="rounded-2xl border border-[#E8E2D9] bg-white p-3 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3 text-[#D9531E]" />
                  <span className="font-bold text-[11px] text-[#0F172A]">Live Shelf Stock</span>
                </div>
                <span className="text-[10px] text-[#D9531E] font-semibold">Sync POS →</span>
              </div>

              <div className="space-y-1.5">
                {[
                  { name: "Amul Taaza Milk 500ml", count: "12 left", status: "ok" },
                  { name: "India Gate Basmati Rice 5kg", count: "24 left", status: "ok" },
                  { name: "Modern White Bread 400g", count: "8 left", status: "low" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[11px] border-b border-[#E8E2D9]/40 pb-1 last:border-0 last:pb-0"
                  >
                    <span className="text-[#334155]">{item.name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        item.status === "low"
                          ? "bg-[#FEF2F2] text-[#DC2626]"
                          : "bg-[#F3EFEA] text-[#0F172A]"
                      }`}
                    >
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Incoming Live Order Flash Card */}
            <div className="rounded-2xl border border-[#059669]/30 bg-[#ECFDF5]/80 p-3 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] font-bold text-[#046234]">
                  <Clock className="h-3 w-3 text-[#059669]" />
                  <span>Incoming Order #KW-8842</span>
                </div>
                <span className="text-[10px] font-bold text-[#0F172A]">₹310</span>
              </div>
              <p className="text-[10px] text-[#475569]">
                3 items · Flat 402, Green Glen Heights (0.4 km)
              </p>
              <button
                type="button"
                className="w-full h-7 rounded-full bg-[#0F172A] text-white text-[10px] font-bold flex items-center justify-center shadow-xs"
              >
                <span>Accept & Start Packing →</span>
              </button>
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
