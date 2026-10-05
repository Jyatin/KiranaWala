"use client";

import React from "react";
import { Plus, Minus, Trash2 } from "lucide-react";

export interface QuantityStepperProps {
  quantity: number;
  onIncrement: (e: React.MouseEvent) => void;
  onDecrement: (e: React.MouseEvent) => void;
  max?: number;
  size?: "sm" | "md";
  showTrashOnOne?: boolean;
  className?: string;
}

export function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  max,
  size = "md",
  showTrashOnOne = false,
  className = "",
}: QuantityStepperProps) {
  const isAtMax = max !== undefined && quantity >= max;

  const sizeClasses = {
    sm: "h-8 px-1.5 text-xs gap-1.5",
    md: "h-9 px-2 text-sm gap-2",
  };

  const btnSizes = {
    sm: "h-6 w-6",
    md: "h-7 w-7",
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center justify-between rounded-full bg-[#0B051D] text-white shadow-xs font-bold select-none ${sizeClasses[size]} ${className}`}
      role="group"
      aria-label="Quantity controls"
    >
      <button
        type="button"
        onClick={onDecrement}
        aria-label={quantity === 1 && showTrashOnOne ? "Remove item" : "Decrease quantity"}
        className={`flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 active:scale-90 transition-all cursor-pointer ${btnSizes[size]}`}
      >
        {quantity === 1 && showTrashOnOne ? (
          <Trash2 className="h-3 w-3 text-red-300" />
        ) : (
          <Minus className="h-3 w-3 text-white" />
        )}
      </button>

      <span className="min-w-[1.25rem] text-center font-display tabular-nums px-1 text-white">
        {quantity}
      </span>

      <button
        type="button"
        disabled={isAtMax}
        onClick={onIncrement}
        aria-label="Increase quantity"
        className={`flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer ${btnSizes[size]}`}
      >
        <Plus className="h-3 w-3 text-white" />
      </button>
    </div>
  );
}
