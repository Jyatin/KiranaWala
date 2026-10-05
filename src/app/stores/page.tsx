"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Store as StoreIcon,
  Search,
  MapPin,
  Clock,
  Star,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  CheckCircle2,
  Volume2,
  VolumeX,
  QrCode,
} from "lucide-react";
import { Store } from "@/components/shop/types";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { Footer } from "@/components/footer/Footer";

const AREAS = ["All Areas", "HSR Layout", "Indiranagar", "Koramangala", "Whitefield", "Jayanagar", "Powai", "Bandra"];
const STORE_TYPES = ["All Types", "Kirana & General Store", "Supermarket", "Daily Needs", "Provisions"];

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState("All Areas");
  const [selectedCategory, setSelectedCategory] = useState("All Types");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (searchQuery.trim()) queryParams.set("q", searchQuery.trim());
        if (selectedCategory !== "All Types") queryParams.set("category", selectedCategory);

        const res = await fetch(`/api/customer/stores?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setStores(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch stores:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchStores, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      if (selectedArea !== "All Areas") {
        const desc = (store.description || "").toLowerCase();
        const name = (store.name || "").toLowerCase();
        const areaLower = selectedArea.toLowerCase();
        if (!desc.includes(areaLower) && !name.includes(areaLower)) {
          return false;
        }
      }
      return true;
    });
  }, [stores, selectedArea]);

  return (
    <main className="min-h-screen bg-white text-[#0B051D] selection:bg-[#FAD2DE] selection:text-[#0B051D]">
      {/* ─────────────────────────────────────────────────────────────
          HERO BANNER — MATCHING DISCOVER PAGE CINEMATIC VIDEO CARD
          Two-column card with editorial title & copy on left,
          and high-quality Kirana store video loop on right.
      ───────────────────────────────────────────────────────────── */}
      <section className="kw-container pt-6 sm:pt-10 pb-10">
        <div className="relative rounded-[32px] sm:rounded-[40px] bg-[#FAF8F5] border border-[#E8E2D9] overflow-hidden min-h-[460px] sm:min-h-[500px] lg:min-h-[520px] flex flex-col lg:flex-row items-center justify-between shadow-xs">

          {/* Left Text Block */}
          <div className="w-full lg:w-[48%] p-8 sm:p-12 lg:p-14 flex flex-col justify-center space-y-5 z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[#E8E2D9] px-3.5 py-1 text-xs font-bold text-[#059669] w-fit shadow-xs">
              <StoreIcon className="h-3.5 w-3.5" />
              <span>12+ Hyperlocal Kirana Partners Live</span>
            </div>

            <h1 className="font-display text-[38px] sm:text-[48px] lg:text-[58px] font-bold tracking-[-0.035em] text-[#0B051D] leading-[0.94]">
              Discover local <br />
              kirana stores.
            </h1>

            <p className="text-sm sm:text-base text-[#332E38] font-normal leading-relaxed">
              Order directly from your trusted corner store. Experience zero shelf-price markups, 15-minute doorstep delivery, and 100% transparent neighborhood commerce.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/shop"
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

          {/* Right Video Half — High Quality Kirana Shelf Video Loop */}
          <div className="w-full lg:w-[52%] h-[320px] sm:h-[420px] lg:h-[520px] relative overflow-hidden bg-black">
            <video
              ref={videoRef}
              src="/videos/discover-nearby-loop.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover object-center scale-[1.02]"
            />

            {/* Bottom-right Corner Sleek Controls */}
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
                aria-label={isMuted ? "Unmute video" : "Mute video"}
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-md text-white transition-all hover:bg-black/80 cursor-pointer shadow-sm"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                ) : (
                  <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Area Filter Bar Section */}
      <section className="bg-[#FAF8F5] border-y border-[#E8E2D9] py-6">
        <div className="kw-container space-y-4">
          <div className="relative max-w-2xl flex items-center">
            <Search className="absolute left-4 sm:left-5 h-5 w-5 text-[#0B051D] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search store name, street, or specialty (e.g. Gupta Kirana, HSR)..."
              className="w-full h-13 sm:h-14 rounded-full border border-[#E8E2D9] bg-white pl-12 sm:pl-14 pr-5 text-sm sm:text-base font-medium text-[#0B051D] placeholder:text-[#94A3B8] focus:border-[#0B051D] focus:outline-none focus:ring-1 focus:ring-[#0B051D] transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-4 text-xs font-bold text-[#64748B] hover:text-[#0B051D]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Neighborhood Pill Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold text-[#64748B] shrink-0 mr-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Neighborhoods:
            </span>
            {AREAS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => setSelectedArea(area)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${selectedArea === area
                    ? "bg-[#0B051D] text-white shadow-xs"
                    : "bg-white border border-[#E8E2D9] text-[#504F5F] hover:border-[#0B051D] hover:bg-[#FAF8F5]"
                  }`}
              >
                {area}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold text-[#64748B] shrink-0 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Store Type:
            </span>
            {STORE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedCategory(type)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${selectedCategory === type
                    ? "bg-[#FAD2DE] border border-[#0B051D] text-[#0B051D]"
                    : "bg-white border border-[#E8E2D9] text-[#504F5F] hover:border-[#0B051D]"
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Stores Grid Section */}
      <section className="kw-container py-10 sm:py-14 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0B051D]">
            Nearby Partner Stores ({filteredStores.length})
          </h2>
          <span className="text-xs font-bold text-[#059669] flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#059669] animate-pulse" />
            Live Network Active
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 rounded-3xl border border-[#E8E2D9] bg-white p-6 animate-pulse space-y-4"
              >
                <div className="h-6 w-2/3 bg-[#F3F3F5] rounded-md" />
                <div className="h-4 w-full bg-[#F3F3F5] rounded-md" />
                <div className="h-4 w-4/5 bg-[#F3F3F5] rounded-md" />
                <div className="pt-6 h-10 w-full bg-[#F3F3F5] rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="rounded-3xl border border-[#E8E2D9] bg-white p-12 text-center space-y-4 max-w-md mx-auto my-8">
            <div className="h-14 w-14 rounded-full bg-[#FAF8F5] border border-[#E8E2D9] flex items-center justify-center mx-auto text-[#64748B]">
              <StoreIcon className="h-7 w-7" />
            </div>
            <h3 className="font-display text-lg font-bold text-[#0B051D]">
              No stores match your search
            </h3>
            <p className="text-xs text-[#504F5F] leading-relaxed">
              Try searching with another keyword or select &quot;All Areas&quot; to see all partner Kirana stores.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedArea("All Areas");
                setSelectedCategory("All Types");
              }}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#0B051D] px-6 text-xs font-bold text-white hover:bg-[#2C2242]"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStores.map((store) => (
              <div
                key={store._id}
                className="group relative flex flex-col justify-between rounded-3xl border border-[#E8E2D9] bg-white p-6 shadow-xs hover:border-[#0B051D] hover:shadow-md transition-all duration-200"
              >
                <div className="space-y-4">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#ECFDF5] border border-[#059669]/20 px-3 py-1 text-[11px] font-bold text-[#059669] flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" />
                      Open Now · 15–20m
                    </span>

                    <span className="rounded-full bg-[#FAF8F5] border border-[#E8E2D9] px-2.5 py-1 text-[11px] font-bold text-[#0B051D]">
                      {store.category || "Kirana Store"}
                    </span>
                  </div>

                  {/* Store Name & Description */}
                  <div className="space-y-1.5">
                    <h3 className="font-display text-xl font-bold text-[#0B051D] group-hover:text-[#059669] transition-colors leading-tight">
                      {store.name}
                    </h3>
                    <p className="text-xs text-[#504F5F] line-clamp-2 leading-relaxed font-normal">
                      {store.description}
                    </p>
                  </div>

                  {/* Highlights Bar */}
                  <div className="rounded-2xl bg-[#FAF8F5] border border-[#E8E2D9] p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                        <strong className="text-[#0B051D]">4.8</strong> (120+ ratings)
                      </span>
                      <span className="text-[#059669] font-bold">
                        ₹0 Price Markup
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1 border-t border-[#E8E2D9]">
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3" />
                        {(store as any).productCount || 20}+ items in stock
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        ~0.8 km nearby
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className="pt-6">
                  <Link
                    href={`/stores/${store._id}`}
                    className="flex h-12 w-full items-center justify-between rounded-full bg-[#FFA8CD] hover:bg-[#FFB8D7] px-6 text-xs font-bold text-[#0B051D] transition-all group-hover:shadow-xs active:scale-[0.98]"
                  >
                    <span>Shop This Store</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Kirana Guarantee Banner */}
      <section className="bg-white border-t border-[#E8E2D9] py-12">
        <div className="kw-container">
          <div className="rounded-3xl border border-[#E8E2D9] bg-[#0B051D] text-white p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl text-center md:text-left">
              <span className="rounded-full bg-[#FFA8CD]/20 border border-[#FFA8CD]/40 px-3.5 py-1 text-xs font-bold text-[#FFA8CD]">
                KiranaWala Merchant Pledge
              </span>
              <h3 className="font-editorial text-2xl sm:text-3xl font-normal text-white">
                Empowering 12 Million Family-Run Kirana Stores Across India.
              </h3>
              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                When you shop on KiranaWala, 100% of product revenue goes directly to your neighborhood shopkeeper. No dark stores, no hidden margins.
              </p>
            </div>

            <Link
              href="/store-owner/register"
              className="shrink-0 h-12 rounded-full bg-white px-6 text-xs font-bold text-[#0B051D] hover:bg-[#FAF8F5] transition-all flex items-center gap-2"
            >
              <span>Partner as a Store Owner</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
