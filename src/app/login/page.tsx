"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredAuth, isCustomer, isMerchant } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const { token, role } = getStoredAuth();

    if (token && isCustomer(role)) {
      router.replace("/shop");
      return;
    }

    if (token && isMerchant(role)) {
      router.replace("/merchant/dashboard");
      return;
    }

    router.replace("/customer/login");
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] text-[#0B051D]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#E2E2E7] border-t-[#0B051D]" />
        <p className="text-sm font-semibold text-[#504F5F]">Redirecting to portal...</p>
      </div>
    </div>
  );
}
