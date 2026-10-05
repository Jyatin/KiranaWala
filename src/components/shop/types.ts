export interface Store {
  _id: string;
  name: string;
  description: string;
  category: string;
  location?: {
    coordinates: [number, number]; // [lng, lat]
  };
  distanceKm?: number;
  deliveryTimeMin?: number;
  rating?: number;
  ratingCount?: number;
  isOpen?: boolean;
}

export interface Product {
  _id: string;
  name: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  description: string;
  category: string;
  image?: string;
  stock: number;
  available: boolean;
  store: string | Store;
  weight?: string;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  unit?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartState {
  store: Store | null;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  iconName: string;
  count?: number;
}
