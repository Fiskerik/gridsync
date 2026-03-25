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

    // Decode state to get user info
    let stateData: { userId: string; shop: string; ts: number };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response("Invalid state parameter", { status: 400 });
    }

    // Verify state shop matches callback shop
    if (stateData.shop !== shop) {
      return new Response("Shop mismatch in state", { status: 400 });
    }

    // Check timestamp (expire after 10 minutes)
    if (Date.now() - stateData.ts > 600000) {
      return new Response("OAuth session expired", { status: 400 });
    }

    const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response("Shopify OAuth credentials not configured", { status: 500 });
    }

    // Exchange code for access token
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

    // Get shop info for the store name
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

    // Store in database using service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const { error: upsertError } = await supabaseClient
      .from("shopify_stores")
      .upsert(
        {
          user_id: stateData.userId,
          shop_domain: shop,
          store_name: storeName,
          access_token: accessToken,
          scopes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,shop_domain" }
      );

    if (upsertError) {
      console.error("Failed to save store:", upsertError);
      return new Response(`Failed to save store credentials: ${upsertError.message}`, { status: 500 });
    }

    // Redirect back to the app with success
    const appUrl = Deno.env.get("APP_URL") || url.origin;
    // Use a simple HTML page that posts a message and redirects
    const html = `<!DOCTYPE html>
<html>
<head><title>Connected!</title></head>
<body>
  <h2>Store connected successfully!</h2>
  <p>Redirecting back to the app...</p>
  <script>
    // Try to close popup or redirect
    if (window.opener) {
      window.opener.postMessage({ type: 'shopify-oauth-success', shop: '${shop}', storeName: '${storeName.replace(/'/g, "\\'")}' }, '*');
      window.close();
    } else {
      window.location.href = '/';
    }
  </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("shopify-oauth-callback error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(`OAuth callback error: ${msg}`, { status: 500 });
  }
});
