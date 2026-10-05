"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
  ShoppingBag,
  ChevronRight,
} from "lucide-react";

import { getStoredAuth, setStoredAuth, isCustomer, isMerchant } from "@/lib/auth";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect immediately
  useEffect(() => {
    const { token, role } = getStoredAuth();
    if (token) {
      if (isCustomer(role)) {
        router.replace("/shop");
      } else if (isMerchant(role)) {
        router.replace("/merchant/dashboard");
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Invalid email or password.");
      }

      if (data.token) {
        setStoredAuth({
          token: data.token,
          role: "customer",
          username: data.user?.username || email.split("@")[0],
          email: data.user?.email || email,
        });
        window.location.href = "/shop";
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid credentials or server connection issue.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-96px)] bg-white text-[#0B051D] selection:bg-[#FAD2DE] selection:text-[#0B051D] flex flex-col justify-center">
      <section className="kw-container py-4 sm:py-6 lg:py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Form & Hierarchy (approx 42% width on desktop) */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-4 sm:space-y-5">
            {/* 1. Small Portal Label */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#F5F4F0] px-3 py-1 text-[11px] font-bold tracking-wider uppercase text-[#4B5563]">
                <Sparkles className="h-3.5 w-3.5 text-[#9B3856]" />
                <span>Customer Portal</span>
              </div>
            </div>

            {/* 2. Large Editorial Heading & 3. Restrained Supporting Copy */}
            <div className="space-y-2">
              <h1 className="font-editorial text-[42px] sm:text-[48px] lg:text-[54px] font-normal tracking-[-0.025em] text-[#0B051D] leading-[1.04]">
                Welcome back, <br />
                shopper.
              </h1>

              <p className="text-sm text-[#504F5F] font-normal leading-relaxed max-w-sm">
                Shop local groceries, build smarter baskets, and track your neighborhood deliveries in real time.
              </p>
            </div>

            {/* Error Feedback */}
            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] p-3 text-xs font-semibold text-[#DC2626]">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* 4. Form */}
            <form onSubmit={handleSubmit} className="space-y-3 max-w-sm w-full">
              {/* Customer Email */}
              <div>
                <label
                  htmlFor="customer-email"
                  className="block text-[10px] font-bold uppercase tracking-wider text-[#374151] mb-1.5"
                >
                  Customer Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 h-4 w-4 text-[#9CA3AF] pointer-events-none" />
                  <input
                    id="customer-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-11 rounded-full border border-[#E2E2E7] bg-white pl-10 pr-4 text-sm font-medium text-[#0B051D] placeholder:text-[#9CA3AF] focus:border-[#0B051D] focus:outline-none focus:ring-1 focus:ring-[#0B051D] transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="customer-password"
                  className="block text-[10px] font-bold uppercase tracking-wider text-[#374151] mb-1.5"
                >
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 h-4 w-4 text-[#9CA3AF] pointer-events-none" />
                  <input
                    id="customer-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-11 rounded-full border border-[#E2E2E7] bg-white pl-10 pr-10 text-sm font-medium text-[#0B051D] placeholder:text-[#9CA3AF] focus:border-[#0B051D] focus:outline-none focus:ring-1 focus:ring-[#0B051D] transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 text-[#9CA3AF] hover:text-[#0B051D] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Restrained Blush Pink CTA */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-full bg-[#FAD2DE] hover:bg-[#F8BDCE] text-[#0B051D] font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#0B051D]" aria-hidden="true" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in as customer</span>
                      <ArrowRight className="h-4 w-4 text-[#0B051D]" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* 5. Supporting Feature Card */}
            <div className="max-w-sm w-full rounded-2xl border border-[#E2E2E7] bg-white p-3 flex items-center justify-between shadow-xs hover:border-[#CBD5E1] transition-all">
              <div className="flex items-center gap-3">
                <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-[#FDF2F4] text-[#9B3856]">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-[#0B051D]">
                    Smart Basket - Instant Sync
                  </span>
                  <span className="block text-[11px] text-[#504F5F]">
                    Live neighborhood shelf stock and lightning doorstep delivery.
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#9CA3AF] shrink-0" />
            </div>

            {/* 6. Secondary Navigation Links */}
            <div className="space-y-1 text-xs text-[#504F5F]">
              <div>
                <span>New to KiranaWala? </span>
                <Link
                  href="/customer/register"
                  className="font-bold text-[#0B051D] underline underline-offset-4 hover:opacity-75 transition-opacity"
                >
                  Create an account →
                </Link>
              </div>
              <div>
                <span>Are you a grocery merchant? </span>
                <Link
                  href="/store-owner/login"
                  className="font-bold text-[#0B051D] underline underline-offset-4 hover:opacity-75 transition-opacity"
                >
                  Shop owner login →
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Hero Visual Floating Naturally on White Canvas (approx 58% width) */}
          <div className="lg:col-span-7 flex items-center justify-center lg:justify-end relative">
            <div className="relative w-full max-w-[460px] lg:max-w-[500px] flex items-center justify-center">
              <Image
                src="/images/auth/hero-floating-transparent.png"
                alt="KiranaWala Customer Mobile Experience"
                width={896}
                height={1200}
                priority
                unoptimized
                className="w-full h-auto max-h-[500px] sm:max-h-[540px] lg:max-h-[580px] object-contain drop-shadow-sm select-none pointer-events-none"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
