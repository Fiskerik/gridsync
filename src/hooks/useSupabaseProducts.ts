import { useState, useEffect, useCallback } from "react";
import { Product } from "@/data/mockProducts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ShopifyStore {
  id: string;
  shop_domain: string;
  store_name: string;
  created_at: string;
}

export function useSupabaseProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStores = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error: dbError } = await supabase
      .from("shopify_stores")
      .select("id, shop_domain, store_name, created_at")
      .order("created_at", { ascending: true });

    if (!dbError && data) {
      setStores(data);
      // Auto-select all stores if none selected
      if (selectedStoreIds.size === 0 && data.length > 0) {
        setSelectedStoreIds(new Set(data.map((s) => s.id)));
      }
    }
  }, []);

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

      let query = supabase
        .from("products")
        .select("*")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false });

      // Filter by selected stores if any
      if (selectedStoreIds.size > 0) {
        query = query.in("store_id", Array.from(selectedStoreIds));
      }

      const { data, error: dbError } = await query;

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
        storeId: row.store_id || undefined,
      }));

      setProducts(mapped);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch products";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedStoreIds]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const connectStore = useCallback(async (shopDomain: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Not authenticated");
      return null;
    }

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/shopify-oauth-init`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shop: shopDomain }),
      }
    );

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || `OAuth init failed: ${res.status}`);
    }

    return data.authUrl as string;
  }, []);

  const disconnectStore = useCallback(async (storeId: string) => {
    const { error } = await supabase
      .from("shopify_stores")
      .delete()
      .eq("id", storeId);

    if (error) {
      toast.error("Failed to disconnect store");
      return;
    }

    setStores((prev) => prev.filter((s) => s.id !== storeId));
    setSelectedStoreIds((prev) => {
      const next = new Set(prev);
      next.delete(storeId);
      return next;
    });
    toast.success("Store disconnected");
    fetchProducts();
  }, [fetchProducts]);

  const importFromShopify = useCallback(async (storeId: string) => {
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
        body: JSON.stringify({ store_id: storeId }),
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

      const changes = Array.from(changedCells.entries())
        .map(([productId, fieldChanges]) => {
          const product = products.find((p) => p.id === productId);
          if (!product?.shopifyId || !product?.storeId) return null;
          return {
            productId,
            shopifyId: product.shopifyId,
            storeId: product.storeId,
            changes: fieldChanges,
          };
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

      await fetchProducts();
      return { success: true, summary: data.summary };
    },
    [products, fetchProducts]
  );

  return {
    products,
    stores,
    selectedStoreIds,
    setSelectedStoreIds: (ids: Set<string>) => {
      setSelectedStoreIds(ids);
    },
    loading,
    error,
    refetch: fetchProducts,
    refetchStores: fetchStores,
    connectStore,
    disconnectStore,
    importFromShopify,
    pushChangesToShopify,
  };
}
