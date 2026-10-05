"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, ArrowRight } from "lucide-react";
import { NAV_ITEMS } from "./DesktopNav";

export function MobileNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const isLinkActive = (href: string) => {
    if (href === "/discover") {
      return pathname === "/discover" || pathname === "/what-is-kiranawala";
    }
    if (href === "/shop") {
      return pathname === "/shop" || pathname.startsWith("/customer/products");
    }
    if (href === "/stores") {
      return pathname.startsWith("/stores");
    }
    if (href === "/help") {
      return pathname.startsWith("/help");
    }
    return pathname === href;
  };

  // Close on Escape & trap focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const closeMenu = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="flex items-center lg:hidden">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation-menu"
        aria-label="Open navigation menu"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#0B051D] transition-colors hover:bg-[#F3F3F5] focus-visible:outline-2 focus-visible:outline-[#7B57D8]"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Klarna-Style Mobile Full-Screen Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-navigation-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[100] flex flex-col justify-between bg-white px-6 py-5 overflow-y-auto"
          >
            {/* Top Bar inside Overlay */}
            <div className="flex items-center justify-between border-b border-[#E2E2E7] pb-4">
              <Link
                href="/"
                onClick={closeMenu}
                className="font-display text-2xl font-black tracking-tighter text-[#0B051D]"
              >
                KiranaWala<span className="text-[#FFA8CD]">.</span>
              </Link>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeMenu}
                aria-label="Close navigation menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E2E7] text-[#0B051D] transition-colors hover:bg-[#F3F3F5] focus-visible:outline-2 focus-visible:outline-[#7B57D8]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Editorial Navigation Links */}
            <nav aria-label="Mobile Main Navigation" className="flex flex-col gap-6 py-8">
              {NAV_ITEMS.map((item, index) => {
                const active = isLinkActive(item.href);
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.04 + index * 0.03,
                      duration: 0.22,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <Link
                      href={item.href}
                      onClick={closeMenu}
                      className={`flex items-center justify-between font-display text-3xl font-extrabold tracking-tight transition-opacity hover:opacity-70 ${
                        active ? "text-[#0B051D]" : "text-[#504F5F]"
                      }`}
                    >
                      <span>{item.label}</span>
                      {active && (
                        <span className="h-2.5 w-2.5 rounded-full bg-[#FFA8CD]" aria-hidden="true" />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* Bottom Actions & Role-Specific Pathways */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4 border-t border-[#E2E2E7] pt-6 pb-4"
            >
              {/* 1. GET STARTED SECTION */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#636071] px-1">
                  Get Started
                </span>
                <div className="grid grid-cols-1 gap-2">
                  <Link
                    href="/customer/register"
                    onClick={closeMenu}
                    className="flex h-12 w-full items-center justify-between rounded-full bg-[#FFA8CD] px-5 text-sm font-bold text-[#0B051D] transition-transform active:scale-[0.98]"
                  >
                    <span>Start Shopping</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/store-owner/register"
                    onClick={closeMenu}
                    className="flex h-12 w-full items-center justify-between rounded-full bg-[#0B051D] px-5 text-sm font-bold text-white transition-transform active:scale-[0.98]"
                  >
                    <span>Register Your Shop</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* 2. SIGN IN SECTION */}
              <div className="space-y-2 pt-2 border-t border-[#E2E2E7]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#636071] px-1">
                  Sign In
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    href="/customer/login"
                    onClick={closeMenu}
                    className="flex h-11 items-center justify-center rounded-2xl border border-[#E2E2E7] bg-[#F8F7FA] px-3 text-xs font-bold text-[#0B051D] hover:border-[#0B051D] active:scale-[0.98]"
                  >
                    Customer
                  </Link>
                  <Link
                    href="/store-owner/login"
                    onClick={closeMenu}
                    className="flex h-11 items-center justify-center rounded-2xl border border-[#E2E2E7] bg-[#F8F7FA] px-3 text-xs font-bold text-[#0B051D] hover:border-[#0B051D] active:scale-[0.98]"
                  >
                    Shop Owner
                  </Link>
                </div>
              </div>

              {/* Region & Info */}
              <div className="flex items-center justify-between pt-2 px-1 text-xs text-[#636071]">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>🇮🇳</span>
                  <span>India · English</span>
                </div>
                <Link
                  href="/store-owner/dashboard"
                  onClick={closeMenu}
                  className="font-medium hover:text-[#0B051D] hover:underline"
                >
                  Merchant desk →
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
