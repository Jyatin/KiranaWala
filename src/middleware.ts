import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("kw_token")?.value;
  const role = request.cookies.get("kw_role")?.value;

  const isCustomerRole = role === "customer";
  const isMerchantRole = role === "store-owner" || role === "merchant";
  const isAuthenticated = Boolean(token && role);

  // 1. Unified /login redirect
  if (pathname === "/login") {
    if (isAuthenticated) {
      if (isCustomerRole) {
        return NextResponse.redirect(new URL("/shop", request.url));
      }
      if (isMerchantRole) {
        return NextResponse.redirect(new URL("/merchant/dashboard", request.url));
      }
    }
    return NextResponse.redirect(new URL("/customer/login", request.url));
  }

  // 2. Login & Register pages when already authenticated
  if (pathname === "/customer/login" || pathname === "/customer/register") {
    if (isAuthenticated) {
      if (isCustomerRole) {
        return NextResponse.redirect(new URL("/shop", request.url));
      }
      if (isMerchantRole) {
        return NextResponse.redirect(new URL("/merchant/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  if (
    pathname === "/store-owner/login" ||
    pathname === "/store-owner/register" ||
    pathname === "/merchant/login" ||
    pathname === "/merchant/register"
  ) {
    if (isAuthenticated) {
      if (isMerchantRole) {
        return NextResponse.redirect(new URL("/merchant/dashboard", request.url));
      }
      if (isCustomerRole) {
        return NextResponse.redirect(new URL("/shop", request.url));
      }
    }
    return NextResponse.next();
  }

  // 3. Merchant-only routes: /merchant/*, /store-owner/dashboard
  const isMerchantPath =
    pathname.startsWith("/merchant") ||
    pathname.startsWith("/store-owner/dashboard");

  if (isMerchantPath) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/store-owner/login", request.url));
    }
    if (isCustomerRole) {
      return NextResponse.redirect(new URL("/shop", request.url));
    }
    return NextResponse.next();
  }

  // 4. Customer-only protected routes
  const isCustomerPath =
    pathname === "/shop" ||
    pathname.startsWith("/customer/dashboard") ||
    pathname.startsWith("/customer/orders") ||
    pathname.startsWith("/customer/products") ||
    pathname === "/cart" ||
    pathname === "/orders" ||
    pathname === "/profile";

  if (isCustomerPath) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/customer/login", request.url));
    }
    if (isMerchantRole) {
      return NextResponse.redirect(new URL("/merchant/dashboard", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/shop",
    "/cart",
    "/orders",
    "/profile",
    "/customer/:path*",
    "/merchant/:path*",
    "/store-owner/:path*",
  ],
};
