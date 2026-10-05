"use client";

import { useRef } from "react";
import {
  Sparkles,
  Leaf,
  Apple,
  Carrot,
  Milk,
  Wheat,
  Layers,
  Flame,
  Cookie,
  Coffee,
  Sun,
  Home,
  HeartPulse,
  Baby,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface CategoryItem {
  id: string;
  name: string;
  icon: any;
}

export const KIRANAWALA_CATEGORIES: CategoryItem[] = [
  { id: "all", name: "All", icon: Sparkles },
  { id: "produce", name: "Fresh Produce", icon: Leaf },
  { id: "fruits", name: "Fruits", icon: Apple },
  { id: "vegetables", name: "Vegetables", icon: Carrot },
  { id: "dairy", name: "Dairy & Eggs", icon: Milk },
  { id: "atta", name: "Atta & Grains", icon: Wheat },
  { id: "pulses", name: "Pulses & Lentils", icon: Layers },
  { id: "spices", name: "Spices", icon: Flame },
  { id: "snacks", name: "Snacks", icon: Cookie },
  { id: "beverages", name: "Beverages", icon: Coffee },
  { id: "breakfast", name: "Breakfast", icon: Sun },
  { id: "household", name: "Household", icon: Home },
  { id: "personal", name: "Personal Care", icon: HeartPulse },
  { id: "baby", name: "Baby Care", icon: Baby },
  { id: "staples", name: "Staples", icon: Package },
];

interface CategoryStripProps {
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  categoryCounts?: Record<string, number>;
}

export function CategoryStrip({
  activeCategory,
  onSelectCategory,
}: CategoryStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div className="relative w-full border-t border-b border-[#E8E2D9] bg-white sticky top-0 z-30 shadow-2xs">
      <div className="kw-container relative flex items-center">
        {/* Left Scroll Trigger */}
        <button
          type="button"
          onClick={() => scroll("left")}
          aria-label="Scroll categories left"
          className="hidden sm:flex absolute left-0 z-10 h-8 w-8 -translate-x-3 items-center justify-center rounded-full border border-[#E8E2D9] bg-white text-[#0B051D] shadow-xs transition-opacity hover:bg-[#FAF8F5] cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Categories Horizontal Scroller matching refined editorial layout */}
        <div
          ref={scrollRef}
          className="flex w-full items-center gap-7 sm:gap-9 overflow-x-auto py-3 no-scrollbar scroll-smooth px-1"
        >
          {KIRANAWALA_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.icon;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className="group flex flex-col items-center gap-1.5 shrink-0 transition-all duration-200 cursor-pointer focus:outline-none"
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center transition-transform duration-200 group-hover:scale-115 ${
                    isActive ? "text-[#0B051D]" : "text-[#64748B] group-hover:text-[#0B051D]"
                  }`}
                >
                  <Icon className="h-5 w-5 stroke-[1.6]" />
                </div>
                <span
                  className={`text-[12px] font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "text-[#0B051D] font-bold underline underline-offset-6 decoration-2 decoration-[#0B051D]"
                      : "text-[#64748B] group-hover:text-[#0B051D]"
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Scroll Trigger */}
        <button
          type="button"
          onClick={() => scroll("right")}
          aria-label="Scroll categories right"
          className="hidden sm:flex absolute right-0 z-10 h-8 w-8 translate-x-3 items-center justify-center rounded-full border border-[#E8E2D9] bg-white text-[#0B051D] shadow-xs transition-opacity hover:bg-[#FAF8F5] cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
