"use client";

import { useRef } from "react";
import Image from "next/image";
import { Sparkles, Store } from "lucide-react";
import { motion } from "motion/react";

interface HeroMediaProps {
  videoSrc?: string;
  posterSrc?: string;
}

export function HeroMedia({
  videoSrc = "/videos/hero-video.mp4",
  posterSrc = "/videos/hero-thumbnail.jpg",
}: HeroMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="relative w-full overflow-hidden rounded-[var(--kw-radius-xl)] border border-[#E8E2D9] bg-[#FAF8F5] shadow-[var(--kw-shadow-lg)] transition-all duration-300">
      {/* 16:9 Aspect Ratio Container matching video */}
      <div className="relative aspect-[16/9] w-full overflow-hidden flex items-center justify-center">
        {/* Next/Image Priority Base & Fallback */}
        <Image
          src={posterSrc}
          alt="Artisanal Indian neighborhood kirana grocery store with fresh produce"
          fill
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 45vw"
          className="object-cover object-center"
        />

        {/* Native HTML5 Cinematic Video Layer */}
        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={posterSrc}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        )}

        {/* Subtle Ambient Vignette Overlay */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0F172A]/40 via-transparent to-transparent"
          aria-hidden="true"
        />

        {/* Floating Context Badges (Editorial Polish) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-3 rounded-[var(--kw-radius-md)] border border-white/20 bg-white/90 p-3.5 backdrop-blur-md shadow-[var(--kw-shadow-md)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF7ED] text-[#D9531E]">
              <Store className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#0F172A]">Gupta Kirana & Provisions</p>
              <p className="text-[11px] font-medium text-[#475569]">
                Fresh Staples · Live stock synced 2m ago
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-bold text-[#059669]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#059669] animate-pulse" />
            <span>Open for delivery</span>
          </div>
        </motion.div>

        {/* AI Intent Tag (Top Right) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-[#0F172A]/85 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md shadow-[var(--kw-shadow-sm)]"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#F59E0B]" aria-hidden="true" />
          <span>AI Intent-to-Basket</span>
        </motion.div>
      </div>
    </div>
  );
}
