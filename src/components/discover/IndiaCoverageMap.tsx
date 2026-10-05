"use client";

import { useState } from "react";
import Link from "next/link";
import { Store, ArrowRight, ShieldCheck, Zap } from "lucide-react";

interface MetroHub {
  id: string;
  name: string;
  stateDesc: string;
  stores: string;
  deliveryTime: string;
  demandProfile: string;
  cx: number;
  cy: number;
  labelX?: number;
  labelY?: number;
  labelAnchor?: "start" | "end" | "middle";
}

const METRO_HUBS: MetroHub[] = [
  {
    id: "bengaluru",
    name: "Bengaluru",
    stateDesc: "Active across central and suburban residential neighborhoods in Karnataka.",
    stores: "4,200+ Stores",
    deliveryTime: "15 min avg",
    demandProfile:
      "Highest moving staples: Fresh Dairy, Sona Masoori, Spices. Fulfillments handled directly from verified neighborhood stores within 1 km radius.",
    cx: 260,
    cy: 450,
    labelX: 278,
    labelY: 455,
    labelAnchor: "start",
  },
  {
    id: "mumbai",
    name: "Mumbai",
    stateDesc: "Active across South Mumbai, Western Suburbs, and Navi Mumbai neighborhoods.",
    stores: "3,100+ Stores",
    deliveryTime: "18 min avg",
    demandProfile:
      "Highest moving staples: Kolam Rice, Poha, Filter Coffee, Pav. Instant hyper-local fulfillments via neighborhood baniya stores.",
    cx: 185,
    cy: 335,
    labelX: 172,
    labelY: 338,
    labelAnchor: "end",
  },
  {
    id: "delhi",
    name: "Delhi NCR",
    stateDesc: "Covering South Delhi, Gurugram, and Noida residential corridors.",
    stores: "2,800+ Stores",
    deliveryTime: "19 min avg",
    demandProfile:
      "Highest moving staples: Sharbati Atta, Mustard Oil, Rajma, Dairy. Fast neighborhood deliveries direct from corner provision shops.",
    cx: 245,
    cy: 165,
    labelX: 258,
    labelY: 170,
    labelAnchor: "start",
  },
  {
    id: "hyderabad",
    name: "Hyderabad",
    stateDesc: "Serving Gachibowli, Jubilee Hills, and Secunderabad residential neighborhoods.",
    stores: "1,600+ Stores",
    deliveryTime: "16 min avg",
    demandProfile:
      "Highest moving staples: Basmati Rice, Guntur Chillies, Pure Ghee, Toor Dal. Dispatched from community kiranas in under 20 minutes.",
    cx: 290,
    cy: 360,
    labelX: 304,
    labelY: 365,
    labelAnchor: "start",
  },
  {
    id: "pune",
    name: "Pune",
    stateDesc: "Covering Kothrud, Baner, and Viman Nagar neighborhood societies.",
    stores: "1,200+ Stores",
    deliveryTime: "15 min avg",
    demandProfile:
      "Highest moving staples: Jowar Flour, Fresh Produce, Organic Jaggery, Lentils. Handled by trusted local family stores.",
    cx: 202,
    cy: 368,
    labelX: 216,
    labelY: 373,
    labelAnchor: "start",
  },
];

