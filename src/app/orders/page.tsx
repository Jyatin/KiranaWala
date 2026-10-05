"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import CustomerOrdersPage from "@/app/customer/orders/page";

export default function OrdersPage() {
  return (
    <AuthGuard requiredRole="customer">
      <CustomerOrdersPage />
    </AuthGuard>
  );
}
