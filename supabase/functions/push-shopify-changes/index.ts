import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPIFY_STORE = "ea-consult-test-store.myshopify.com";
const SHOPIFY_API_VERSION = "2025-07";

interface ProductChange {
  productId: string; // Supabase product UUID
  shopifyId: string; // Shopify numeric product ID
  changes: Record<string, unknown>;
}

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
    const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");

    if (!shopifyToken) {
      return new Response(
        JSON.stringify({ error: "SHOPIFY_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

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

    const results: { shopifyId: string; success: boolean; error?: string }[] = [];

    for (const change of changes) {
      try {
        // Map local field names to Shopify Admin API product fields
        const product: Record<string, unknown> = { id: parseInt(change.shopifyId) };

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

        // Price and compare-at price go on the first variant
        const variantUpdates: Record<string, unknown> = {};
        if (change.changes.price !== undefined) variantUpdates.price = String(change.changes.price);
        if (change.changes.compareAtPrice !== undefined) {
          variantUpdates.compare_at_price = change.changes.compareAtPrice
            ? String(change.changes.compareAtPrice)
            : null;
        }
        if (change.changes.sku !== undefined) variantUpdates.sku = change.changes.sku;
        if (change.changes.inventory !== undefined) {
          // Inventory can't be set via product update; we skip it for now
        }

        // If there are variant-level changes, we need to fetch current variants first
        if (Object.keys(variantUpdates).length > 0) {
          const varRes = await fetch(
            `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/products/${change.shopifyId}/variants.json`,
            {
              headers: {
                "X-Shopify-Access-Token": shopifyToken,
                "Content-Type": "application/json",
              },
            }
          );
          if (varRes.ok) {
            const varData = await varRes.json();
            const firstVariant = varData.variants?.[0];
            if (firstVariant) {
              product.variants = [{ id: firstVariant.id, ...variantUpdates }];
            }
          } else {
            await varRes.text(); // consume body
          }
        }

        const res = await fetch(
          `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/products/${change.shopifyId}.json`,
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
          results.push({ shopifyId: change.shopifyId, success: false, error: `[${res.status}]: ${body}` });
        } else {
          await res.json(); // consume body
          results.push({ shopifyId: change.shopifyId, success: true });
        }

        // Rate limit: Shopify allows 2 req/sec for REST
        await new Promise((r) => setTimeout(r, 550));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.push({ shopifyId: change.shopifyId, success: false, error: msg });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({ success: true, results, summary: { total: changes.length, succeeded, failed } }),
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
