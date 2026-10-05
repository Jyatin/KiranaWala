import React from "react";

export interface PriceTagProps {
  price: number;
  originalPrice?: number | null;
  size?: "sm" | "md" | "lg" | "xl";
  showDiscountBadge?: boolean;
  className?: string;
}

export function PriceTag({
  price,
  originalPrice,
  size = "md",
  showDiscountBadge = false,
  className = "",
}: PriceTagProps) {
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const sizeStyles = {
    sm: {
      price: "text-sm sm:text-base font-bold",
      original: "text-[11px]",
      badge: "text-[10px] px-1.5 py-0.5",
    },
    md: {
      price: "text-lg sm:text-xl font-black",
      original: "text-xs",
      badge: "text-[11px] px-2 py-0.5",
    },
    lg: {
      price: "text-2xl sm:text-3xl font-black",
      original: "text-sm",
      badge: "text-xs px-2.5 py-1",
    },
    xl: {
      price: "text-3xl sm:text-4xl font-black",
      original: "text-base",
      badge: "text-xs px-3 py-1",
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className={`font-display text-[#0B051D] tabular-nums tracking-tight ${currentSize.price}`}>
        ₹{price}
      </span>

      {hasDiscount && (
        <span className={`text-[#96959F] line-through tabular-nums font-normal ${currentSize.original}`}>
          ₹{originalPrice}
        </span>
      )}

      {showDiscountBadge && hasDiscount && discountPercent > 0 && (
        <span
          className={`rounded-full bg-[#FFA8CD] font-bold text-[#0B051D] tabular-nums shrink-0 ${currentSize.badge}`}
        >
          -{discountPercent}%
        </span>
      )}
    </div>
  );
}
