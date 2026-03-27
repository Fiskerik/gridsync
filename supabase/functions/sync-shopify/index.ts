import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-auth, x-shopify-session-token",
};

const SHOPIFY_API_VERSION = "2025-07";

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  status: string;
  tags: string;
  created_at: string;
  updated_at: string;
  image?: { src: string } | null;
  images: { src: string }[];
  variants: {
    id: number;
    title: string;
    sku: string;
    price: string;
    compare_at_price: string | null;
    inventory_quantity: number;
  }[];
}

/**
 * Resolve the Supabase user from either:
 *   - Standalone:  Authorization: Bearer <supabase-token>
 *   - Embedded:    Authorization: Bearer <shopify-session-token>
 *                  X-Supabase-Auth: <supabase-token>
 */
async function resolveUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseAuthHeader = req.headers.get("X-Supabase-Auth") ?? "";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const anonClient = createClient(supabaseUrl, anonKey);

  const tokenToVerify = supabaseAuthHeader
    ? supabaseAuthHeader
    : authHeader.replace("Bearer ", "");

  if (!tokenToVerify) return { user: null };

  const { data: { user } } = await anonClient.auth.getUser(tokenToVerify);
  return { user };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user } = await resolveUser(req);

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json();
    const storeId: string | undefined = body.store_id;

    if (!storeId) {
      return new Response(JSON.stringify({ error: "Missing store_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    const { data: store, error: storeError } = await supabaseClient
      .from("shopify_stores")
      .select("*")
      .eq("id", storeId)
      .eq("user_id", user.id)
      .single();

    if (storeError || !store) {
      return new Response(
        JSON.stringify({ error: "Store not found or unauthorized" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shopifyToken = store.access_token;
    const shopDomain = store.shop_domain;

    const allProducts: ShopifyProduct[] = [];
    let pageInfo: string | null = null;
    let hasNext = true;

    while (hasNext) {
      const url: string = pageInfo
        ? pageInfo
        : `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`;

      const res: Response = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": shopifyToken,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const respBody = await res.text();
        throw new Error(`Shopify API error [${res.status}]: ${respBody}`);
      }

      const data = await res.json();
      allProducts.push(...(data.products || []));

      const linkHeader = res.headers.get("Link");
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        pageInfo = match ? match[1] : null;
        hasNext = !!pageInfo;
      } else {
        hasNext = false;
      }
    }

    const rows = allProducts.map((p) => {
      const firstVariant = p.variants?.[0];
      const tags = p.tags ? p.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

      return {
        shopify_id: String(p.id),
        user_id: user.id,
        store_id: storeId,
        title: p.title || "",
        description: (p.body_html || "").replace(/<[^>]*>/g, ""),
        sku: firstVariant?.sku || "",
        price: parseFloat(firstVariant?.price || "0"),
        compare_at_price: firstVariant?.compare_at_price
          ? parseFloat(firstVariant.compare_at_price)
          : null,
        inventory: firstVariant?.inventory_quantity ?? 0,
        status: p.status === "active" ? "active" : "draft",
        vendor: p.vendor || "",
        product_type: p.product_type || "",
        collections: [] as string[],
        tags,
        seo_title: "",
        seo_description: "",
        image_url: p.image?.src || p.images?.[0]?.src || "",
        variants: p.variants?.length || 1,
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
    });

    await supabaseClient.from("products").delete().eq("user_id", user.id).eq("store_id", storeId);

    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const { error: insertError } = await supabaseClient.from("products").insert(batch);
        if (insertError) {
          throw new Error(`Supabase insert error: ${insertError.message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported: rows.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-shopify error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
