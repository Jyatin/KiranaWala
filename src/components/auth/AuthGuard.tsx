"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getStoredAuth, isCustomer, isMerchant } from "@/lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole: "customer" | "merchant";
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const { token, role } = getStoredAuth();

    // 1. Unauthenticated user
    if (!token || !role) {
      setIsAuthorized(false);
      const target = requiredRole === "merchant" ? "/store-owner/login" : "/customer/login";
      router.replace(target);
      return;
    }

    // 2. Customer requirement: buyers only
    if (requiredRole === "customer") {
      if (isMerchant(role)) {
        // Merchant entered buyer URL -> redirect to merchant dashboard, do NOT render buyer shopping data
        setIsAuthorized(false);
        router.replace("/merchant/dashboard");
        return;
      }

      if (!isCustomer(role)) {
        setIsAuthorized(false);
        router.replace("/customer/login");
        return;
      }
    }

    // 3. Merchant requirement: store-owners only
    if (requiredRole === "merchant") {
      if (isCustomer(role)) {
        // Buyer entered merchant URL -> redirect to /shop, do NOT render merchant data
        setIsAuthorized(false);
        router.replace("/shop");
        return;
      }

      if (!isMerchant(role)) {
        setIsAuthorized(false);
        router.replace("/store-owner/login");
        return;
      }
    }

    setIsAuthorized(true);
  }, [pathname, requiredRole, router]);

  // Loading state prevents flashing unauthorized UI before redirect
  if (isAuthorized !== true) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] text-[#0B051D]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#E2E2E7] border-t-[#0B051D]" />
          <p className="text-sm font-semibold text-[#504F5F] tracking-wide">
            Verifying secure session...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
