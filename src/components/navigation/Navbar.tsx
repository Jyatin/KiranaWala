"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-white">
      {/* Top Micro-Utility Bar */}
      <div className="border-b border-[#E2E2E7] bg-white py-2 text-xs">
        <div className="kw-container flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-[#0B051D] border-b-2 border-[#0B051D] pb-1">
              For shoppers
            </span>
            <Link
              href="/store-owner/dashboard"
              className="text-[#504F5F] font-medium transition-colors hover:text-[#0B051D] pb-1"
            >
              For business
            </Link>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-[#504F5F]">
            <span>Bengaluru</span>
            <span>·</span>
            <span className="font-medium text-[#046234]">16 Stores Live</span>
          </div>
        </div>
      </div>

      {/* Main Brand Navigation Bar */}
      <div
        className={cn(
          "w-full transition-all duration-200 bg-white",
          isScrolled ? "border-b border-[#E2E2E7] py-3.5 shadow-sm" : "py-4"
        )}
      >
        <div className="kw-container flex items-center justify-between">
          {/* Brand Logo - Klarna style bold ink wordmark */}
          <Link
            href="/"
            className="group inline-flex items-center text-[26px] font-black tracking-[-0.04em] text-[#0B051D]"
          >
            KiranaWala
          </Link>

          {/* Desktop Navigation */}
          <DesktopNav />

          {/* Mobile Navigation */}
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
