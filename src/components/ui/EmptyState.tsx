import React from "react";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = <ShoppingBag className="h-10 w-10 text-[#96959F]" />,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-[28px] border border-[#E8E2D9] bg-[#FAF8F5] space-y-4 max-w-lg mx-auto ${className}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white border border-[#E2E2E7] shadow-xs">
        {icon}
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="font-display text-xl font-bold text-[#0B051D]">{title}</h3>
        <p className="text-xs sm:text-sm text-[#504F5F] leading-relaxed">{description}</p>
      </div>

      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="dark" size="sm" onClick={onAction} icon={<ArrowRight className="h-3.5 w-3.5" />} iconPosition="right">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
