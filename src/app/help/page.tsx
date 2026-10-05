"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  HelpCircle,
  Package,
  CreditCard,
  Truck,
  RotateCcw,
  Tag,
  Store,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Footer } from "@/components/footer/Footer";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: "track-order",
    category: "Orders & Delivery",
    question: "Where is my order and how do I track it in real time?",
    answer:
      "You can track your active orders in real time by logging in and visiting your Customer Dashboard (/customer/dashboard or /customer/orders). Every order displays live timeline updates from store packing to neighborhood runner assignment and doorstep arrival.",
  },
  {
    id: "delivery-speed",
    category: "Orders & Delivery",
    question: "How fast is delivery from local neighborhood stores?",
    answer:
      "KiranaWala fulfills orders directly from your nearest neighborhood partner store within 15–20 minutes. Because items are picked from stores right around your corner rather than distant warehouses, delivery is lightning fast and ultra-local.",
  },
  {
    id: "razorpay-payment",
    category: "Payments & Razorpay",
    question: "How does Razorpay online payment work on KiranaWala?",
    answer:
      "When checking out, select 'Razorpay Secure Checkout'. You can pay via UPI (GPay, PhonePe, Paytm, BHIM), Credit/Debit Cards, NetBanking, or Digital Wallets. Payments are processed over 256-bit SSL encryption with cryptographic HMAC-SHA256 signature verification.",
  },
  {
    id: "cod-payment",
    category: "Payments & Razorpay",
    question: "Can I pay using Cash on Delivery (COD)?",
    answer:
      "Yes! You can choose 'Pay on Delivery' during checkout. You can pay cash directly to the neighborhood runner or scan their UPI QR code at your doorstep.",
  },
  {
    id: "cancel-refund",
    category: "Returns & Refunds",
    question: "How do I cancel an order or request a refund?",
    answer:
      "You can cancel an order directly from your Customer Dashboard before it is picked up by a runner. If you receive damaged or missing items, select 'Report Issue' on your order details page, and our team or local store owner will issue an instant refund or replacement.",
  },
  {
    id: "zero-markup",
    category: "Stores & Merchants",
    question: "What is KiranaWala's 'Zero Shelf-Price Markup' guarantee?",
    answer:
      "Unlike quick-commerce dark stores that inflate item prices by 10%–20%, KiranaWala guarantees that every product price matches the exact MRP / physical shelf price of your neighborhood store.",
  },
  {
    id: "use-coupon",
    category: "Coupons & Cashback",
    question: "How do I use a promotional coupon or discount code?",
    answer:
      "In your Cart Drawer or Checkout screen, type your promo code (e.g., KIRANA50 or WELCOME10) into the 'Coupon Code' field and click 'Apply'. The discount will instantly apply to your subtotal or delivery fee.",
  },
  {
    id: "contact-store",
    category: "Stores & Merchants",
    question: "How do I contact my local Kirana storekeeper?",
    answer:
      "After placing an order, your store name, phone contact, and address are listed in your order details page. You can also view store locations and categories on our Stores page (/stores).",
  },
  {
    id: "merchant-register",
    category: "Stores & Merchants",
    question: "How can I register my neighborhood store as a KiranaWala partner?",
    answer:
      "Store owners can join KiranaWala in under 5 minutes! Visit /store-owner/register to submit your shop details, location, and product categories. Once registered, you can manage inventory and fulfill orders from your Merchant Dashboard.",
  },
];

