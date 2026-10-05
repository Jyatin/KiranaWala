import React from "react";

export function ProductCardSkeleton() {
  return (
    <div className="relative flex flex-col justify-between rounded-[22px] border border-[#E8E2D9] bg-white p-3.5 sm:p-4 animate-pulse">
      {/* 1:1 Aspect Image Box */}
      <div className="relative aspect-square w-full rounded-[16px] bg-[#F3F3F5] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
      </div>

      {/* Meta lines */}
      <div className="mt-3.5 flex flex-col flex-1 justify-between space-y-3">
        <div className="space-y-2">
          {/* Brand line */}
          <div className="flex items-center justify-between">
            <div className="h-3 w-16 bg-[#EAEAEE] rounded-full" />
            <div className="h-3 w-10 bg-[#EAEAEE] rounded-full" />
          </div>

          {/* Product Title */}
          <div className="space-y-1 pt-1">
            <div className="h-4 w-4/5 bg-[#E2E2E7] rounded-md" />
            <div className="h-4 w-2/3 bg-[#E2E2E7] rounded-md" />
          </div>

          {/* Store name line */}
          <div className="h-3 w-28 bg-[#F0EFF4] rounded-full mt-1" />
        </div>

        {/* Pricing & Button Skeleton */}
        <div className="flex items-center justify-between pt-2">
          <div className="h-6 w-14 bg-[#E2E2E7] rounded-md" />
          <div className="h-9 w-18 bg-[#F3F3F5] rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={`skeleton-${i}`} />
      ))}
    </div>
  );
}
