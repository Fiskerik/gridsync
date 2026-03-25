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
  shopifyId?: string;
  storeId?: string;
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
