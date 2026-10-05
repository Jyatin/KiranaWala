"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";

interface FeatureItem {
  id: string;
  title: string;
  badge: string;
  description: string;
  image: string;
  hasButtonOverlay?: boolean;
}

const FEATURES: FeatureItem[] = [
  {
    id: "designed-around-you",
    title: "Designed around you",
    badge: "Designed around you",
    description: "Choose how you shop — from nearby delivery and store pickup to discovering everyday essentials around you. Always with live inventory and clear choices.",
    image: "/images/features/feature-1.jpg",
    hasButtonOverlay: true,
  },
  {
    id: "discover-nearby",
    title: "Discover nearby",
    badge: "Discover nearby",
    description: "Find verified kirana stores right in your neighborhood and explore what's in stock before you order.",
    image: "/images/features/feature-2.jpg",
  },
  {
    id: "shop-local",
    title: "Shop local",
    badge: "Shop local",
    description: "Support neighborhood shopkeepers with digital storefronts, genuine local trust, and direct merchant connect.",
    image: "/images/features/feature-3.jpg",
  },
  {
    id: "know-whats-available",
    title: "Know what's available",
    badge: "Know what's available",
    description: "Zero guesswork with real-time shelf inventory, transparent pricing, and instant local order confirmation.",
    image: "/images/features/feature-4.jpg",
  },
  {
    id: "made-for-everyday",
    title: "Made for everyday",
    badge: "Made for everyday",
    description: "Everything from quick morning essentials to monthly kitchen staples, delivered smoothly to your doorstep.",
    image: "/images/features/feature-5.jpg",
  },
];

export function FeatureShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const activeFeature = FEATURES[activeIndex];
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-advance transition every 5 seconds (paused on hover)
  useEffect(() => {
    if (isHovered) return;

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % FEATURES.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHovered, activeIndex]);

  const handleSelect = (idx: number) => {
    setActiveIndex(idx);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  return (
    <section
      aria-label="Feature Showcase"
      className="w-full py-20 sm:py-28 bg-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="kw-container">
        {/* Section Header (KiranaWala Neighborhood Connected) */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="font-display text-[32px] sm:text-[54px] lg:text-[62px] font-bold tracking-[-0.035em] text-[#0B051D] leading-[0.95]">
            Your neighbourhood, connected.
          </h2>
          <p className="text-base sm:text-lg text-[#504F5F] font-normal leading-relaxed max-w-xl mx-auto">
            Discover nearby kirana stores, explore live inventory, build smarter baskets, and shop from the stores around you.
          </p>
        </div>

        {/* 2-Column Showcase */}
        <div className="mt-16 sm:mt-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          {/* Left Column: Media Card with Vertical Indicators */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            {/* Vertical Indicator Strip (Klarna Match) */}
            <div className="hidden sm:flex flex-col gap-2.5 absolute -left-8 lg:-left-12 z-20">
              {FEATURES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  aria-label={`Jump to feature ${idx + 1}`}
                  className="p-1 focus-visible:outline-none cursor-pointer"
                >
                  <span
                    className={`block transition-all duration-300 ${
                      idx === activeIndex
                        ? "h-6 w-1.5 rounded-full bg-[#0B051D]"
                        : "h-1.5 w-1.5 rounded-full bg-[#CBD5E1] hover:bg-[#94A3B8]"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Main Rounded Portrait Card */}
            <div className="relative aspect-[3/4] w-full max-w-[420px] sm:max-w-[460px] rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-sm border border-[#E2E2E7] bg-[#F8F7FA]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                  className="relative h-full w-full"
                >
                  <Image
                    src={activeFeature.image}
                    alt={activeFeature.title}
                    fill
                    priority
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 460px"
                    className="object-cover object-center"
                  />

                  {/* Frosted Glass UI Simulation Overlay (Pay Securely / UPI / Cash on Delivery) */}
                  {activeFeature.hasButtonOverlay && (
                    <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] p-3.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/20 shadow-2xl space-y-2 z-10">
                      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/20 text-white text-xs font-bold">
                        <span>Cash on Delivery</span>
                        <span className="h-3.5 w-3.5 rounded-full border border-white/60" />
                      </div>
                      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#FFA8CD] text-[#0B051D] text-xs font-black shadow-sm">
                        <span>Instant UPI</span>
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#0B051D]">
                          <span className="h-1 w-1 rounded-full bg-[#FFA8CD]" />
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bottom Dark Pill Badge */}
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center rounded-full bg-[#0B051D]/85 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-white shadow-sm border border-white/10 whitespace-nowrap">
                      {activeFeature.badge}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column: 5 Interactive Tab Items */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6 sm:space-y-8">
            {FEATURES.map((item, idx) => {
              const isActive = idx === activeIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(idx)}
                  className="cursor-pointer group transition-all"
                >
                  <h3
                    className={`font-display text-2xl sm:text-4xl lg:text-[42px] font-bold tracking-[-0.035em] leading-[0.95] transition-colors duration-200 ${
                      isActive
                        ? "text-[#0B051D]"
                        : "text-[#96959F] group-hover:text-[#504F5F]"
                    }`}
                  >
                    {item.title}
                  </h3>

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="mt-3.5 text-base sm:text-lg text-[#504F5F] font-normal leading-relaxed max-w-xl">
                          {item.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
