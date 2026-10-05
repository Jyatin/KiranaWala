"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

interface OfferingItem {
  id: string;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  footnote?: string;
}

const OFFERINGS: OfferingItem[] = [
  {
    id: "payments",
    title: "Payments",
    description: "Pay seamlessly with Razorpay Checkout, Instant UPI, cards, or cash on delivery at your trusted neighborhood grocers.",
    ctaText: "Start shopping with Razorpay",
    ctaHref: "/shop",
  },
  {
    id: "cards",
    title: "Cards",
    description: "Use your everyday debit and credit cards with instant transaction receipts, bank offers, and neighborhood loyalty points.",
    ctaText: "Shop with cards",
    ctaHref: "/shop",
  },
  {
    id: "memberships",
    title: "Discover nearby",
    description: "Find top-rated local kirana stores around your neighborhood with live distance, stock verification, and 15-minute fulfillment.",
    ctaText: "Discover local stores",
    ctaHref: "/stores",
  },
  {
    id: "balance",
    title: "Kirana Balance",
    description: "Store funds in your local wallet for lightning-fast one-tap checkouts, automatic cashback credit, and easy ledger tracking.",
    ctaText: "View Kirana Balance",
    ctaHref: "/customer/dashboard",
  },
  {
    id: "savings",
    title: "Savings",
    description: "Lock in weekly grocery staple rates, zero price markups, and earn high-yield grocery credit for smart budgeting.",
    ctaText: "Explore deals & savings",
    ctaHref: "/shop",
  },
  {
    id: "cashback",
    title: "Cashback",
    description: "Earn guaranteed cashback points on every vegetable, dairy, and pantry order across town with automatic wallet credit.",
    ctaText: "View cashback balance",
    ctaHref: "/customer/dashboard",
  },
  {
    id: "shopping",
    title: "Shopping",
    description: "Browse live store shelves with verified inventories from 16+ neighborhood stores in your area with zero markup.",
    ctaText: "Shop groceries",
    ctaHref: "/shop",
  },
  {
    id: "mobile",
    title: "Mobile",
    description: "Experience KiranaWala on mobile for AI-powered voice shopping, instant reorders, and live delivery tracking.",
    ctaText: "Discover KiranaWala story",
    ctaHref: "/discover",
  },
];

export function OfferingList() {
  const [activeId, setActiveId] = useState("memberships");

  return (
    <section aria-label="Explore our offering" className="w-full py-20 sm:py-28 bg-white">
      <div className="kw-container max-w-4xl text-center">
        {/* Section Heading (Screenshot 3 Match) */}
        <h2 className="font-display text-[32px] sm:text-[56px] lg:text-[64px] font-bold tracking-[-0.035em] text-[#0B051D] mb-12 sm:mb-18 leading-[0.95]">
          Explore our offering
        </h2>

        {/* Massive Vertical Typography Accordion */}
        <div className="flex flex-col items-center space-y-5 sm:space-y-8">
          {OFFERINGS.map((item) => {
            const isActive = item.id === activeId;
            return (
              <div key={item.id} className="w-full flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setActiveId(isActive ? "" : item.id)}
                  className={`font-display text-2xl sm:text-5xl lg:text-[60px] font-bold tracking-[-0.035em] leading-[0.95] transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "text-[#0B051D] scale-100"
                      : "text-[#96959F] hover:text-[#504F5F]"
                  }`}
                >
                  {item.title}
                </button>

                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden flex flex-col items-center pt-3 pb-4 max-w-lg"
                    >
                      <p className="text-sm sm:text-base text-[#504F5F] font-normal leading-relaxed text-center px-4">
                        {item.description}
                      </p>

                      <div className="mt-4">
                        <Link
                          href={item.ctaHref}
                          className="inline-flex h-9 sm:h-10 items-center justify-center rounded-full bg-[#0B051D] px-6 text-xs sm:text-sm font-bold text-[#F9F8F5] transition-all duration-150 hover:bg-[#2C2242] active:scale-[0.98]"
                        >
                          {item.ctaText}
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
