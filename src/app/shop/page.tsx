"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import CustomerProductsPage from "@/app/customer/products/page";

export default function ShopPage() {
  return (
    <AuthGuard requiredRole="customer">
      <CustomerProductsPage />
    </AuthGuard>
  );
}
