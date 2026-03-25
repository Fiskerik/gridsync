import { useState, useEffect, useCallback } from "react";
import { Product } from "@/data/mockProducts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useSupabaseProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setProducts([]);
        setError("Not authenticated");
        return;
      }

      const { data, error: dbError } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false });

      if (dbError) throw new Error(dbError.message);

      const mapped: Product[] = (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        sku: row.sku,
        price: Number(row.price),
        compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : null,
        inventory: row.inventory,
        status: row.status as "active" | "draft" | "archived",
        vendor: row.vendor,
        productType: row.product_type,
        collection: row.collections || [],
        tags: row.tags || [],
        seoTitle: row.seo_title,
        seoDescription: row.seo_description,
        imageUrl: row.image_url,
        variants: row.variants,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        shopifyId: row.shopify_id || undefined,
      }));

      setProducts(mapped);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch products";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const importFromShopify = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Not authenticated");
      return { success: false, imported: 0 };
    }

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/sync-shopify`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || `Import failed: ${res.status}`);
    }

    await fetchProducts();
    return { success: true, imported: data.imported };
  }, [fetchProducts]);

  const pushChangesToShopify = useCallback(
    async (changedCells: Map<string, Record<string, unknown>>) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return { success: false, summary: { total: 0, succeeded: 0, failed: 0 } };
      }

      // Build change list with shopify IDs
      const changes = Array.from(changedCells.entries())
        .map(([productId, fieldChanges]) => {
          const product = products.find((p) => p.id === productId);
          const shopifyId = (product as Product & { shopifyId?: string })?.shopifyId;
          if (!shopifyId) return null;
          return { productId, shopifyId, changes: fieldChanges };
        })
        .filter(Boolean);

      if (changes.length === 0) {
        throw new Error("No products with Shopify IDs found in changes");
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/push-shopify-changes`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ changes }),
        }
      );

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Push failed: ${res.status}`);
      }

      // Re-sync after push
      await importFromShopify();
      return { success: true, summary: data.summary };
    },
    [products, importFromShopify]
  );

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    importFromShopify,
    pushChangesToShopify,
  };
}
