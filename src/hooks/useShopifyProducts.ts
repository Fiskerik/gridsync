import { useState, useEffect, useCallback } from "react";
import { Product } from "@/data/mockProducts";
import { toast } from "sonner";

const SHOPIFY_API_VERSION = "2025-07";
const SHOPIFY_STORE_PERMANENT_DOMAIN = "ea-consult-test-store.myshopify.com";
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_STOREFRONT_TOKEN = "75e15d563878d3509c66589ab59cb6ad";

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          description
          handle
          vendor
          productType
          tags
          status: publishedAt
          createdAt
          updatedAt
          totalInventory
          priceRange {
            minVariantPrice { amount currencyCode }
          }
          compareAtPriceRange {
            minVariantPrice { amount currencyCode }
          }
          images(first: 1) {
            edges { node { url altText } }
          }
          variants(first: 100) {
            edges {
              node {
                id title sku
                price { amount currencyCode }
                compareAtPrice { amount currencyCode }
                availableForSale
                selectedOptions { name value }
              }
            }
          }
          seo { title description }
          collections(first: 10) {
            edges { node { title } }
          }
          options { name values }
        }
      }
    }
  }
`;

async function storefrontApiRequest(query: string, variables: Record<string, unknown> = {}) {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 402) {
    toast.error("Shopify: Payment required", {
      description: "Your store needs an active Shopify billing plan.",
    });
    return null;
  }

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new Error(data.errors.map((e: { message: string }) => e.message).join(", "));
  }
  return data;
}

function mapShopifyToProduct(node: Record<string, unknown>): Product {
  const variants = (node.variants as { edges: Array<{ node: Record<string, unknown> }> })?.edges || [];
  const firstVariant = variants[0]?.node;
  const price = firstVariant?.price as { amount: string } | undefined;
  const compareAt = firstVariant?.compareAtPrice as { amount: string } | null | undefined;
  const images = (node.images as { edges: Array<{ node: { url: string } }> })?.edges || [];
  const collections = (node.collections as { edges: Array<{ node: { title: string } }> })?.edges || [];
  const seo = node.seo as { title: string; description: string } | undefined;

  return {
    id: node.id as string,
    title: (node.title as string) || "",
    description: (node.description as string) || "",
    sku: (firstVariant?.sku as string) || "",
    price: price ? parseFloat(price.amount) : 0,
    compareAtPrice: compareAt ? parseFloat(compareAt.amount) : null,
    inventory: (node.totalInventory as number) ?? 0,
    status: node.status ? "active" : "draft",
    vendor: (node.vendor as string) || "",
    productType: (node.productType as string) || "",
    collection: collections.map((c) => c.node.title),
    tags: (node.tags as string[]) || [],
    seoTitle: seo?.title || "",
    seoDescription: seo?.description || "",
    imageUrl: images[0]?.node?.url || "",
    variants: variants.length,
    createdAt: (node.createdAt as string) || "",
    updatedAt: (node.updatedAt as string) || "",
  };
}

export function useShopifyProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await storefrontApiRequest(PRODUCTS_QUERY, { first: 100 });
      if (!data) {
        setProducts([]);
        return;
      }
      const edges = data.data?.products?.edges || [];
      const mapped = edges.map((e: { node: Record<string, unknown> }) => mapShopifyToProduct(e.node));
      setProducts(mapped);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch products";
      setError(msg);
      toast.error("Failed to load Shopify products", { description: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
}
