"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, MapPin, CheckCircle2 } from "lucide-react";

export function HeroContent() {
  return (
    <div className="flex flex-col justify-center space-y-7 lg:pr-4">
      {/* Eyebrow Badge */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E8E2D9] bg-white px-3.5 py-1 text-xs font-bold tracking-wide text-[#D9531E] shadow-[var(--kw-shadow-sm)]"
      >
        <span className="h-2 w-2 rounded-full bg-[#D9531E]" aria-hidden="true" />
        <span className="uppercase">Hyperlocal Commerce · AI Reimagined</span>
      </motion.div>

      {/* Master Editorial Headline */}
      <div className="overflow-hidden">
        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.1,
            duration: 0.55,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="font-display text-[length:var(--kw-text-display)] font-bold tracking-[-0.035em] text-[#0B051D] leading-[0.94]"
        >
          Everything your <br className="hidden sm:inline" />
          neighbourhood needs. <br className="hidden sm:inline" />
          All in one place.
        </motion.h1>
      </div>

      {/* Supporting Copy */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.22,
          duration: 0.5,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="max-w-xl text-[17px] font-normal leading-[1.65] text-[#475569] sm:text-lg"
      >
        Shop directly from your trusted local kirana stores. Use conversational AI to generate complete grocery baskets in seconds, verify live shelf stock, and support your neighborhood merchants.
      </motion.p>

      {/* Primary Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.45,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2"
      >
        <Link
          href="/shop"
          className="group inline-flex h-13 items-center justify-center gap-2.5 rounded-[var(--kw-radius-pill)] bg-[#D9531E] px-7 text-base font-semibold text-white shadow-[var(--kw-shadow-md)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#C2410C] hover:shadow-[var(--kw-shadow-lg)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#D9531E]"
        >
          <span>Start Shopping</span>
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>

        <Link
          href="/customer/dashboard"
          className="group inline-flex h-13 items-center justify-center gap-2 rounded-[var(--kw-radius-pill)] border border-[#CBD5E1] bg-white px-6 text-base font-medium text-[#0F172A] shadow-[var(--kw-shadow-sm)] transition-all duration-200 hover:border-[#94A3B8] hover:bg-[#F3EFEA] focus-visible:outline-2 focus-visible:outline-[#0F172A]"
        >
          <MapPin className="h-4 w-4 text-[#D9531E]" aria-hidden="true" />
          <span>Find Nearby Stores</span>
        </Link>
      </motion.div>

      {/* Trust & Local Commerce Verification Strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.42, duration: 0.5 }}
        className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 border-t border-[#E8E2D9] text-xs font-medium text-[#64748B]"
      >
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-[#059669]" aria-hidden="true" />
          <span>16+ Verified neighborhood stores</span>
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-[#059669]" aria-hidden="true" />
          <span>Zero markup on shelf prices</span>
        </span>
      </motion.div>
    </div>
  );
}
