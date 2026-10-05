import type { Metadata, Viewport } from "next";
import { Inter_Tight, Plus_Jakarta_Sans, Inter, Newsreader } from "next/font/google";
import { Navbar } from "@/components/navigation/Navbar";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
  weight: ["600", "700", "800"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "KiranaWala — Your Neighborhood, Intelligently Connected",
  description:
    "Discover nearby grocery stores, shop hyperlocally with AI Smart Basket assistance, and enjoy effortless local delivery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${interTight.variable} ${plusJakartaSans.variable} ${inter.variable} ${newsreader.variable}`}>
      <body className="min-h-screen bg-white text-[#0B051D] antialiased selection:bg-[#FFA8CD] selection:text-[#0B051D]">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
