"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import CustomerProductsPage from "@/app/customer/products/page";

export default function CartPage() {
  return (
    <AuthGuard requiredRole="customer">
      <CustomerProductsPage />
    </AuthGuard>
  );
}
