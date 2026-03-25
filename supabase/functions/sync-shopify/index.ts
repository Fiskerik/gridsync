import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPIFY_STORE = "ea-consult-test-store.myshopify.com";
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
    const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");

    if (!shopifyToken) {
      return new Response(
        JSON.stringify({ error: "SHOPIFY_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
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

    // Fetch all products from Shopify Admin API (paginated)
    const allProducts: ShopifyProduct[] = [];
    let pageInfo: string | null = null;
    let hasNext = true;

    while (hasNext) {
      const url = pageInfo
        ? pageInfo
        : `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`;

      const res = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": shopifyToken,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Shopify API error [${res.status}]: ${body}`);
      }

      const data = await res.json();
      allProducts.push(...(data.products || []));

      // Check for next page via Link header
      const linkHeader = res.headers.get("Link");
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        pageInfo = match ? match[1] : null;
        hasNext = !!pageInfo;
      } else {
        hasNext = false;
      }
    }

    // Upsert products into Supabase
    const rows = allProducts.map((p) => {
      const firstVariant = p.variants?.[0];
      const tags = p.tags ? p.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

      return {
        shopify_id: String(p.id),
        user_id: user.id,
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

    // Delete existing products for this user, then insert fresh
    await supabaseClient.from("products").delete().eq("user_id", user.id);

    if (rows.length > 0) {
      // Insert in batches of 100
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
