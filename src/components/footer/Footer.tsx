"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full bg-[#0B051D] text-[#F9F8F5] pt-16 pb-12 mt-20">
      <div className="kw-container space-y-12">
        {/* Footnotes Block (Klarna Spec) */}
        <div className="border-b border-white/10 pb-8 space-y-2 text-xs text-[#96959F] leading-relaxed">
          <p>¹ Live stock verification depends on store open hours and periodic inventory sync.</p>
          <p>² Store acceptance may vary based on merchant participation in the KiranaWala hyperlocal network.</p>
          <p>³ KiranaClub membership perks subject to terms and local delivery distance limits.</p>
          <p>⁴ Zero markup applies to standard shelf prices reported by verified neighborhood grocers.</p>
        </div>

        {/* 3 Link Columns + Brand */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pt-4">
          <div className="space-y-4">
            <span className="font-display text-2xl font-black tracking-tight text-white block">
              KiranaWala
            </span>
            <p className="text-xs text-[#96959F] leading-relaxed max-w-xs">
              Your neighborhood, intelligently connected. Bringing digital speed, AI basket convenience, and local warmth to everyday grocery shopping.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              KiranaWala
            </h4>
            <ul className="space-y-2.5 text-xs text-[#96959F]">
              <li><Link href="/discover" className="hover:text-white transition-colors">Discover KiranaWala</Link></li>
              <li><Link href="/stores" className="hover:text-white transition-colors">Stores Directory</Link></li>
              <li><Link href="/help" className="hover:text-white transition-colors">Help Center & FAQ</Link></li>
              <li><Link href="/discover" className="hover:text-white transition-colors">Our Mission</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Customer
            </h4>
            <ul className="space-y-2.5 text-xs text-[#96959F]">
              <li><Link href="/shop" className="hover:text-white transition-colors">Shop Groceries</Link></li>
              <li><Link href="/customer/register" className="hover:text-white transition-colors">Start Shopping (Sign Up)</Link></li>
              <li><Link href="/customer/login" className="hover:text-white transition-colors">Customer Login</Link></li>
              <li><Link href="/customer/dashboard" className="hover:text-white transition-colors">Customer Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              For Business
            </h4>
            <ul className="space-y-2.5 text-xs text-[#96959F]">
              <li><Link href="/store-owner/register" className="hover:text-white transition-colors">Register Your Shop</Link></li>
              <li><Link href="/store-owner/login" className="hover:text-white transition-colors">Shop Owner Login</Link></li>
              <li><Link href="/store-owner/dashboard" className="hover:text-white transition-colors">Merchant Dashboard</Link></li>
              <li><Link href="/stores" className="hover:text-white transition-colors">Stores Directory</Link></li>
            </ul>
          </div>
        </div>

        {/* Region & Area Switcher Pill */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-xs text-[#96959F]">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white">Area:</span>
            <Link href="/stores" className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors cursor-pointer">
              <span>🇮🇳</span>
              <span>Bengaluru · HSR Layout</span>
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/help" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/help" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/help" className="hover:text-white transition-colors">Help Center</Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center sm:text-left text-[11px] text-[#615F6D] pt-4">
          © {new Date().getFullYear()} KiranaWala Technologies Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
