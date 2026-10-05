"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Star, Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";

export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  return (
    <section aria-label="Hero Section" className="w-full pt-2 pb-12 sm:pt-3 sm:pb-16 bg-white">
      <div className="kw-container space-y-10 sm:space-y-12">
        {/* ─── 1. Main Editorial Hero Billboard (Klarna Exact Match) ─── */}
        <div className="relative w-full overflow-hidden rounded-[28px] sm:rounded-[36px] lg:rounded-[42px] border border-[#E2E2E7] bg-[#F8F7FA]">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[420px] lg:min-h-[480px] xl:min-h-[500px]">
            {/* Left Column: Bold Typography & Pink Pill CTA */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-6 flex flex-col justify-between p-6 sm:p-9 lg:p-10 xl:p-12 z-10">
              <div className="space-y-4 sm:space-y-5 max-w-xl">
                <h1 className="font-display text-[32px] sm:text-[44px] lg:text-[48px] xl:text-[54px] font-bold tracking-[-0.035em] text-[#0B051D] leading-[0.94]">
                  Everything your <br />
                  neighbourhood needs. <br />
                  All in one place.
                </h1>

                <p className="text-sm sm:text-base font-normal leading-relaxed text-[#504F5F] max-w-sm">
                  Discover a smarter way to shop, save, and stay connected with your neighborhood stores. All in one place with KiranaWala.
                </p>

                {/* Role-Specific Action Pathways (Customer vs Store Owner) */}
                <div className="pt-1 space-y-3.5">
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <Link
                      href="/customer/register"
                      className="inline-flex h-11 sm:h-12 items-center justify-center rounded-full bg-[#FFA8CD] px-6 text-sm sm:text-base font-bold text-[#0B051D] transition-all duration-200 hover:bg-[#FFB8D7] hover:scale-[1.02] active:scale-[0.98] shadow-sm cursor-pointer"
                    >
                      Start Shopping
                    </Link>

                    <Link
                      href="/store-owner/register"
                      className="inline-flex h-11 sm:h-12 items-center justify-center rounded-full border border-[#0B051D] bg-white px-5 sm:px-6 text-sm sm:text-base font-bold text-[#0B051D] transition-all duration-200 hover:bg-[#0B051D] hover:text-white active:scale-[0.98] cursor-pointer"
                    >
                      Register Your Shop
                    </Link>
                  </div>

                  {/* Quick Role Sign-In Links */}
                  <div className="flex items-center gap-2 text-xs text-[#504F5F]">
                    <span>Already a member?</span>
                    <Link
                      href="/customer/login"
                      className="font-bold text-[#0B051D] underline underline-offset-2 hover:opacity-75"
                    >
                      Customer Login
                    </Link>
                    <span>·</span>
                    <Link
                      href="/store-owner/login"
                      className="font-bold text-[#0B051D] underline underline-offset-2 hover:opacity-75"
                    >
                      Shop Owner Login
                    </Link>
                  </div>
                </div>
              </div>

              {/* Bottom Carousel Indicator Dots */}
              <div className="hidden lg:flex items-center gap-2 pt-4">
                <span className="h-1.5 w-6 rounded-full bg-[#0B051D]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1]" />
              </div>
            </div>

            {/* Right Column: Full-Bleed Media Frame */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-6 relative w-full overflow-hidden aspect-[16/9] lg:aspect-auto lg:h-full bg-[#F3F3F5]">
              <video
                ref={videoRef}
                src="/videos/hero-video.mp4"
                poster="/videos/hero-thumbnail.jpg"
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover object-center"
              />

              {/* Minimal Top-Right Media Controls */}
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 z-10">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute video" : "Mute video"}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60 cursor-pointer"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleFullscreen}
                  aria-label="Expand media"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60 cursor-pointer"
                >
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause media" : "Play media"}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 2. Social Proof & Capabilities Strip (KiranaWala Neighborhood Match) ─── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-4 pb-8 border-b border-[#E2E2E7]">
          {/* Left Proof Statement with Pink Badge Highlight */}
          <div className="flex flex-wrap items-center gap-2 text-xl sm:text-3xl lg:text-[34px] font-black text-[#0B051D] tracking-tight">
            <span>Built for your</span>
            <span className="rounded-md bg-[#FFA8CD] px-2.5 py-0.5 text-[#0B051D] font-black">
              neighborhood
            </span>
          </div>

          {/* Right Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-14">
            <div>
              <div className="flex items-center gap-1.5 text-3xl sm:text-4xl font-black text-[#0B051D] tracking-tight">
                <span>15–20m</span>
              </div>
              <p className="mt-1 text-xs text-[#504F5F] font-medium">Nearby delivery</p>
            </div>

            <div>
              <div className="text-3xl sm:text-4xl font-black text-[#0B051D] tracking-tight">
                Live
              </div>
              <p className="mt-1 text-xs text-[#504F5F] font-medium">Shelf inventory</p>
            </div>

            <div>
              <div className="text-3xl sm:text-4xl font-black text-[#0B051D] tracking-tight">
                Smart
              </div>
              <p className="mt-1 text-xs text-[#504F5F] font-medium">Recipe baskets</p>
            </div>

            <div>
              <div className="text-3xl sm:text-4xl font-black text-[#0B051D] tracking-tight">
                ₹0
              </div>
              <p className="mt-1 text-xs text-[#504F5F] font-medium">Shelf markup</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
