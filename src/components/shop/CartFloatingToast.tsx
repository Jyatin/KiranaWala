"use client";

import React from "react";
import { Check, ShoppingBag, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CartFloatingToastProps {
  isVisible: boolean;
  productName: string | null;
  itemCount: number;
  totalAmount: number;
  onViewCart: () => void;
}

export function CartFloatingToast({
  isVisible,
  productName,
  itemCount,
  totalAmount,
  onViewCart,
}: CartFloatingToastProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.94 }}
          transition={{
            type: "spring",
            stiffness: 420,
            damping: 26,
            mass: 0.8,
          }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md pointer-events-auto"
        >
          <div className="flex items-center justify-between gap-3 rounded-full bg-[#0B051D] text-white px-4 sm:px-5 py-3 shadow-[0_24px_60px_rgba(11,5,29,0.35)] border border-white/15 backdrop-blur-md ring-1 ring-white/10">
            {/* Left Confirmation Message */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C1F4D1] text-[#046234] shadow-xs">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </span>
              <div className="min-w-0 text-xs sm:text-sm font-medium">
                <span className="text-white/80">Added </span>
                <span className="font-bold text-white truncate inline-block max-w-[120px] sm:max-w-[170px] align-bottom">
                  {productName || "item"}
                </span>
              </div>
            </div>

            {/* Right Action: View Basket Pill with item badge */}
            <button
              type="button"
              onClick={onViewCart}
              className="group flex shrink-0 items-center gap-2 rounded-full bg-[#FFA8CD] text-[#0B051D] px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-bold transition-all hover:bg-[#FFB8D7] active:scale-95 cursor-pointer shadow-xs hover:shadow-md"
            >
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-[#0B051D] text-white text-[10px] font-black">
                  {itemCount}
                </span>
                <span>Basket</span>
              </div>
              <span className="tabular-nums font-black border-l border-[#0B051D]/15 pl-1.5">
                ₹{totalAmount}
              </span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
