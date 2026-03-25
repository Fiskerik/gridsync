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
      // Update existing store with fresh token and scopes
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
      // Insert new store
      const { error: insertError } = await supabaseClient
        .from("shopify_stores")
        .insert({
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

    const escapedStoreName = storeName.replace(/'/g, "\\'").replace(/</g, "&lt;");
    const escapedShop = shop.replace(/'/g, "\\'").replace(/</g, "&lt;");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Store Connected — GridSync</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: hsl(40, 33%, 97%);
      color: hsl(30, 10%, 15%);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: hsl(40, 40%, 99%);
      border: 1px solid hsl(35, 20%, 87%);
      border-radius: 12px;
      padding: 48px 40px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 24px hsl(30, 10%, 15%, 0.06);
    }
    .icon-circle {
      width: 64px; height: 64px;
      background: hsl(152, 50%, 36%, 0.12);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
    }
    .icon-circle svg { width: 32px; height: 32px; color: hsl(152, 50%, 36%); }
    h2 { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
    .shop-name {
      display: inline-block;
      background: hsl(35, 30%, 93%);
      color: hsl(30, 10%, 25%);
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      margin: 12px 0 20px;
    }
    .subtitle {
      font-size: 14px;
      color: hsl(30, 8%, 50%);
      line-height: 1.5;
    }
    .spinner {
      display: inline-block;
      width: 16px; height: 16px;
      border: 2px solid hsl(35, 20%, 87%);
      border-top-color: hsl(152, 44%, 28%);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      vertical-align: middle;
      margin-right: 6px;
    }
    .redirect-note {
      margin-top: 20px;
      font-size: 12px;
      color: hsl(30, 8%, 50%);
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-circle">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h2>Store Connected!</h2>
    <div class="shop-name">${escapedStoreName}</div>
    <p class="subtitle">Your Shopify store has been successfully linked to GridSync. You can now import and manage your products.</p>
    <p class="redirect-note"><span class="spinner"></span>Redirecting back to the app…</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'shopify-oauth-success', shop: '${escapedShop}', storeName: '${escapedStoreName}' }, '*');
      setTimeout(() => window.close(), 2000);
    } else {
      setTimeout(() => { window.location.href = '/'; }, 2500);
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
