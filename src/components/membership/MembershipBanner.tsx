"use client";

import Link from "next/link";
import { motion } from "motion/react";

export function MembershipBanner() {
  return (
    <section aria-label="Memberships Feature" className="w-full py-16 sm:py-24 bg-white border-t border-[#E2E2E7]">
      <div className="kw-container max-w-4xl text-center space-y-6">
        {/* Section Heading & Subhead (Screenshot 5 Match) */}
        <h2 className="font-display text-[32px] sm:text-[56px] lg:text-[62px] font-bold tracking-[-0.035em] text-[#0B051D] leading-[0.95]">
          Your neighbourhood, instantly
        </h2>

        <p className="text-base sm:text-lg text-[#504F5F] font-normal max-w-xl mx-auto leading-relaxed">
          Get fresh groceries from nearby kirana stores, delivered fast and reliably.
        </p>

        <div>
          <Link
            href="/shop"
            className="inline-flex h-11 sm:h-12 items-center justify-center rounded-full bg-[#0B051D] px-7 text-sm sm:text-base font-bold text-[#F9F8F5] transition-all hover:bg-[#2C2242] active:scale-[0.98]"
          >
            Explore stores
          </Link>
        </div>

        {/* Graphical Showcase Card (Discover Nearby Editorial Loop) */}
        <div className="pt-10 flex justify-center">
          <div className="relative aspect-[3/4] w-full max-w-[300px] sm:max-w-[340px] rounded-[32px] sm:rounded-[36px] bg-[#0B051D] border border-[#E2E2E7] p-7 flex flex-col justify-between items-start shadow-sm overflow-hidden group">
            {/* Background Looping Editorial Video (Real Kirana Discovery Film) */}
            <video
              src="/videos/discover-nearby-loop.mp4"
              poster="/videos/discover-nearby-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover object-center"
            />

            {/* Subtle Gradient Overlays for Maximum Contrast & Editorial Polish */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B051D]/90 via-transparent to-[#0B051D]/40 pointer-events-none" />

            {/* Top Row: Supporting Text */}
            <div className="relative z-10 w-full flex justify-between items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/90 drop-shadow">
                What's around you, now.
              </span>
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
            </div>

            {/* Spacer to push headline & badge to the bottom */}
            <div className="flex-1" />

            {/* Bottom Section: Headline & Pill Badge */}
            <div className="relative z-10 w-full space-y-3">
              <span className="font-display text-3xl sm:text-4xl font-black text-white tracking-tight leading-[1.05] block drop-shadow-md">
                Discover <br />
                nearby
              </span>

              <div className="flex items-center justify-between pt-1">
                <span className="inline-flex items-center rounded-full bg-white/25 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-white border border-white/20 shadow-sm">
                  Local stores
                </span>
                <span className="text-[11px] font-semibold text-white/80">
                  0.6 km away
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
