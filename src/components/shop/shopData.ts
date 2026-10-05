import { Product, Store, CategoryItem } from "./types";

export const CATEGORIES: CategoryItem[] = [
  { id: "all", name: "All", iconName: "Sparkles" },
  { id: "produce", name: "Fresh Produce", iconName: "Leaf" },
  { id: "fruits", name: "Fruits", iconName: "Apple" },
  { id: "vegetables", name: "Vegetables", iconName: "Carrot" },
  { id: "dairy", name: "Dairy & Eggs", iconName: "Milk" },
  { id: "atta", name: "Atta & Grains", iconName: "Wheat" },
  { id: "pulses", name: "Pulses & Lentils", iconName: "Layers" },
  { id: "spices", name: "Spices", iconName: "Flame" },
  { id: "snacks", name: "Snacks", iconName: "Cookie" },
  { id: "beverages", name: "Beverages", iconName: "Coffee" },
  { id: "breakfast", name: "Breakfast", iconName: "Sun" },
  { id: "household", name: "Household", iconName: "Home" },
  { id: "personal", name: "Personal Care", iconName: "HeartPulse" },
  { id: "baby", name: "Baby Care", iconName: "Baby" },
  { id: "staples", name: "Staples", iconName: "Package" },
];

export function enrichProduct(raw: Product, storeMap?: Map<string, Store>): Product {
  const name = raw.name || "";
  
  // Extract brand if detected
  const brands = [
    "Amul", "Aashirvaad", "Tata", "Fortune", "MDH", "Everest",
    "India Gate", "Daawat", "Parle", "Britannia", "Nescafe", "Taj Mahal",
    "Brooke Bond", "Haldiram", "Maggi", "Dabur", "Saffola", "Surf Excel",
    "Vim", "Dettol", "Colgate", "Catch", "Gemini", "Sunfeast"
  ];
  const detectedBrand = brands.find((b) => name.toLowerCase().includes(b.toLowerCase())) || "Kirana Choice";

  // Extract weight/pack size
  const weightMatch = name.match(/(\d+(?:\.\d+)?\s*(?:kg|g|gm|ml|l|ltr|pack|pcs))/i);
  const weight = weightMatch ? weightMatch[0] : "Standard Pack";

  // Calculate realistic MRP
  const originalPrice = raw.originalPrice || Math.round(raw.price * (1 + (raw.price < 50 ? 0.12 : 0.18)));

  const storeId = typeof raw.store === "string" ? raw.store : raw.store?._id;
  const storeObj = storeMap && storeId ? storeMap.get(storeId) : undefined;

  return {
    ...raw,
    brand: detectedBrand,
    weight,
    originalPrice,
    rating: Number((4.6 + (name.length % 4) * 0.1).toFixed(1)),
    reviewCount: 40 + (name.length * 7) % 180,
    store: storeObj || raw.store,
  };
}
