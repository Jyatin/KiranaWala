"use strict";
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Truck, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";

export default function DeliveryPartnerLoginPage() {
  const [email, setEmail] = useState("runner_rahul@kiranawala.demo");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", "delivery-partner");
      window.location.href = "/delivery/dashboard";
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF8F5] pt-12 pb-24 text-[#0B051D] flex flex-col justify-center">
      <div className="kw-container max-w-md w-full mx-auto space-y-6">
        
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#504F5F] hover:text-[#0B051D] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Home</span>
        </Link>

        <div className="rounded-3xl bg-white border border-[#E8E2D9] p-8 shadow-xs space-y-6">
          <div className="space-y-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B051D] text-white mx-auto shadow-md">
              <Truck className="h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl font-black text-[#0B051D]">
              Delivery Partner Portal
            </h1>
            <p className="text-xs text-[#504F5F]">
              Hyperlocal order dispatch, pickup navigation, and doorstep fulfillment.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl bg-[#FFF1F2] border border-[#F43F5E]/30 p-3 text-xs text-[#E11D48] font-semibold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B051D]">Partner Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-[#8C8794]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-[#E8E2D9] pl-10 pr-4 py-3 text-xs text-[#0B051D] focus:border-[#0B051D] focus:outline-hidden"
                  placeholder="runner@kiranawala.demo"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B051D]">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-[#8C8794]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-[#E8E2D9] pl-10 pr-4 py-3 text-xs text-[#0B051D] focus:border-[#0B051D] focus:outline-hidden"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#0B051D] hover:bg-black text-white text-xs font-bold py-3.5 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
            >
              <span>{loading ? "Authenticating..." : "Enter Dispatch Portal"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Help */}
          <div className="rounded-2xl bg-[#FAF8F5] border border-[#E8E2D9] p-3 text-[11px] text-[#504F5F] space-y-1">
            <div className="font-bold text-[#0B051D]">Demo Partner Accounts:</div>
            <div>• <span className="font-mono text-[#0B051D]">runner_rahul@kiranawala.demo</span> / <span className="font-mono text-[#0B051D]">Password123!</span></div>
            <div>• <span className="font-mono text-[#0B051D]">runner_vikram@kiranawala.demo</span> / <span className="font-mono text-[#0B051D]">Password123!</span></div>
          </div>
        </div>

      </div>
    </main>
  );
}
