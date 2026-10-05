"use client";

import { useEffect } from "react";
import { X, Store as StoreIcon, MapPin, Check, Clock, Star } from "lucide-react";
import { Store } from "./types";

interface StoreSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: Store[];
  selectedStore: Store | null;
  onSelectStore: (store: Store) => void;
}

export function StoreSelectorModal({
  isOpen,
  onClose,
  stores,
  selectedStore,
  onSelectStore,
}: StoreSelectorModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-[28px] border border-[#E8E2D9] bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-4">
          <div>
            <h3 className="font-display text-xl sm:text-2xl font-black text-[#0B051D]">
              Select Neighborhood Kirana
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Choose your primary store for fastest 15–20 min doorstep delivery
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8E2D9] text-[#0B051D] hover:bg-[#F8F7FA]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Store List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {stores.map((store, index) => {
            const isSelected = selectedStore?._id === store._id;
            const distance = (0.4 + index * 0.3).toFixed(1);
            const eta = 15 + index * 3;

            return (
              <div
                key={store._id}
                onClick={() => {
                  onSelectStore(store);
                  onClose();
                }}
                className={`flex items-start justify-between p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-[#0B051D] bg-[#FAF8F5] shadow-xs"
                    : "border-[#E8E2D9] bg-white hover:border-[#CBD5E1] hover:bg-[#F8F7FA]"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-bold text-[#0B051D]">
                      {store.name}
                    </span>
                    <span className="rounded-full bg-[#059669]/10 text-[#059669] px-2 py-0.2 text-[10px] font-bold">
                      Verified
                    </span>
                  </div>

                  <p className="text-xs text-[#504F5F] line-clamp-1 max-w-sm">
                    {store.description}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-[#64748B] pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-[#059669]" />
                      {distance} km away
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-[#D9531E]" />
                      {eta} min delivery
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-[#059669] text-[#059669]" />
                      4.8
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      isSelected
                        ? "border-[#0B051D] bg-[#0B051D] text-white"
                        : "border-[#CBD5E1] bg-white"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
