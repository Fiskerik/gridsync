export interface Product {
  id: string;
  title: string;
  description: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  inventory: number;
  status: "active" | "draft" | "archived";
  vendor: string;
  productType: string;
  collection: string[];
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  imageUrl: string;
  variants: number;
  createdAt: string;
  updatedAt: string;
}

export interface EditHistoryEntry {
  id: string;
  timestamp: string;
  description: string;
  productsAffected: number;
  fieldsChanged: string[];
  changes: { productId: string; field: string; oldValue: unknown; newValue: unknown }[];
  reverted: boolean;
}

export const mockProducts: Product[] = [
  { id: "1", title: "Classic Cotton Tee", description: "Soft 100% organic cotton t-shirt, perfect for everyday wear.", sku: "CCT-001", price: 29.99, compareAtPrice: null, inventory: 142, status: "active", vendor: "NorthThread", productType: "Shirts", collection: ["Summer 2025", "New Arrivals"], tags: ["cotton", "basics", "tshirt"], seoTitle: "Classic Cotton Tee | NorthThread", seoDescription: "Shop our bestselling organic cotton tee. Soft, sustainable, and available in 8 colors.", imageUrl: "", variants: 8, createdAt: "2024-11-15", updatedAt: "2025-03-20" },
  { id: "2", title: "Wool Blend Overcoat", description: "Premium wool blend overcoat with satin lining. Classic silhouette.", sku: "WBO-012", price: 89.00, compareAtPrice: null, inventory: 31, status: "active", vendor: "NorthThread", productType: "Outerwear", collection: ["On Sale"], tags: ["outerwear", "winter", "wool"], seoTitle: "", seoDescription: "", imageUrl: "", variants: 4, createdAt: "2024-09-01", updatedAt: "2025-02-14" },
  { id: "3", title: "Linen Shorts", description: "Lightweight linen shorts for warm weather.", sku: "LS-044", price: 24.00, compareAtPrice: 29.00, inventory: 0, status: "draft", vendor: "SolWeave", productType: "Shorts", collection: ["Summer 2025"], tags: ["linen", "shorts", "summer"], seoTitle: "Linen Shorts | SolWeave", seoDescription: "Cool, breathable linen shorts. Perfect for beach and city.", imageUrl: "", variants: 5, createdAt: "2025-01-10", updatedAt: "2025-03-18" },
  { id: "4", title: "Performance Joggers", description: "Moisture-wicking joggers with 4-way stretch fabric.", sku: "PJ-087", price: 34.00, compareAtPrice: null, inventory: 88, status: "active", vendor: "NorthThread", productType: "Pants", collection: [], tags: ["activewear", "joggers"], seoTitle: "Performance Joggers – Athletic Fit", seoDescription: "", imageUrl: "", variants: 6, createdAt: "2024-12-05", updatedAt: "2025-03-22" },
  { id: "5", title: "Silk Wrap Dress", description: "Elegant silk wrap dress with adjustable tie waist.", sku: "SWD-023", price: 79.00, compareAtPrice: null, inventory: 12, status: "active", vendor: "SolWeave", productType: "Dresses", collection: ["New Arrivals"], tags: ["dress", "silk", "formal"], seoTitle: "", seoDescription: "Luxurious silk wrap dress for special occasions.", imageUrl: "", variants: 3, createdAt: "2025-02-01", updatedAt: "2025-03-21" },
  { id: "6", title: "Canvas Sneakers", description: "Casual canvas sneakers with vulcanized rubber sole.", sku: "CS-156", price: 49.99, compareAtPrice: 65.00, inventory: 55, status: "active", vendor: "NorthThread", productType: "Footwear", collection: ["Summer 2025", "On Sale"], tags: ["footwear", "casual", "sneakers"], seoTitle: "Canvas Sneakers | Everyday Comfort", seoDescription: "Classic canvas sneakers at a great price. Free shipping over $50.", imageUrl: "", variants: 10, createdAt: "2024-10-20", updatedAt: "2025-03-15" },
  { id: "7", title: "Bamboo Socks 3-Pack", description: "Ultra-soft bamboo fiber socks. Anti-bacterial and breathable.", sku: "BS3-200", price: 18.00, compareAtPrice: null, inventory: 220, status: "active", vendor: "SolWeave", productType: "Accessories", collection: [], tags: ["socks", "bamboo", "basics", "eco"], seoTitle: "Bamboo Socks 3-Pack | Eco Friendly", seoDescription: "Sustainable bamboo socks. Incredibly soft and naturally odor-resistant.", imageUrl: "", variants: 4, createdAt: "2024-08-12", updatedAt: "2025-01-30" },
  { id: "8", title: "Denim Jacket", description: "Vintage-washed denim jacket with brass buttons.", sku: "DJ-033", price: 65.00, compareAtPrice: null, inventory: 47, status: "active", vendor: "NorthThread", productType: "Outerwear", collection: ["On Sale"], tags: ["denim", "outerwear", "casual"], seoTitle: "", seoDescription: "", imageUrl: "", variants: 5, createdAt: "2024-07-22", updatedAt: "2025-03-10" },
  { id: "9", title: "Cashmere Scarf", description: "100% cashmere scarf in rich seasonal colors.", sku: "CSC-011", price: 120.00, compareAtPrice: 150.00, inventory: 8, status: "draft", vendor: "SolWeave", productType: "Accessories", collection: ["New Arrivals"], tags: ["cashmere", "accessories", "luxury"], seoTitle: "Luxury Cashmere Scarf", seoDescription: "Wrap yourself in pure cashmere luxury. Available in 6 colors.", imageUrl: "", variants: 6, createdAt: "2025-01-25", updatedAt: "2025-03-19" },
  { id: "10", title: "Organic Hoodie", description: "GOTS certified organic cotton hoodie with kangaroo pocket.", sku: "OH-077", price: 55.00, compareAtPrice: null, inventory: 63, status: "active", vendor: "NorthThread", productType: "Shirts", collection: ["Summer 2025"], tags: ["hoodie", "organic", "eco"], seoTitle: "Organic Cotton Hoodie | Sustainable", seoDescription: "Eco-friendly hoodie made from certified organic cotton.", imageUrl: "", variants: 7, createdAt: "2024-11-30", updatedAt: "2025-03-24" },
  { id: "11", title: "Merino Wool Beanie", description: "Warm merino wool beanie, temperature regulating.", sku: "MWB-055", price: 22.00, compareAtPrice: null, inventory: 95, status: "active", vendor: "SolWeave", productType: "Accessories", collection: [], tags: ["beanie", "wool", "winter"], seoTitle: "", seoDescription: "", imageUrl: "", variants: 3, createdAt: "2024-10-05", updatedAt: "2025-02-28" },
  { id: "12", title: "Stretch Chinos", description: "Slim-fit stretch chinos with comfort waistband.", sku: "SC-190", price: 42.00, compareAtPrice: null, inventory: 0, status: "draft", vendor: "NorthThread", productType: "Pants", collection: ["New Arrivals"], tags: ["chinos", "pants", "stretch"], seoTitle: "Stretch Chinos | Slim Fit", seoDescription: "Modern slim-fit chinos with stretch comfort. Perfect from office to weekend.", imageUrl: "", variants: 8, createdAt: "2025-02-15", updatedAt: "2025-03-23" },
];

