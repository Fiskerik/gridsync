import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPIFY_API_VERSION = "2025-07";

interface ProductChange {
  productId: string;
  shopifyId: string;
  storeId: string;
  changes: Record<string, unknown>;
}

interface PushResult {
  productId: string;
  shopifyId: string;
  success: boolean;
  error?: string;
}

const toStringValue = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { changes } = (await req.json()) as { changes: ProductChange[] };

    if (!changes || changes.length === 0) {
      return new Response(JSON.stringify({ error: "No changes provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storeIds = [...new Set(changes.map((c) => c.storeId).filter(Boolean))];

    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    const { data: stores, error: storesError } = await supabaseClient
      .from("shopify_stores")
      .select("id, shop_domain, access_token")
      .in("id", storeIds)
      .eq("user_id", user.id);

    if (storesError || !stores) {
      return new Response(JSON.stringify({ error: "Failed to fetch store credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storeMap = new Map(stores.map((s) => [s.id, s]));
    const locationCache = new Map<string, number>();
    const results: PushResult[] = [];

    for (const change of changes) {
      try {
        const store = storeMap.get(change.storeId);
        if (!store) {
          results.push({
            productId: change.productId,
            shopifyId: change.shopifyId,
            success: false,
            error: "Store not found",
          });
          continue;
        }

        const shopDomain = store.shop_domain;
        const shopifyToken = store.access_token;

        const product: Record<string, unknown> = { id: parseInt(change.shopifyId, 10) };

        if (change.changes.title !== undefined) product.title = change.changes.title;
        if (change.changes.description !== undefined) product.body_html = change.changes.description;
        if (change.changes.vendor !== undefined) product.vendor = change.changes.vendor;
        if (change.changes.productType !== undefined) product.product_type = change.changes.productType;
        if (change.changes.status !== undefined) product.status = change.changes.status;
        if (change.changes.tags !== undefined) {
          product.tags = Array.isArray(change.changes.tags)
            ? (change.changes.tags as string[]).join(", ")
            : change.changes.tags;
        }

        const variantUpdates: Record<string, unknown> = {};
        if (change.changes.price !== undefined) variantUpdates.price = String(change.changes.price);
        if (change.changes.compareAtPrice !== undefined) {
          variantUpdates.compare_at_price = toStringValue(change.changes.compareAtPrice);
        }
        if (change.changes.sku !== undefined) variantUpdates.sku = change.changes.sku;

        const hasInventoryUpdate = change.changes.inventory !== undefined;
        const targetInventory = hasInventoryUpdate ? Number(change.changes.inventory) : null;
        if (hasInventoryUpdate && (targetInventory === null || Number.isNaN(targetInventory) || targetInventory < 0)) {
          results.push({
            productId: change.productId,
            shopifyId: change.shopifyId,
            success: false,
            error: "Inventory must be a non-negative number",
          });
          continue;
        }

        let firstVariant: { id: number; inventory_item_id: number } | null = null;
        if (Object.keys(variantUpdates).length > 0 || hasInventoryUpdate) {
          const varRes = await fetch(
            `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products/${change.shopifyId}/variants.json?limit=1`,
            {
              headers: {
                "X-Shopify-Access-Token": shopifyToken,
                "Content-Type": "application/json",
              },
            }
          );

          if (!varRes.ok) {
            const body = await varRes.text();
            results.push({
              productId: change.productId,
              shopifyId: change.shopifyId,
              success: false,
              error: `Failed to fetch variant [${varRes.status}]: ${body}`,
            });
            continue;
          }

          const varData = await varRes.json();
          firstVariant = varData.variants?.[0] || null;
          if (!firstVariant) {
            results.push({
              productId: change.productId,
              shopifyId: change.shopifyId,
              success: false,
              error: "No variants found for product",
            });
            continue;
          }
        }

        if (Object.keys(variantUpdates).length > 0 && firstVariant) {
          product.variants = [{ id: firstVariant.id, ...variantUpdates }];
        }

        const hasProductUpdate = Object.keys(product).length > 1;
        if (hasProductUpdate) {
          const res = await fetch(
            `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products/${change.shopifyId}.json`,
            {
              method: "PUT",
              headers: {
                "X-Shopify-Access-Token": shopifyToken,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ product }),
            }
          );

          if (!res.ok) {
            const body = await res.text();
            results.push({
              productId: change.productId,
              shopifyId: change.shopifyId,
              success: false,
              error: `Product update failed [${res.status}]: ${body}`,
            });
            continue;
          }
        }

        if (hasInventoryUpdate && firstVariant && targetInventory !== null) {
          let locationId = locationCache.get(store.id);
          if (!locationId) {
            const locationsRes = await fetch(
              `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/locations.json?limit=1`,
              {
                headers: {
                  "X-Shopify-Access-Token": shopifyToken,
                  "Content-Type": "application/json",
                },
              }
            );

            if (!locationsRes.ok) {
              const body = await locationsRes.text();
              results.push({
                productId: change.productId,
                shopifyId: change.shopifyId,
                success: false,
                error: `Failed to fetch locations [${locationsRes.status}]: ${body}. Reconnect the store after updating app scopes.`,
              });
              continue;
            }

            const locationsData = await locationsRes.json();
            const firstLocation = locationsData.locations?.[0];
            if (!firstLocation?.id) {
              results.push({
                productId: change.productId,
                shopifyId: change.shopifyId,
                success: false,
                error: "No Shopify location found for inventory update",
              });
              continue;
            }

            locationId = firstLocation.id;
            locationCache.set(store.id, locationId);
          }

          const inventoryRes = await fetch(
            `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/inventory_levels/set.json`,
            {
              method: "POST",
              headers: {
                "X-Shopify-Access-Token": shopifyToken,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                location_id: locationId,
                inventory_item_id: firstVariant.inventory_item_id,
                available: Math.round(targetInventory),
              }),
            }
          );

          if (!inventoryRes.ok) {
            const body = await inventoryRes.text();
            results.push({
              productId: change.productId,
              shopifyId: change.shopifyId,
              success: false,
              error: `Inventory update failed [${inventoryRes.status}]: ${body}. Reconnect the store to refresh scopes if needed.`,
            });
            continue;
          }
        }

        results.push({ productId: change.productId, shopifyId: change.shopifyId, success: true });
        await new Promise((r) => setTimeout(r, 350));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.push({
          productId: change.productId,
          shopifyId: change.shopifyId,
          success: false,
          error: msg,
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: { total: changes.length, succeeded, failed },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("push-shopify-changes error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
