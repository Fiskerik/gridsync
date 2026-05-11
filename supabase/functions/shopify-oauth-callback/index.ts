import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const shop = url.searchParams.get("shop");

    if (!code || !state || !shop) {
      return new Response("Missing required OAuth parameters", { status: 400 });
    }

    let stateData: { userId: string; shop: string; ts: number };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response("Invalid state parameter", { status: 400 });
    }

    if (stateData.shop !== shop) {
      return new Response("Shop mismatch in state", { status: 400 });
    }

    if (Date.now() - stateData.ts > 600000) {
      return new Response("OAuth session expired", { status: 400 });
    }

    const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response("Shopify OAuth credentials not configured", { status: 500 });
    }

    // Exchange code for offline access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("Token exchange failed:", body);
      return new Response(`Failed to get access token: ${body}`, { status: 500 });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const scopes = tokenData.scope || "";

    // Fetch shop info
    const shopInfoRes = await fetch(`https://${shop}/admin/api/2025-07/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    let storeName = shop.replace(".myshopify.com", "");
    if (shopInfoRes.ok) {
      const shopInfo = await shopInfoRes.json();
      storeName = shopInfo.shop?.name || storeName;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Check if store already exists for this user (reinstall scenario)
    const { data: existingStore } = await supabaseClient
      .from("shopify_stores")
      .select("id")
      .eq("user_id", stateData.userId)
      .eq("shop_domain", shop)
      .maybeSingle();

    if (existingStore) {
      const { error: updateError } = await supabaseClient
        .from("shopify_stores")
        .update({
          access_token: accessToken,
          scopes,
          store_name: storeName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingStore.id);

      if (updateError) {
        console.error("Failed to update store:", updateError);
        return new Response(`Failed to update store credentials: ${updateError.message}`, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabaseClient.from("shopify_stores").insert({
        user_id: stateData.userId,
        shop_domain: shop,
        store_name: storeName,
        access_token: accessToken,
        scopes,
      });

      if (insertError) {
        console.error("Failed to save store:", insertError);
        return new Response(`Failed to save store credentials: ${insertError.message}`, { status: 500 });
      }
    }

    // Redirect the popup to the Lovable app's callback page.
    // This avoids Supabase's gateway overriding the Content-Type header,
    // which causes HTML to render as raw text in the browser.
    const appCallbackUrl = new URL("https://syncronice.lovable.app/shopify-callback");
    appCallbackUrl.searchParams.set("shop", shop);
    appCallbackUrl.searchParams.set("storeName", storeName);

    return new Response(null, {
      status: 302,
      headers: {
        Location: appCallbackUrl.toString(),
      },
    });
  } catch (err) {
    console.error("shopify-oauth-callback error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(`OAuth callback error: ${msg}`, { status: 500 });
  }
});
