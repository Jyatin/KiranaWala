"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import CustomerDashboardPage from "@/app/customer/dashboard/page";

export default function ProfilePage() {
  return (
    <AuthGuard requiredRole="customer">
      <CustomerDashboardPage />
    </AuthGuard>
  );
}
