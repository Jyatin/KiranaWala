"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag, Store, X, ArrowRight, UserCheck, ShieldCheck } from "lucide-react";

export type AuthMode = "login" | "register";

interface AuthRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: AuthMode;
}

export function AuthRoleModal({ isOpen, onClose, mode }: AuthRoleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape & trap scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const isLogin = mode === "login";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0B051D]/60 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal Card */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl overflow-hidden rounded-[32px] sm:rounded-[40px] border border-[#E2E2E7] bg-white p-6 sm:p-10 shadow-2xl z-10"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E2E7] text-[#0B051D] transition-colors hover:bg-[#F3F3F5] focus-visible:outline-2 focus-visible:outline-[#7B57D8] cursor-pointer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Header */}
            <div className="space-y-2 mb-8 pr-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFA8CD]/30 px-3 py-1 text-xs font-bold text-[#0B051D]">
                {isLogin ? "Sign in to your account" : "Get started with KiranaWala"}
              </span>
              <h2
                id="auth-modal-title"
                className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#0B051D]"
              >
                {isLogin ? "Select how you'd like to sign in" : "Choose your account type"}
              </h2>
              <p className="text-sm text-[#504F5F] leading-relaxed">
                {isLogin
                  ? "Access your personalized neighborhood shopping portal or your verified store merchant desk."
                  : "Join as a local shopper or onboard your neighborhood kirana store in minutes."}
              </p>
            </div>

            {/* Role Options Grid */}
            <div className="grid grid-cols-1 gap-4">
              {/* Option 1: Customer */}
              <Link
                href={isLogin ? "/customer/login" : "/customer/register"}
                onClick={onClose}
                className="group relative flex items-start gap-4 sm:gap-5 rounded-[24px] border border-[#E2E2E7] bg-[#F8F7FA] p-5 sm:p-6 transition-all duration-200 hover:border-[#0B051D] hover:bg-white hover:shadow-lg active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFA8CD] text-[#0B051D] transition-transform group-hover:scale-105">
                  <ShoppingBag className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base sm:text-lg font-bold text-[#0B051D] group-hover:text-[#0B051D]">
                      {isLogin ? "Customer Login" : "Start Shopping (Customer)"}
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B051D] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed">
                    {isLogin
                      ? "Track active orders, view store shelves, and use AI Smart Basket."
                      : "Create your free customer account to shop with zero markups and local delivery."}
                  </p>
                  <div className="pt-1 flex items-center gap-1.5 text-xs font-semibold text-[#0B051D]">
                    <UserCheck className="h-3.5 w-3.5 text-[#046234]" aria-hidden="true" />
                    <span>Hyperlocal customer experience</span>
                  </div>
                </div>
              </Link>

              {/* Option 2: Store Owner */}
              <Link
                href={isLogin ? "/store-owner/login" : "/store-owner/register"}
                onClick={onClose}
                className="group relative flex items-start gap-4 sm:gap-5 rounded-[24px] border border-[#E2E2E7] bg-[#F8F7FA] p-5 sm:p-6 transition-all duration-200 hover:border-[#0B051D] hover:bg-white hover:shadow-lg active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0B051D] text-white transition-transform group-hover:scale-105">
                  <Store className="h-6 w-6 text-[#FFA8CD]" aria-hidden="true" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base sm:text-lg font-bold text-[#0B051D] group-hover:text-[#0B051D]">
                      {isLogin ? "Shop Owner Login" : "Register Your Shop (Merchant)"}
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B051D] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed">
                    {isLogin
                      ? "Manage product inventory, update live catalog, process customer orders & scan POS."
                      : "Onboard your neighborhood grocery store, digitize your stock & start receiving orders."}
                  </p>
                  <div className="pt-1 flex items-center gap-1.5 text-xs font-semibold text-[#0B051D]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#046234]" aria-hidden="true" />
                    <span>Verified merchant portal</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Bottom Switcher */}
            <div className="mt-8 pt-4 border-t border-[#E2E2E7] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#504F5F]">
              <span>
                {isLogin ? "Don't have an account yet?" : "Already registered with KiranaWala?"}
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  // reopen in alternate mode if needed, or link to relevant page
                }}
                className="font-bold text-[#0B051D] underline underline-offset-4 hover:opacity-75 cursor-pointer"
              >
                {isLogin ? (
                  <Link href="/customer/register" onClick={onClose}>
                    Sign up as a customer →
                  </Link>
                ) : (
                  <Link href="/customer/login" onClick={onClose}>
                    Sign in here →
                  </Link>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
