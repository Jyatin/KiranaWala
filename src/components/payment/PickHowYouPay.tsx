"use client";

import Image from "next/image";
import Link from "next/link";

interface PaymentTile {
  id: string;
  label: string;
  image: string;
  alt: string;
  hasPillBadge?: boolean;
}

const TILES: PaymentTile[] = [
  {
    id: "checkout",
    label: "Checkout",
    image: "/images/tiles/tile-1.jpg",
    alt: "Customer checking out with local groceries and pink headphones",
    hasPillBadge: true,
  },
  {
    id: "app",
    label: "KiranaWala app",
    image: "/images/tiles/tile-2.jpg",
    alt: "Hand holding smartphone showing KiranaWala grocery shopping app",
  },
  {
    id: "cards",
    label: "Kirana cards",
    image: "/images/tiles/tile-3.jpg",
    alt: "Sleek KiranaWala payment cards on countertop",
  },
  {
    id: "upi",
    label: "Instant UPI",
    image: "/images/tiles/tile-4.jpg",
    alt: "Smartphone tapping contactless payment at checkout counter",
  },
];

export function PickHowYouPay() {
  return (
    <section aria-label="Pick how you pay" className="w-full py-20 sm:py-28 bg-white border-t border-[#E2E2E7]">
      <div className="kw-container space-y-12">
        {/* Section Heading & Subtitle (Screenshot 5 Match) */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="font-display text-[32px] sm:text-[54px] lg:text-[62px] font-bold tracking-[-0.035em] text-[#0B051D] leading-[0.95]">
            Pick how you pay
          </h2>

          <p className="text-base sm:text-lg text-[#504F5F] font-normal leading-relaxed max-w-2xl mx-auto">
            We’ve got you covered, however you prefer to pay. Tap with Instant UPI, cards, or pay cash on delivery directly to your neighborhood store.
          </p>
        </div>

        {/* 4 Media Tiles Grid (Screenshot 5 Match) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
          {TILES.map((tile) => (
            <Link
              key={tile.id}
              href="/shop"
              className="group relative aspect-[3/4] w-full rounded-[30px] sm:rounded-[36px] overflow-hidden border border-[#E2E2E7] bg-[#F8F7FA] shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.015] block cursor-pointer"
            >
              <Image
                src={tile.image}
                alt={tile.alt}
                fill
                unoptimized
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />

              {/* Floating Pink Badge for Tile 1 */}
              {tile.hasPillBadge && (
                <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0B051D]/85 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-white shadow-md border border-white/10">
                    <span>Pay with</span>
                    <span className="rounded bg-[#FFA8CD] px-1.5 py-0.5 text-[11px] font-black text-[#0B051D]">
                      KiranaWala
                    </span>
                  </span>
                </div>
              )}

              {/* Bottom Dark Pill Label */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap">
                <span className="inline-flex items-center rounded-full bg-[#0B051D]/80 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-white shadow-sm border border-white/10 transition-colors group-hover:bg-[#0B051D]">
                  {tile.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