export function IndiaCoverageMap() {
  const [selectedHub, setSelectedHub] = useState<MetroHub>(METRO_HUBS[0]);

  return (
    <div className="rounded-[32px] sm:rounded-[40px] bg-[#140F22] text-white p-6 sm:p-10 lg:p-12 border border-[#2B2344] shadow-2xl relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#FFA8CD]/10 blur-[110px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#7C3AED]/10 blur-[110px] pointer-events-none" />

      {/* Top Header Bar: City Selector Pills & Live Badge */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          {METRO_HUBS.map((hub) => {
            const isSelected = selectedHub.id === hub.id;
            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => setSelectedHub(hub)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-[#FAD2DE] text-[#0B051D] shadow-md scale-103"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                {hub.name}
              </button>
            );
          })}
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 text-xs text-emerald-400 font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Network Active</span>
        </div>
      </div>

      {/* Main Map & Hub Data View (Matching Exact Screenshot 3 Reference) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center py-6 sm:py-8">
        
        {/* Left Side: India Vector Map with Metro Nodes & Corridors */}
        <div className="lg:col-span-5 flex justify-center items-center">
          <div className="relative w-full max-w-[420px] aspect-[4/5] flex items-center justify-center">
            <svg
              viewBox="0 0 460 560"
              className="w-full h-full drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Refined India Silhouette matching Screenshot 3 reference */}
              <path
                d="M 235 70 
                   C 265 85, 275 110, 290 120 
                   C 320 135, 340 140, 365 170 
                   C 395 200, 420 220, 395 260 
                   C 370 290, 345 285, 325 315 
                   C 310 345, 320 380, 305 425 
                   C 290 470, 275 510, 255 535 
                   C 245 545, 235 530, 225 500 
                   C 210 450, 190 410, 165 370 
                   C 140 330, 115 310, 120 265 
                   C 125 220, 155 195, 185 180 
                   C 210 165, 220 120, 235 70 
                   Z"
                fill="#1D1630"
                stroke="#3D3358"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />

              {/* Delivery Corridors (Dashed interconnecting routes) */}
              <line
                x1="245"
                y1="165"
                x2="185"
                y2="335"
                stroke="#FFA8CD"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.35"
              />
              <line
                x1="245"
                y1="165"
                x2="290"
                y2="360"
                stroke="#FFA8CD"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.35"
              />
              <line
                x1="185"
                y1="335"
                x2="202"
                y2="368"
                stroke="#FFA8CD"
                strokeWidth="1.5"
                opacity="0.6"
              />
              <line
                x1="202"
                y1="368"
                x2="260"
                y2="450"
                stroke="#FFA8CD"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.4"
              />
              <line
                x1="290"
                y1="360"
                x2="260"
                y2="450"
                stroke="#FFA8CD"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.5"
              />

              {/* Metro Hub Nodes */}
              {METRO_HUBS.map((hub) => {
                const isSelected = selectedHub.id === hub.id;
                return (
                  <g
                    key={hub.id}
                    onClick={() => setSelectedHub(hub)}
                    className="cursor-pointer group"
                  >
                    {/* Concentric Pulse Rings on Active Hub */}
                    {isSelected && (
                      <>
                        <circle
                          cx={hub.cx}
                          cy={hub.cy}
                          r="18"
                          fill="none"
                          stroke="#FFA8CD"
                          strokeWidth="1.2"
                          opacity="0.4"
                          className="animate-ping"
                        />
                        <circle
                          cx={hub.cx}
                          cy={hub.cy}
                          r="12"
                          fill="#FFA8CD"
                          fillOpacity="0.25"
                        />
                      </>
                    )}

                    {/* Node Dot */}
                    <circle
                      cx={hub.cx}
                      cy={hub.cy}
                      r={isSelected ? "6" : "4"}
                      fill={isSelected ? "#FFA8CD" : "#FFFFFF"}
                      stroke="#0B051D"
                      strokeWidth="1.5"
                    />

                    {/* Node Label */}
                    <text
                      x={hub.labelX ?? hub.cx + 10}
                      y={hub.labelY ?? hub.cy + 4}
                      textAnchor={hub.labelAnchor ?? "start"}
                      fill={isSelected ? "#FFA8CD" : "#C8C5D6"}
                      fontSize={isSelected ? "11.5" : "9.5"}
                      fontWeight={isSelected ? "bold" : "500"}
                      className="transition-all select-none"
                    >
                      {hub.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Side: Selected Hub Information & Demand Profile */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
          {/* Eyebrow Label */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#FFA8CD]">
              Selected Metropolitan Hub
            </span>
            <h3 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-black text-white tracking-tight mt-1 mb-1">
              {selectedHub.name}
            </h3>
            <p className="text-xs sm:text-sm text-[#A5A2B5] leading-relaxed max-w-lg">
              {selectedHub.stateDesc}
            </p>
          </div>

          {/* Two Stats Badges */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 sm:p-4">
              <span className="block text-[11px] text-[#8E8B9E] font-medium">
                Partner Kiranas
              </span>
              <span className="block text-lg sm:text-2xl font-bold text-white mt-1">
                {selectedHub.stores}
              </span>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 sm:p-4">
              <span className="block text-[11px] text-[#8E8B9E] font-medium">
                Doorstep Speed
              </span>
              <span className="block text-lg sm:text-2xl font-bold text-white mt-1">
                {selectedHub.deliveryTime}
              </span>
            </div>
          </div>

          {/* Hyperlocal Demand Profile Card */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 max-w-lg space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#FFA8CD]">
              <Store className="h-3.5 w-3.5" />
              <span>Hyperlocal Demand Profile</span>
            </div>
            <p className="text-xs sm:text-sm text-[#C8C5D6] leading-relaxed">
              {selectedHub.demandProfile}
            </p>
          </div>

          {/* CTA Pill Button */}
          <div className="pt-1">
            <Link
              href="/stores"
              className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-[#FAD2DE] text-[#0B051D] px-6 py-3 font-bold text-xs sm:text-sm transition-all duration-200 active:scale-98 shadow-md cursor-pointer"
            >
              <span>Explore {selectedHub.name} Stores</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#0B051D]" />
            </Link>
          </div>
        </div>

      </div>

      {/* Bottom Network Stats Strip (Exact Match to Screenshot 3) */}
      <div className="relative z-10 border-t border-white/10 pt-6 sm:pt-8 mt-6 sm:mt-8 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center sm:text-left">
        <div>
          <span className="font-display text-2xl sm:text-3xl font-black text-white block">
            12,900+
          </span>
          <span className="text-xs text-[#8E8B9E] font-medium block mt-1">
            Active Kirana Partners
          </span>
        </div>

        <div>
          <span className="font-display text-2xl sm:text-3xl font-black text-white block">
            15–20m
          </span>
          <span className="text-xs text-[#8E8B9E] font-medium block mt-1">
            Average Delivery Speed
          </span>
        </div>

        <div>
          <span className="font-display text-2xl sm:text-3xl font-black text-white block">
            ₹0
          </span>
          <span className="text-xs text-[#8E8B9E] font-medium block mt-1">
            Zero Shelf Markups
          </span>
        </div>

        <div>
          <span className="font-display text-2xl sm:text-3xl font-black text-white block text-emerald-400">
            99.4%
          </span>
          <span className="text-xs text-[#8E8B9E] font-medium block mt-1">
            Neighborhood Fulfillment
          </span>
        </div>
      </div>
    </div>
  );
}
