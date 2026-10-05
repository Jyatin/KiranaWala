"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Store,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Navigation,
} from "lucide-react";

export default function StoreOwnerRegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [storeCategory, setStoreCategory] = useState("Kirana & Grocery");
  const [latitude, setLatitude] = useState("12.9716");
  const [longitude, setLongitude] = useState("77.5946");
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGetLocation = () => {
    if ("geolocation" in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(4));
          setLongitude(pos.coords.longitude.toFixed(4));
          setLocating(false);
        },
        () => {
          setLocating(false);
        },
        { timeout: 8000 }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/store/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          storeName,
          storeDescription: storeDescription || `${storeName} — Verified Neighborhood Grocer`,
          storeCategory,
          latitude: parseFloat(latitude) || 12.9716,
          longitude: parseFloat(longitude) || 77.5946,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Store registration failed. Please review details.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/store-owner/login");
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration error. Please check your shop details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-96px)] bg-white text-[#0B051D] selection:bg-[#FAD2DE] selection:text-[#0B051D] flex flex-col justify-center py-8">
      <section className="kw-container w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Form & Hierarchy */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-4 sm:space-y-5">
            {/* 1. Small Portal Label */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#F5F4F0] px-3 py-1 text-[11px] font-bold tracking-wider uppercase text-[#4B5563]">
                <Store className="h-3.5 w-3.5 text-[#9B3856]" />
                <span>Merchant Onboarding</span>
              </div>
            </div>

            {/* 2. Large Editorial Heading */}
            <div className="space-y-2">
              <h1 className="font-editorial text-[38px] sm:text-[46px] lg:text-[52px] font-normal tracking-[-0.025em] text-[#0B051D] leading-[1.04]">
                Register your <br />
                neighborhood shop.
              </h1>

              <p className="text-sm text-[#504F5F] font-normal leading-relaxed max-w-md">
                Digitize your stock, reach families on your street, and manage neighborhood deliveries with zero platform commissions.
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
                <span>Store registered successfully! Redirecting to merchant login...</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 max-w-lg w-full">
              {/* Row 1: Merchant Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="username"
                    className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1"
                  >
                    Owner Name
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
                      placeholder="Ramesh Gupta"
                      className="w-full h-11 pl-10 pr-3 rounded-full border border-[#E2E2E7] bg-white text-sm text-[#0B051D] placeholder:text-[#9CA3AF] focus:border-[#0B051D] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1"
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
                      placeholder="ramesh@guptastores.com"
                      className="w-full h-11 pl-10 pr-3 rounded-full border border-[#E2E2E7] bg-white text-sm text-[#0B051D] placeholder:text-[#9CA3AF] focus:border-[#0B051D] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Store Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="storeName"
                    className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1"
                  >
                    Store Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                      <Store className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <input
                      id="storeName"
                      name="storeName"
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Gupta Kirana & General Store"
                      className="w-full h-11 pl-10 pr-3 rounded-full border border-[#E2E2E7] bg-white text-sm text-[#0B051D] placeholder:text-[#9CA3AF] focus:border-[#0B051D] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="storeCategory"
                    className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1"
                  >
                    Primary Category
                  </label>
                  <select
                    id="storeCategory"
                    name="storeCategory"
                    value={storeCategory}
                    onChange={(e) => setStoreCategory(e.target.value)}
                    className="w-full h-11 px-4 rounded-full border border-[#E2E2E7] bg-white text-sm text-[#0B051D] focus:border-[#0B051D] focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="Kirana & Grocery">Kirana & Grocery</option>
                    <option value="Fresh Produce & Fruits">Fresh Produce & Fruits</option>
                    <option value="Dairy & Bakery">Dairy & Bakery</option>
                    <option value="Organic & Gourmet">Organic & Gourmet</option>
                    <option value="Daily Provisions">Daily Provisions</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1"
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
                    placeholder="Create a merchant password"
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

              {/* Store Location Coordinates & Quick Detect */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                    Store GPS Coordinates
                  </label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={locating}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0B051D] hover:underline cursor-pointer"
                  >
                    <Navigation className={`h-3 w-3 ${locating ? "animate-spin" : ""}`} />
                    <span>{locating ? "Detecting..." : "Auto-detect location"}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                      <MapPin className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="Latitude (e.g. 12.9716)"
                      className="w-full h-10 pl-9 pr-3 rounded-full border border-[#E2E2E7] bg-white text-xs text-[#0B051D] focus:border-[#0B051D] focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                      <MapPin className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="Longitude (e.g. 77.5946)"
                      className="w-full h-10 pl-9 pr-3 rounded-full border border-[#E2E2E7] bg-white text-xs text-[#0B051D] focus:border-[#0B051D] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-full bg-[#0B051D] hover:bg-[#2C2242] text-white font-bold text-sm tracking-tight transition-all duration-150 active:scale-[0.98] shadow-xs cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
                      <span>Registering your shop...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete store registration</span>
                      <ArrowRight className="h-4 w-4 text-[#FFA8CD]" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Supporting Feature Card */}
            <div className="max-w-lg w-full rounded-2xl border border-[#E2E2E7] bg-white p-3 flex items-center justify-between shadow-xs hover:border-[#CBD5E1] transition-all">
              <div className="flex items-center gap-3">
                <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-[#F5F4F0] text-[#0B051D]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-[#0B051D]">
                    100% Neighborhood Ownership
                  </span>
                  <span className="block text-[11px] text-[#504F5F]">
                    Retain your direct customer relationships with same-day settlement and zero markup fees.
                  </span>
                </div>
              </div>
            </div>

            {/* Secondary Navigation Links */}
            <div className="space-y-1 text-xs text-[#504F5F]">
              <div>
                <span>Already registered your store? </span>
                <Link
                  href="/store-owner/login"
                  className="font-bold text-[#0B051D] underline underline-offset-4 hover:opacity-75 transition-opacity"
                >
                  Merchant sign in →
                </Link>
              </div>
              <div>
                <span>Looking to order groceries? </span>
                <Link
                  href="/customer/login"
                  className="font-bold text-[#0B051D] underline underline-offset-4 hover:opacity-75 transition-opacity"
                >
                  Customer login →
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Visual */}
          <div className="lg:col-span-6 flex items-center justify-center lg:justify-end relative">
            <div className="relative w-full max-w-[460px] lg:max-w-[480px] flex items-center justify-center">
              <Image
                src="/images/auth-merchant-scene.jpg"
                alt="KiranaWala Merchant Experience"
                width={800}
                height={800}
                priority
                unoptimized
                className="w-full h-auto rounded-[28px] sm:rounded-[36px] shadow-xl border border-[#E8E2D9] object-cover select-none"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
