import { Hero } from "@/components/hero/Hero";
import { FeatureShowcase } from "@/components/features/FeatureShowcase";
import { OfferingList } from "@/components/offering/OfferingList";
import { MembershipBanner } from "@/components/membership/MembershipBanner";
import { PickHowYouPay } from "@/components/payment/PickHowYouPay";
import { Footer } from "@/components/footer/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* 1. Master Editorial Hero Billboard + Social Proof Strip */}
      <Hero />

      {/* 2. Feature Showcase: "Your everyday grocery app" (Interactive Accordion) */}
      <FeatureShowcase />

      {/* 3. Offering Grid / List: "Explore our offering" */}
      <OfferingList />

      {/* 4. Membership Feature: "Say yes to more" */}
      <MembershipBanner />

      {/* 5. "Pick how you pay": 4 Full-Bleed Media Tiles */}
      <PickHowYouPay />

      {/* 6. Legal Footnotes & Multi-Column Dark Footer */}
      <Footer />
    </main>
  );
}
