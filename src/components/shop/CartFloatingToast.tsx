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
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md pointer-events-auto"
        >
          <div className="flex items-center justify-between gap-3 rounded-full bg-[#0B051D] text-white px-4 sm:px-5 py-3 shadow-[0_20px_50px_rgba(11,5,29,0.3)] border border-white/10 backdrop-blur-md">
            {/* Left Confirmation Message */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C1F4D1] text-[#046234]">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </span>
              <div className="min-w-0 text-xs sm:text-sm">
                <span className="font-medium text-white/90">Added </span>
                <span className="font-bold text-white truncate inline-block max-w-[140px] sm:max-w-[180px] align-bottom">
                  {productName || "item"}
                </span>
              </div>
            </div>

            {/* Right Action: View Cart Pill */}
            <button
              type="button"
              onClick={onViewCart}
              className="group flex shrink-0 items-center gap-1.5 rounded-full bg-[#FFA8CD] text-[#0B051D] px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-bold transition-all hover:bg-[#FFB8D7] active:scale-95 cursor-pointer shadow-xs"
            >
              <span>View Basket</span>
              <span className="tabular-nums font-black">₹{totalAmount}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
