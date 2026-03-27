import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-auth, x-shopify-session-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseAuthHeader = req.headers.get("X-Supabase-Auth") ?? "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const tokenToVerify = supabaseAuthHeader || authHeader.replace("Bearer ", "");

    if (!tokenToVerify) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await anonClient.auth.getUser(tokenToVerify);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "SHOPIFY_CLIENT_ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { shop } = await req.json();
    if (!shop) {
      return new Response(JSON.stringify({ error: "Missing shop domain" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize shop domain
    const shopDomain = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const shopHost = shopDomain.includes(".myshopify.com")
      ? shopDomain
      : `${shopDomain}.myshopify.com`;

    const scopes = "read_products,write_products,read_inventory,write_inventory";
    const projectId = Deno.env.get("SUPABASE_URL")!.match(/https:\/\/([^.]+)/)?.[1] || "";
    const redirectUri = `https://${projectId}.supabase.co/functions/v1/shopify-oauth-callback`;

    // Create a state token with user ID for security
    const state = btoa(JSON.stringify({ userId: user.id, shop: shopHost, ts: Date.now() }));

    const authUrl = `https://${shopHost}/admin/oauth/authorize?` +
      `client_id=${clientId}` +
      `&scope=${scopes}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}`;

    return new Response(
      JSON.stringify({ authUrl, shop: shopHost }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("shopify-oauth-init error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