const HELP_CATEGORIES = [
  { name: "All Topics", icon: HelpCircle },
  { name: "Orders & Delivery", icon: Package },
  { name: "Payments & Razorpay", icon: CreditCard },
  { name: "Returns & Refunds", icon: RotateCcw },
  { name: "Coupons & Cashback", icon: Tag },
  { name: "Stores & Merchants", icon: Store },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Topics");
  const [openFaqId, setOpenFaqId] = useState<string | null>("track-order");

  // Support Form State
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportTopic, setSupportTopic] = useState("Orders & Delivery");
  const [supportOrderId, setSupportOrderId] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);

  const filteredFaqs = useMemo(() => {
    return FAQS.filter((faq) => {
      if (activeCategory !== "All Topics" && faq.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQ = faq.question.toLowerCase().includes(q);
        const matchesA = faq.answer.toLowerCase().includes(q);
        if (!matchesQ && !matchesA) return false;
      }
      return true;
    });
  }, [activeCategory, searchQuery]);

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportName || !supportEmail || !supportMessage) return;

    setSupportLoading(true);
    setTimeout(() => {
      setSupportLoading(false);
      setSupportSubmitted(true);
    }, 800);
  };

  return (
    <main className="min-h-screen bg-[#FAF8F5] text-[#0B051D] selection:bg-[#FAD2DE] selection:text-[#0B051D]">
      {/* Editorial Header */}
      <section className="bg-white border-b border-[#E8E2D9] pt-8 sm:pt-12 pb-10">
        <div className="kw-container space-y-6 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FAF8F5] border border-[#E8E2D9] px-3.5 py-1 text-xs font-bold text-[#059669]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>KiranaWala Support Center · 24/7 Assistance</span>
          </div>

          <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#0B051D]">
            How can we help you today?
          </h1>

          <p className="text-sm sm:text-base text-[#504F5F] leading-relaxed">
            Search our knowledge base or browse topic categories below to get instant answers about orders, payments, delivery, and neighborhood store policies.
          </p>

          {/* Big Search Bar */}
          <div className="pt-2 relative max-w-xl mx-auto flex items-center">
            <Search className="absolute left-5 h-5 w-5 text-[#0B051D] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help topics (e.g. tracking, razorpay, refund, coupon)..."
              className="w-full h-14 rounded-full border border-[#E8E2D9] bg-[#FAF8F5] pl-14 pr-5 text-sm sm:text-base font-medium text-[#0B051D] placeholder:text-[#94A3B8] focus:border-[#0B051D] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B051D] transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-4 text-xs font-bold text-[#64748B] hover:text-[#0B051D]"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="kw-container py-10 sm:py-14 space-y-12">
        {/* Category Pills */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {HELP_CATEGORIES.map((cat) => {
            const IconComponent = cat.icon;
            const active = activeCategory === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  active
                    ? "bg-[#0B051D] text-white shadow-xs"
                    : "bg-white border border-[#E8E2D9] text-[#504F5F] hover:border-[#0B051D] hover:bg-[#FAF8F5]"
                }`}
              >
                <IconComponent className="h-3.5 w-3.5" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* FAQs Accordion Grid */}
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D9]">
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#0B051D]">
              Frequently Asked Questions ({filteredFaqs.length})
            </h2>
            <span className="text-xs text-[#64748B]">Click any topic to expand</span>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="rounded-3xl border border-[#E8E2D9] bg-white p-10 text-center space-y-3">
              <HelpCircle className="h-10 w-10 text-[#94A3B8] mx-auto" />
              <h3 className="font-bold text-sm text-[#0B051D]">No help articles found</h3>
              <p className="text-xs text-[#504F5F]">
                Try searching for broader terms or fill out the support request form below.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("All Topics");
                }}
                className="inline-flex h-9 items-center justify-center rounded-full bg-[#0B051D] px-5 text-xs font-bold text-white"
              >
                Reset Search
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="rounded-2xl border border-[#E8E2D9] bg-white transition-all overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left transition-colors hover:bg-[#FAF8F5] cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-[#FAF8F5] border border-[#E8E2D9] px-2.5 py-0.5 text-[10px] font-bold text-[#059669] shrink-0">
                          {faq.category}
                        </span>
                        <h3 className="font-bold text-xs sm:text-sm text-[#0B051D]">
                          {faq.question}
                        </h3>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-[#0B051D] shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#64748B] shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#504F5F] leading-relaxed border-t border-[#E8E2D9]/50 bg-[#FAF8F5]/50">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Contact Support Section */}
        <div className="max-w-3xl mx-auto pt-6">
          <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 sm:p-10 space-y-6 shadow-xs">
            <div className="space-y-2 text-center sm:text-left">
              <span className="rounded-full bg-[#FAD2DE] px-3 py-1 text-[11px] font-bold text-[#0B051D]">
                Need Direct Help?
              </span>
              <h3 className="font-display text-2xl font-bold text-[#0B051D]">
                Submit a Support Request
              </h3>
              <p className="text-xs sm:text-sm text-[#504F5F]">
                Our local support team and store partner desk respond to all inquiries within ~15 minutes.
              </p>
            </div>

            {supportSubmitted ? (
              <div className="rounded-2xl bg-[#ECFDF5] border border-[#059669]/30 p-6 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-[#059669] text-white flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-base text-[#0B051D]">Support Request Received!</h4>
                <p className="text-xs text-[#504F5F] max-w-md mx-auto leading-relaxed">
                  Thank you, <strong>{supportName}</strong>. Your inquiry regarding <strong>{supportTopic}</strong> has been logged. Our local team will respond to <strong>{supportEmail}</strong> shortly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSupportSubmitted(false);
                    setSupportMessage("");
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-[#0B051D] px-5 text-xs font-bold text-white hover:bg-[#2C2242]"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#475569] mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={supportName}
                      onChange={(e) => setSupportName(e.target.value)}
                      placeholder="e.g. Ananya Sharma"
                      className="w-full h-10 rounded-full border border-[#E8E2D9] px-4 text-xs text-[#0B051D] focus:outline-none focus:ring-1 focus:ring-[#0B051D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#475569] mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full h-10 rounded-full border border-[#E8E2D9] px-4 text-xs text-[#0B051D] focus:outline-none focus:ring-1 focus:ring-[#0B051D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#475569] mb-1">
                      Topic Category
                    </label>
                    <select
                      value={supportTopic}
                      onChange={(e) => setSupportTopic(e.target.value)}
                      className="w-full h-10 rounded-full border border-[#E8E2D9] px-4 text-xs text-[#0B051D] focus:outline-none focus:ring-1 focus:ring-[#0B051D] bg-white cursor-pointer"
                    >
                      <option value="Orders & Delivery">Orders & Delivery</option>
                      <option value="Payments & Razorpay">Payments & Razorpay</option>
                      <option value="Returns & Refunds">Returns & Refunds</option>
                      <option value="Coupons & Cashback">Coupons & Cashback</option>
                      <option value="Stores & Merchants">Stores & Merchants</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#475569] mb-1">
                      Order ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={supportOrderId}
                      onChange={(e) => setSupportOrderId(e.target.value)}
                      placeholder="e.g. 6abed3309..."
                      className="w-full h-10 rounded-full border border-[#E8E2D9] px-4 text-xs text-[#0B051D] focus:outline-none focus:ring-1 focus:ring-[#0B051D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-1">
                    Describe your question or issue
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Provide details about your query so our local support team can assist you..."
                    className="w-full rounded-2xl border border-[#E8E2D9] p-3.5 text-xs text-[#0B051D] focus:outline-none focus:ring-1 focus:ring-[#0B051D]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={supportLoading}
                  className="w-full sm:w-auto h-11 rounded-full bg-[#0B051D] hover:bg-[#2C2242] text-white px-8 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {supportLoading ? "Sending Inquiry..." : "Submit Support Request →"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Quick Contact Cards */}
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-5 space-y-2 text-center">
            <div className="h-10 w-10 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center mx-auto">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-xs text-[#0B051D]">WhatsApp Hotline</h4>
            <p className="text-[11px] text-[#64748B]">Instant chat response for active orders.</p>
            <span className="font-mono text-xs font-bold text-[#059669] block">+91 98765 43210</span>
          </div>

          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-5 space-y-2 text-center">
            <div className="h-10 w-10 rounded-full bg-[#F8F7FA] text-[#0B051D] flex items-center justify-center mx-auto">
              <Mail className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-xs text-[#0B051D]">Email Support</h4>
            <p className="text-[11px] text-[#64748B]">Written support for account & billing.</p>
            <span className="font-mono text-xs font-bold text-[#0B051D] block">help@kiranawala.demo</span>
          </div>

          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-5 space-y-2 text-center">
            <div className="h-10 w-10 rounded-full bg-[#FAD2DE] text-[#0B051D] flex items-center justify-center mx-auto">
              <Store className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-xs text-[#0B051D]">Merchant Desk</h4>
            <p className="text-[11px] text-[#64748B]">Dedicated channel for store partners.</p>
            <Link href="/store-owner/register" className="text-xs font-bold text-[#0B051D] underline block">
              Partner Registration →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
