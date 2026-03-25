export interface Product {
  id: string;
  title: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  inventory: number;
  status: "active" | "draft";
  vendor: string;
  collection: string[];
  tags: string[];
}

export const mockProducts: Product[] = [
  { id: "1", title: "Classic Cotton Tee", sku: "CCT-001", price: 29.99, compareAtPrice: null, inventory: 142, status: "active", vendor: "NorthThread", collection: ["Summer 2025", "New Arrivals"], tags: ["cotton", "basics"] },
  { id: "2", title: "Wool Blend Overcoat", sku: "WBO-012", price: 89.00, compareAtPrice: null, inventory: 31, status: "active", vendor: "NorthThread", collection: ["On Sale"], tags: ["outerwear", "winter"] },
  { id: "3", title: "Linen Shorts", sku: "LS-044", price: 24.00, compareAtPrice: 29.00, inventory: 0, status: "draft", vendor: "SolWeave", collection: ["Summer 2025"], tags: ["linen", "shorts"] },
  { id: "4", title: "Performance Joggers", sku: "PJ-087", price: 34.00, compareAtPrice: null, inventory: 88, status: "active", vendor: "NorthThread", collection: [], tags: ["activewear"] },
  { id: "5", title: "Silk Wrap Dress", sku: "SWD-023", price: 79.00, compareAtPrice: null, inventory: 12, status: "active", vendor: "SolWeave", collection: ["New Arrivals"], tags: ["dress", "silk"] },
  { id: "6", title: "Canvas Sneakers", sku: "CS-156", price: 49.99, compareAtPrice: 65.00, inventory: 55, status: "active", vendor: "NorthThread", collection: ["Summer 2025", "On Sale"], tags: ["footwear"] },
  { id: "7", title: "Bamboo Socks 3-Pack", sku: "BS3-200", price: 18.00, compareAtPrice: null, inventory: 220, status: "active", vendor: "SolWeave", collection: [], tags: ["socks", "bamboo", "basics"] },
  { id: "8", title: "Denim Jacket", sku: "DJ-033", price: 65.00, compareAtPrice: null, inventory: 47, status: "active", vendor: "NorthThread", collection: ["On Sale"], tags: ["denim", "outerwear"] },
  { id: "9", title: "Cashmere Scarf", sku: "CSC-011", price: 120.00, compareAtPrice: 150.00, inventory: 8, status: "draft", vendor: "SolWeave", collection: ["New Arrivals"], tags: ["cashmere", "accessories"] },
  { id: "10", title: "Organic Hoodie", sku: "OH-077", price: 55.00, compareAtPrice: null, inventory: 63, status: "active", vendor: "NorthThread", collection: ["Summer 2025"], tags: ["hoodie", "organic"] },
];

export const collections = [
  { name: "Summer 2025", count: 42 },
  { name: "On Sale", count: 28 },
  { name: "New Arrivals", count: 15 },
];
