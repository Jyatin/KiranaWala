"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Volume2,
  VolumeX,
  ArrowRight,
  Sparkles,
  Store as StoreIcon,
  ShieldCheck,
  Zap,
  Clock,
  Package,
  QrCode,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { IndiaCoverageMap } from "@/components/discover/IndiaCoverageMap";

export default function DiscoverPage() {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <main className="min-h-screen bg-white text-[#0B051D] selection:bg-[#FAD2DE] selection:text-[#0B051D]">
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1 — HERO BANNER (BALANCED, EXPANDED & COMPLEMENTARY)
          Unified rounded card with left-hand bold title & copy,
          and right-hand integrated cinematic video with zero watermark.
      ───────────────────────────────────────────────────────────── */}
      <section className="kw-container pt-8 sm:pt-12 pb-16 lg:pb-24">
        <div className="relative rounded-[32px] sm:rounded-[40px] bg-[#FAF8F5] border border-[#E8E2D9] overflow-hidden min-h-[480px] sm:min-h-[520px] lg:min-h-[540px] flex flex-col lg:flex-row items-center justify-between shadow-xs">
          
          {/* Left Text Block */}
          <div className="w-full lg:w-[46%] p-8 sm:p-12 lg:p-14 flex flex-col justify-center space-y-5 sm:space-y-6 z-10">
            <h1 className="font-display text-[38px] sm:text-[50px] lg:text-[60px] font-bold tracking-[-0.035em] text-[#0B051D] leading-[0.94]">
              What is <br className="hidden sm:inline" />
              KiranaWala?
            </h1>

            <p className="text-sm sm:text-base text-[#332E38] font-normal leading-relaxed">
              KiranaWala is your everyday neighborhood commerce platform, helping you discover local grocery stores, order fresh essentials, and support community merchants with zero price markups.
            </p>

            <p className="text-sm sm:text-base text-[#332E38] font-normal leading-relaxed">
              Built for real life, it gives you transparent neighborhood pricing, intelligent AI meal baskets, and 15-minute doorstep delivery directly from the corner store you know and trust.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/customer/products"
                className="inline-flex items-center gap-2 rounded-full bg-[#FAD2DE] hover:bg-[#F8BDCE] text-[#0B051D] font-bold text-xs sm:text-sm px-6 py-3.5 transition-all duration-200 active:scale-98 shadow-xs cursor-pointer"
              >
                <span>Shop your neighborhood</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/store-owner/register"
                className="inline-flex items-center gap-2 rounded-full border border-[#E8E2D9] bg-white hover:border-[#0B051D] text-[#0B051D] font-bold text-xs sm:text-sm px-6 py-3.5 transition-colors cursor-pointer"
              >
                <span>Join as a merchant</span>
              </Link>
            </div>
          </div>

          {/* Right Video Half - Completely Clear, Expanded & Watermark-Free */}
          <div className="w-full lg:w-[54%] h-[340px] sm:h-[440px] lg:h-[540px] relative overflow-hidden bg-black">
            <video
              ref={videoRef}
              src="/videos/discover-hero.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover object-center scale-[1.02]"
            />

            {/* Bottom-right Corner Sleek Controls (Unobtrusive) */}
            <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20 flex items-center gap-2.5">
              <div className="rounded-full bg-white/95 backdrop-blur-md text-[#0B051D] px-3.5 py-1.5 shadow-sm border border-[#E8E2D9] flex items-center gap-2">
                <QrCode className="h-4 w-4 text-[#0B051D]" />
                <span className="text-xs font-bold text-[#0B051D]">
                  Get App · 15m Delivery
                </span>
              </div>

              {/* Sound Toggle Button */}
              <button
                type="button"
                onClick={toggleSound}
                aria-label={isMuted ? "Unmute film" : "Mute film"}
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-md text-white transition-all hover:bg-black/80 cursor-pointer shadow-sm"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4 text-[#FAD2DE]" />
                )}
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2 — THE HERITAGE (2-COLUMN ASYMMETRICAL EDITORIAL SPREAD)
          Eliminated "photo in the middle" — now integrated cleanly as a
          balanced 2-column layout.
      ───────────────────────────────────────────────────────────── */}
      <section className="kw-container py-16 sm:py-24 border-t border-[#F1EDE6]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Narrative Column */}
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              01 — The Heritage
            </span>
            <h2 className="font-editorial text-[36px] sm:text-[48px] lg:text-[58px] font-normal leading-[1.05] tracking-[-0.03em] text-[#0B051D]">
              The quiet heartbeat of <br />
              <span className="italic">every Indian neighborhood.</span>
            </h2>
            <p className="text-base sm:text-lg text-[#504F5F] leading-relaxed">
              Before instant delivery apps and algorithm-driven dark warehouses, there was your neighborhood kirana. A place where credit is extended on personal trust, where your family&apos;s cooking preferences are known by heart, and where daily life finds its freshest essentials.
            </p>

            {/* 3 Editorial Insights Stacked Cleanly */}
            <div className="space-y-4 pt-4 border-t border-[#F1EDE6]">
              <div>
                <h3 className="font-display text-base font-bold text-[#0B051D]">
                  Generational Trust
                </h3>
                <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed mt-0.5">
                  Red-bound <em>khata</em> ledgers, weighing scales dusted with fresh cumin, and morning milk crates arriving at dawn.
                </p>
              </div>

              <div>
                <h3 className="font-display text-base font-bold text-[#0B051D]">
                  Hyperlocal Knowledge
                </h3>
                <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed mt-0.5">
                  A good kirana owner knows which street prefers Kolam rice over Sona Masoori, and when festival seasons begin.
                </p>
              </div>

              <div>
                <h3 className="font-display text-base font-bold text-[#0B051D]">
                  12 Million Independent Stores
                </h3>
                <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed mt-0.5">
                  Over twelve million family stores power 85% of India&apos;s daily grocery consumption. They are the irreplaceable backbone of our communities.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Editorial Photograph */}
          <div className="lg:col-span-6">
            <div className="rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-xl border border-[#E8E2D9]">
              <img
                src="/images/discover/phone-catalog-still-life.png"
                alt="Authentic Indian kirana staples with modern digital catalog"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3 — THE INVISIBLE WORK (THE FRICTION)
      ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#FAF8F5] py-20 sm:py-28 border-y border-[#F1EDE6]">
        <div className="kw-container max-w-6xl mx-auto space-y-12">
          <div className="max-w-3xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D9531E]">
              02 — The Silent Struggle
            </span>
            <h2 className="font-editorial text-[36px] sm:text-[50px] lg:text-[62px] font-normal leading-[1.04] tracking-[-0.03em] text-[#0B051D]">
              Behind every neighborhood shelf <br />
              <span className="italic">is a lot of invisible work.</span>
            </h2>
            <p className="text-base sm:text-lg text-[#504F5F] leading-relaxed">
              Operating a local kirana is one of the most resilient trades in the world. Yet shopkeepers face daily operational hurdles completely unaided by modern software.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-[24px] bg-white border border-[#E8E2D9] p-7 space-y-3 shadow-2xs hover:border-[#0B051D] transition-colors">
              <span className="text-xs font-bold text-[#94A3B8]">01</span>
              <h3 className="font-display text-lg font-bold text-[#0B051D]">
                Unpredictable Demand
              </h3>
              <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed">
                Purchasing inventory based on intuition rather than real-time neighborhood consumption patterns leads to excess dead capital.
              </p>
            </div>

            <div className="rounded-[24px] bg-white border border-[#E8E2D9] p-7 space-y-3 shadow-2xs hover:border-[#0B051D] transition-colors">
              <span className="text-xs font-bold text-[#94A3B8]">02</span>
              <h3 className="font-display text-lg font-bold text-[#0B051D]">
                Manual Paper Ledgers
              </h3>
              <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed">
                Hours spent every night tallying paper notebooks, handwritten receipts, and reconciliations across dozens of supplier invoices.
              </p>
            </div>

            <div className="rounded-[24px] bg-white border border-[#E8E2D9] p-7 space-y-3 shadow-2xs hover:border-[#0B051D] transition-colors">
              <span className="text-xs font-bold text-[#94A3B8]">03</span>
              <h3 className="font-display text-lg font-bold text-[#0B051D]">
                The Stock-Out Paradox
              </h3>
              <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed">
                Fast-moving daily staples run dry unannounced during peak evening hours, sending loyal neighbors elsewhere.
              </p>
            </div>

            <div className="rounded-[24px] bg-white border border-[#E8E2D9] p-7 space-y-3 shadow-2xs hover:border-[#0B051D] transition-colors">
              <span className="text-xs font-bold text-[#94A3B8]">04</span>
              <h3 className="font-display text-lg font-bold text-[#0B051D]">
                Digital Invisibility
              </h3>
              <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed">
                Watching neighborhood households order from venture-funded dark warehouses simply because the corner shop had no digital storefront.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4 — THE PHILOSOPHY (EMPOWERMENT VS REPLACEMENT)
      ───────────────────────────────────────────────────────────── */}
      <section className="kw-container py-20 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-[#059669]">
              03 — The Philosophy
            </span>
            <h2 className="font-editorial text-[36px] sm:text-[48px] lg:text-[58px] font-normal leading-[1.04] tracking-[-0.03em] text-[#0B051D]">
              Technology shouldn&apos;t replace the neighborhood store. <br />
              <span className="italic">It should make it stronger.</span>
            </h2>
            <p className="text-base sm:text-lg text-[#504F5F] leading-relaxed">
              Quick-commerce corporations build windowless dark warehouses designed to displace the local merchant. KiranaWala takes the opposite stance: the neighborhood shopkeeper is an irreplaceable community asset.
            </p>
            <p className="text-base text-[#504F5F] leading-relaxed">
              We believe the future of grocery isn&apos;t mega-warehouses 15 kilometers away. It is the family-owned store 200 meters from your doorstep, equipped with the world&apos;s best digital tools.
            </p>
            <div className="pt-2">
              <Link
                href="/store-owner/register"
                className="inline-flex items-center gap-2 rounded-full bg-[#0B051D] px-6 py-3.5 text-xs font-bold text-white hover:bg-[#2C2242] transition-colors cursor-pointer"
              >
                <span>Partner With KiranaWala</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Clean photographic portrait */}
          <div className="lg:col-span-6">
            <div className="rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-xl border border-[#E8E2D9]">
              <img
                src="/images/auth-merchant-scene.jpg"
                alt="Kirana store owner operating digital store seamlessly"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5 — AI / INVISIBLE INTELLIGENCE (PRACTICAL & HUMAN)
      ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#FAF8F5] py-20 sm:py-28 border-y border-[#F1EDE6]">
        <div className="kw-container max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-xl border border-[#E8E2D9]">
                <img
                  src="/images/discover/phone-basket-ingredients.png"
                  alt="Natural ingredients translated into intelligent meal basket"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-6 space-y-6 order-1 lg:order-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B051D]">
                04 — Invisible Intelligence
              </span>
              <h2 className="font-editorial text-[36px] sm:text-[48px] lg:text-[58px] font-normal leading-[1.04] tracking-[-0.03em] text-[#0B051D]">
                Intelligence that feels human, <br />
                <span className="italic">not futuristic.</span>
              </h2>
              <p className="text-base sm:text-lg text-[#504F5F] leading-relaxed">
                No glowing circuit boards. No robotic jargon. KiranaWala AI simply notices patterns from everyday neighborhood shopping and translates them into quiet, practical decisions.
              </p>

              <div className="space-y-4 pt-2">
                <div className="rounded-[20px] bg-white border border-[#E8E2D9] p-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0B051D]">
                    <span className="h-2 w-2 rounded-full bg-[#059669]" />
                    <span>Demand Prediction for Merchants</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed">
                    Notices that fresh coriander, curd, and idli batter sales spike 300% on Sunday mornings — prompting the shopkeeper to restock on Friday afternoon.
                  </p>
                </div>

                <div className="rounded-[20px] bg-white border border-[#E8E2D9] p-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0B051D]">
                    <span className="h-2 w-2 rounded-full bg-[#0B051D]" />
                    <span>Natural Language Recipe Baskets</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed">
                    A customer asks: &quot;Make a dinner basket for four with dal tadka and jeera rice.&quot; The AI assembles the exact rice, toor dal, cumin, and ghee available in their selected store.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 6 — THE SHOPPER JOURNEY (ONE FOCUSED EDITORIAL IMAGE)
          Removed redundant second photo to avoid cluttered layout.
      ───────────────────────────────────────────────────────────── */}
      <section className="kw-container py-20 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              05 — The Shopper Journey
            </span>
            <h2 className="font-editorial text-[36px] sm:text-[48px] lg:text-[58px] font-normal leading-[1.04] tracking-[-0.03em] text-[#0B051D]">
              Neighborhood shopping, crafted <br />
              <span className="italic">for how you live today.</span>
            </h2>
            <p className="text-base sm:text-lg text-[#504F5F] leading-relaxed">
              Search local stores within your immediate postal zone. Browse verified shelves. Support the merchants on your street without paying inflated convenience fees.
            </p>

            <div className="space-y-4 pt-4 border-t border-[#F1EDE6]">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] border border-[#E8E2D9] text-xs font-bold text-[#0B051D]">
                  1
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-[#0B051D]">
                    Select Your Corner Store
                  </h3>
                  <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed mt-0.5">
                    Order from the exact merchant you already know and trust on your street.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] border border-[#E8E2D9] text-xs font-bold text-[#0B051D]">
                  2
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-[#0B051D]">
                    Zero Price Markups
                  </h3>
                  <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed mt-0.5">
                    Pay the genuine in-store shelf price without dark warehouse surcharges.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] border border-[#E8E2D9] text-xs font-bold text-[#0B051D]">
                  3
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-[#0B051D]">
                    15-Minute Doorstep Delivery
                  </h3>
                  <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed mt-0.5">
                    Carried by dedicated neighborhood runners directly to your door.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Single focused, high-impact photograph */}
          <div className="lg:col-span-6">
            <div className="rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-xl border border-[#E8E2D9]">
              <img
                src="/images/discover/sunlit-fruit-basket.jpg"
                alt="Sunlit fresh fruits and daily produce on table"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 7 — THE CONNECTION (DOORSTEP FULFILLMENT CENTERPIECE)
          Using the user's authentic KiranaWala doorstep delivery photograph.
      ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#FAF8F5] py-20 sm:py-28 border-y border-[#F1EDE6]">
        <div className="kw-container max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B051D]">
              06 — The Connection
            </span>
            <h2 className="font-editorial text-[36px] sm:text-[50px] lg:text-[64px] font-normal leading-[1.04] tracking-[-0.03em] text-[#0B051D]">
              Technology connects the shelf <br />
              <span className="italic">to the doorstep.</span>
            </h2>
            <p className="text-base sm:text-lg text-[#504F5F] leading-relaxed">
              When you order through KiranaWala, goods do not travel from an industrial warehouse across the highway. They come directly from your neighborhood street.
            </p>
          </div>

          {/* User-Provided Authentic KiranaWala Doorstep Delivery Photograph */}
          <div className="rounded-[28px] sm:rounded-[40px] overflow-hidden shadow-2xl border border-[#E8E2D9]">
            <img
              src="/images/discover/doorstep-delivery.jpg"
              alt="KiranaWala delivery rider handing fresh grocery bag to customer at doorstep in warm afternoon sunlight"
              className="w-full h-auto object-cover"
            />
          </div>

          {/* 4 Node Flow Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-7 px-6 sm:px-10 rounded-[28px] bg-white border border-[#E8E2D9] max-w-4xl mx-auto text-center shadow-xs">
            <div className="space-y-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-[#64748B]">Origin</span>
              <span className="block font-display text-base font-bold text-[#0B051D]">Local Shopkeeper</span>
            </div>
            <ArrowRight className="h-4 w-4 text-[#94A3B8] hidden sm:block" />
            <div className="space-y-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-[#64748B]">System</span>
              <span className="block font-display text-base font-bold text-[#0B051D]">KiranaWala Engine</span>
            </div>
            <ArrowRight className="h-4 w-4 text-[#94A3B8] hidden sm:block" />
            <div className="space-y-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-[#64748B]">Transit</span>
              <span className="block font-display text-base font-bold text-[#0B051D]">Neighborhood Runner</span>
            </div>
            <ArrowRight className="h-4 w-4 text-[#94A3B8] hidden sm:block" />
            <div className="space-y-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-[#64748B]">Destination</span>
              <span className="block font-display text-base font-bold text-[#0B051D]">Your Kitchen</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 8 — NATIONWIDE NETWORK (ADVANCED INDIA COVERAGE MAP)
          Placing moved right after doorstep delivery to highlight nationwide
          reach and scale before the social fabric and final CTAs.
      ───────────────────────────────────────────────────────────── */}
      <section className="kw-container py-20 sm:py-28">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12 sm:mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
            07 — The Network
          </span>
          <h2 className="font-display text-[36px] sm:text-[48px] lg:text-[58px] font-bold tracking-[-0.035em] text-[#0B051D] leading-[0.95]">
            KiranaWala is available across India
          </h2>
          <p className="text-base sm:text-lg text-[#504F5F] leading-relaxed">
            Over 10,000+ local kirana merchants across 5 major metros choose KiranaWala to power their neighborhood commerce, with 250,000+ daily deliveries.
          </p>
        </div>

        {/* Advanced Interactive India Coverage Map */}
        <IndiaCoverageMap />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 9 — WHY IT MATTERS (THE SOCIAL FABRIC)
      ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#FAF8F5] py-20 sm:py-28 border-t border-[#F1EDE6] text-center">
        <div className="kw-container max-w-4xl mx-auto space-y-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
            08 — The Bigger Purpose
          </span>

          <h2 className="font-editorial text-[38px] sm:text-[54px] lg:text-[68px] font-normal leading-[1.04] tracking-[-0.03em] text-[#0B051D]">
            Every neighborhood has a store <br />
            <span className="italic">that knows its people.</span>
          </h2>

          <p className="font-editorial text-2xl sm:text-3xl text-[#0B051D] font-normal italic leading-snug">
            &quot;KiranaWala gives that relationship the technology it deserves.&quot;
          </p>

          <p className="text-base sm:text-lg text-[#504F5F] leading-relaxed max-w-2xl mx-auto">
            Neighborhood commerce is about more than buying flour and milk. It is about economic sovereignty for families who have operated stores for generations. It keeps wealth circulating inside local communities. In an era of faceless algorithms, human commerce is worth defending.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 10 — THE FUTURE & CALL TO ACTION
      ───────────────────────────────────────────────────────────── */}
      <section className="kw-container py-20 sm:py-28 text-center max-w-4xl mx-auto space-y-8">
        <h2 className="font-editorial text-[36px] sm:text-[52px] lg:text-[66px] font-normal leading-[1.05] tracking-[-0.03em] text-[#0B051D]">
          The future of local commerce <br />
          isn&apos;t somewhere else. <br />
          <span className="italic">It&apos;s right around the corner.</span>
        </h2>

        <p className="text-base sm:text-lg text-[#504F5F] max-w-xl mx-auto leading-relaxed">
          Join thousands of neighborhood stores and conscious shoppers rebuilding local commerce from the ground up.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/customer/products"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#FAD2DE] hover:bg-[#F8BDCE] text-[#0B051D] px-8 py-4 font-bold text-sm transition-all duration-200 shadow-xs cursor-pointer"
          >
            <span>Shop Your Neighborhood</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/store-owner/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[#E8E2D9] bg-white hover:border-[#0B051D] text-[#0B051D] px-8 py-4 font-bold text-sm transition-all duration-200 cursor-pointer"
          >
            <span>Join as a Merchant</span>
          </Link>
        </div>

        <div className="pt-4">
          <Link
            href="/shop"
            className="text-xs font-semibold text-[#64748B] hover:text-[#0B051D] underline underline-offset-4"
          >
            Browse all 12 local stores in Bengaluru →
          </Link>
        </div>
      </section>
    </main>
  );
}
