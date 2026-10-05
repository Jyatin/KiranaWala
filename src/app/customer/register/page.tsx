"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Registration failed. Please check details.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/customer/login");
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration error. Please check your details and try again.");
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
                <span>Customer Registration</span>
              </div>
            </div>

            {/* 2. Large Editorial Heading & 3. Restrained Supporting Copy */}
            <div className="space-y-2">
              <h1 className="font-editorial text-[40px] sm:text-[46px] lg:text-[52px] font-normal tracking-[-0.025em] text-[#0B051D] leading-[1.04]">
                Join your <br />
                neighborhood.
              </h1>

              <p className="text-sm text-[#504F5F] font-normal leading-relaxed max-w-sm">
                Shop local groceries, build smarter AI baskets, and enjoy 15-minute delivery with zero shelf-price markups.
              </p>
            </div>

            {/* Error Feedback */}
            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] p-3 text-xs font-semibold text-[#DC2626]">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Feedback */}
            {success && (
              <div className="flex items-center gap-2 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] p-3 text-xs font-semibold text-[#046234]">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Account created! Redirecting to sign in...</span>
              </div>
            )}

            {/* 4. Form */}
            <form onSubmit={handleSubmit} className="space-y-3 max-w-sm w-full">
              {/* Username / Name */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5"
                >
                  Full name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                    <User className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="name"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Aarav Sharma"
                    className="w-full h-11 pl-10 pr-4 rounded-full border border-[#E2E2E7] bg-white text-sm text-[#0B051D] placeholder:text-[#9CA3AF] focus:border-[#0B051D] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Customer Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aarav@example.com"
                    className="w-full h-11 pl-10 pr-4 rounded-full border border-[#E2E2E7] bg-white text-sm text-[#0B051D] placeholder:text-[#9CA3AF] focus:border-[#0B051D] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    className="w-full h-11 pl-10 pr-11 rounded-full border border-[#E2E2E7] bg-white text-sm text-[#0B051D] placeholder:text-[#9CA3AF] focus:border-[#0B051D] focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#9CA3AF] hover:text-[#0B051D] transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-full bg-[#FAD2DE] hover:bg-[#F8BDCE] text-[#0B051D] font-bold text-sm tracking-tight transition-all duration-150 active:scale-[0.98] shadow-xs cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#0B051D]" aria-hidden="true" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create customer account</span>
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
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-[#0B051D]">
                    Zero Shelf-Price Markup Guarantee
                  </span>
                  <span className="block text-[11px] text-[#504F5F]">
                    Pay exact in-store grocery prices with no hidden surcharges.
                  </span>
                </div>
              </div>
            </div>

            {/* 6. Secondary Navigation Links */}
            <div className="space-y-1 text-xs text-[#504F5F]">
              <div>
                <span>Already have an account? </span>
                <Link
                  href="/customer/login"
                  className="font-bold text-[#0B051D] underline underline-offset-4 hover:opacity-75 transition-opacity"
                >
                  Sign in here →
                </Link>
              </div>
              <div>
                <span>Are you a grocery merchant? </span>
                <Link
                  href="/store-owner/register"
                  className="font-bold text-[#0B051D] underline underline-offset-4 hover:opacity-75 transition-opacity"
                >
                  Register your shop →
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
