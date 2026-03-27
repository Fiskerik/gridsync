import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-auth, x-shopify-session-token",
};

const SHOPIFY_API_VERSION = "2025-07";

interface ProductChange {
  productId: string;
  shopifyId: string;
  storeId: string;
  changes: Record<string, unknown>;
}

/**
 * For large batches (>50 products), uses Shopify's GraphQL productUpdate mutations
 * in batched requests to avoid REST API throttling.
 * Falls through to the standard push-shopify-changes for small batches.
 */
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Group changes by store
    const changesByStore = new Map<string, ProductChange[]>();
    for (const c of changes) {
      const list = changesByStore.get(c.storeId) || [];
      list.push(c);
      changesByStore.set(c.storeId, list);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const storeIds = [...changesByStore.keys()];
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
    const results: { productId: string; shopifyId: string; success: boolean; error?: string }[] = [];

    for (const [storeId, storeChanges] of changesByStore) {
      const store = storeMap.get(storeId);
      if (!store) {
        storeChanges.forEach((c) =>
          results.push({ productId: c.productId, shopifyId: c.shopifyId, success: false, error: "Store not found" })
        );
        continue;
      }

      // Process in batches of 10 GraphQL mutations per request to stay within limits
      const BATCH_SIZE = 10;
      for (let i = 0; i < storeChanges.length; i += BATCH_SIZE) {
        const batch = storeChanges.slice(i, i + BATCH_SIZE);

        // Build a single GraphQL request with multiple aliased productUpdate mutations
        const mutationParts: string[] = [];
        const variables: Record<string, unknown> = {};

        batch.forEach((change, idx) => {
          const gid = `gid://shopify/Product/${change.shopifyId}`;
          const input: Record<string, unknown> = {};

          if (change.changes.title !== undefined) input.title = change.changes.title;
          if (change.changes.description !== undefined) input.bodyHtml = change.changes.description;
          if (change.changes.vendor !== undefined) input.vendor = change.changes.vendor;
          if (change.changes.productType !== undefined) input.productType = change.changes.productType;
          if (change.changes.status !== undefined) input.status = String(change.changes.status).toUpperCase();
          if (change.changes.tags !== undefined) {
            input.tags = Array.isArray(change.changes.tags) ? change.changes.tags : [String(change.changes.tags)];
          }

          variables[`input${idx}`] = { ...input, id: gid };

          mutationParts.push(`
            p${idx}: productUpdate(input: $input${idx}) {
              product { id title }
              userErrors { field message }
            }
          `);
        });

        const variableDefs = batch.map((_, idx) => `$input${idx}: ProductInput!`).join(", ");
        const mutation = `mutation BulkUpdate(${variableDefs}) { ${mutationParts.join("\n")} }`;

        try {
          const gqlRes = await fetch(
            `https://${store.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
            {
              method: "POST",
              headers: {
                "X-Shopify-Access-Token": store.access_token,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ query: mutation, variables }),
            }
          );

          if (!gqlRes.ok) {
            const body = await gqlRes.text();
            batch.forEach((c) =>
              results.push({ productId: c.productId, shopifyId: c.shopifyId, success: false, error: `GraphQL request failed [${gqlRes.status}]: ${body}` })
            );
            // Rate limit back-off
            if (gqlRes.status === 429) {
              const retryAfter = gqlRes.headers.get("Retry-After");
              await new Promise((r) => setTimeout(r, (parseInt(retryAfter || "2", 10)) * 1000));
            }
            continue;
          }

          const gqlData = await gqlRes.json();

          batch.forEach((change, idx) => {
            const result = gqlData.data?.[`p${idx}`];
            if (!result) {
              results.push({ productId: change.productId, shopifyId: change.shopifyId, success: false, error: "No response for mutation" });
              return;
            }
            const userErrors = result.userErrors || [];
            if (userErrors.length > 0) {
              results.push({
                productId: change.productId,
                shopifyId: change.shopifyId,
                success: false,
                error: userErrors.map((e: { message: string }) => e.message).join("; "),
              });
            } else {
              results.push({ productId: change.productId, shopifyId: change.shopifyId, success: true });
            }
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          batch.forEach((c) =>
            results.push({ productId: c.productId, shopifyId: c.shopifyId, success: false, error: msg })
          );
        }

        // Small delay between batches to respect rate limits
        await new Promise((r) => setTimeout(r, 500));
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
    console.error("bulk-shopify-mutations error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
