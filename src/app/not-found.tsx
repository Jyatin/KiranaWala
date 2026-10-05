"use client";

import Link from "next/link";
import { Search, ShoppingBag, Store as StoreIcon, HelpCircle, ArrowRight } from "lucide-react";
import { Footer } from "@/components/footer/Footer";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#FAF8F5] text-[#0B051D] flex flex-col justify-between selection:bg-[#FAD2DE]">
      <section className="kw-container py-20 flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#FAD2DE] border border-[#0B051D] px-3.5 py-1 text-xs font-bold text-[#0B051D]">
          <span>404 · Page Not Found</span>
        </div>

        <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-[#0B051D] leading-tight">
          Looking for something <br />
          <span className="italic text-[#504F5F]">around the neighborhood?</span>
        </h1>

        <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed max-w-md">
          The page you requested doesn&apos;t exist or has moved. Explore our product marketplace, discover local Kirana stores, or search our Help Center below.
        </p>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-4">
          <Link
            href="/shop"
            className="rounded-2xl border border-[#E8E2D9] bg-white p-4 text-center space-y-2 hover:border-[#0B051D] hover:shadow-xs transition-all"
          >
            <ShoppingBag className="h-5 w-5 text-[#059669] mx-auto" />
            <span className="font-bold text-xs text-[#0B051D] block">Shop Products</span>
            <span className="text-[10px] text-[#64748B] block">Browse catalog</span>
          </Link>

          <Link
            href="/stores"
            className="rounded-2xl border border-[#E8E2D9] bg-white p-4 text-center space-y-2 hover:border-[#0B051D] hover:shadow-xs transition-all"
          >
            <StoreIcon className="h-5 w-5 text-[#D9531E] mx-auto" />
            <span className="font-bold text-xs text-[#0B051D] block">Local Stores</span>
            <span className="text-[10px] text-[#64748B] block">Find neighborhood kiranas</span>
          </Link>

          <Link
            href="/help"
            className="rounded-2xl border border-[#E8E2D9] bg-white p-4 text-center space-y-2 hover:border-[#0B051D] hover:shadow-xs transition-all"
          >
            <HelpCircle className="h-5 w-5 text-[#7B57D8] mx-auto" />
            <span className="font-bold text-xs text-[#0B051D] block">Help Center</span>
            <span className="text-[10px] text-[#64748B] block">FAQs & assistance</span>
          </Link>
        </div>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0B051D] px-7 text-xs font-bold text-white hover:bg-[#2C2242] transition-all"
          >
            <span>Return to Homepage</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
