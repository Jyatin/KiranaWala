import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "discount" | "success" | "neutral" | "highlight" | "warning";
  size?: "sm" | "md";
}

export function Badge({
  children,
  variant = "neutral",
  size = "sm",
  className = "",
  ...props
}: BadgeProps) {
  const base = "inline-flex items-center font-bold tracking-tight rounded-full whitespace-nowrap";

  const variants = {
    discount: "bg-[#FFA8CD] text-[#0B051D]",
    success: "bg-[#C1F4D1] text-[#046234]",
    neutral: "bg-[#F3F3F5] text-[#504F5F] border border-[#E2E2E7]",
    highlight: "bg-[#0B051D] text-white",
    warning: "bg-amber-100 text-amber-900 border border-amber-200",
  };

  const sizes = {
    sm: "px-2.5 py-0.5 text-[11px]",
    md: "px-3 py-1 text-xs",
  };

  return (
    <span className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </span>
  );
}
