/**
 * KiranaWala — Unified Authentication & Role Helpers
 *
 * Implements strict role-based separation between Customers (Buyers) and
 * Store Owners / Merchants.
 */

export type UserRole = "customer" | "store-owner" | "admin" | "delivery-partner";

export function isCustomer(role: string | null | undefined): boolean {
  return role === "customer";
}

export function isMerchant(role: string | null | undefined): boolean {
  return role === "store-owner" || role === "merchant";
}

export interface StoredAuth {
  token: string | null;
  role: string | null;
  storeId: string | null;
  username: string | null;
  email: string | null;
}

export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    if (!parsed.exp) return false;
    // Buffer with 15 seconds to prevent race conditions on requests in flight
    return Date.now() >= (parsed.exp * 1000) - 15000;
  } catch {
    return true;
  }
}

export function getStoredAuth(): StoredAuth {
  if (typeof window === "undefined") {
    return { token: null, role: null, storeId: null, username: null, email: null };
  }

  const token = localStorage.getItem("token");
  if (token && isTokenExpired(token)) {
    clearStoredAuth();
    return { token: null, role: null, storeId: null, username: null, email: null };
  }

  const role = localStorage.getItem("role");
  const storeId = localStorage.getItem("storeId");
  const username = localStorage.getItem("username");
  const email = localStorage.getItem("userEmail");

  return { token, role, storeId, username, email };
}

export function setStoredAuth(params: {
  token: string;
  role: string;
  storeId?: string | null;
  username?: string | null;
  email?: string | null;
}): void {
  if (typeof window === "undefined") return;

  const { token, role, storeId, username, email } = params;

  localStorage.setItem("token", token);
  localStorage.setItem("role", role);

  if (storeId) {
    localStorage.setItem("storeId", storeId);
  } else {
    localStorage.removeItem("storeId");
  }

  if (username) {
    localStorage.setItem("username", username);
  }
  if (email) {
    localStorage.setItem("userEmail", email);
  }

  // Set cookies for Next.js edge middleware (aligned to 24h token lifetime)
  const maxAge = 86400; // 24 hours
  document.cookie = `kw_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `kw_role=${encodeURIComponent(role)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("storeId");
  localStorage.removeItem("username");
  localStorage.removeItem("userEmail");

  // Clear cookies
  document.cookie = "kw_token=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "kw_role=; path=/; max-age=0; SameSite=Lax";
}