export const collections = [
  { name: "Summer 2025", count: 42 },
  { name: "On Sale", count: 28 },
  { name: "New Arrivals", count: 15 },
];

export const mockHistory: EditHistoryEntry[] = [
  {
    id: "h1",
    timestamp: "2025-03-24T14:32:00Z",
    description: "Bulk price increase +10% on Summer 2025 collection",
    productsAffected: 4,
    fieldsChanged: ["price"],
    changes: [
      { productId: "1", field: "price", oldValue: 27.27, newValue: 29.99 },
      { productId: "3", field: "price", oldValue: 21.82, newValue: 24.00 },
      { productId: "6", field: "price", oldValue: 45.45, newValue: 49.99 },
      { productId: "10", field: "price", oldValue: 50.00, newValue: 55.00 },
    ],
    reverted: false,
  },
  {
    id: "h2",
    timestamp: "2025-03-22T09:15:00Z",
    description: "Updated SEO titles for products missing metadata",
    productsAffected: 3,
    fieldsChanged: ["seoTitle", "seoDescription"],
    changes: [
      { productId: "2", field: "seoTitle", oldValue: "", newValue: "Wool Blend Overcoat | Premium Outerwear" },
      { productId: "5", field: "seoTitle", oldValue: "", newValue: "Silk Wrap Dress | Elegant Eveningwear" },
      { productId: "8", field: "seoTitle", oldValue: "", newValue: "Vintage Denim Jacket | Classic Style" },
    ],
    reverted: false,
  },
  {
    id: "h3",
    timestamp: "2025-03-20T16:45:00Z",
    description: "Set compare-at prices for On Sale collection",
    productsAffected: 2,
    fieldsChanged: ["compareAtPrice"],
    changes: [
      { productId: "2", field: "compareAtPrice", oldValue: null, newValue: 119.00 },
      { productId: "8", field: "compareAtPrice", oldValue: null, newValue: 85.00 },
    ],
    reverted: true,
  },
];
