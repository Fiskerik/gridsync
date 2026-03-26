import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain",
};

async function verifyHmac(
  body: string,
  hmacHeader: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return computed === hmacHeader;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
  if (!clientSecret) {
    console.error("SHOPIFY_CLIENT_SECRET not configured");
    return new Response("Server misconfigured", { status: 500 });
  }

  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256") || "";

  const valid = await verifyHmac(rawBody, hmac, clientSecret);
  if (!valid) {
    console.warn("Invalid HMAC signature");
    return new Response("Unauthorized", { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic") || "";
  const shopDomain = req.headers.get("x-shopify-shop-domain") || "";

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Compliance webhook received: ${topic} from ${shopDomain}`);

  try {
    switch (topic) {
      case "customers/data_request": {
        // Shopify asks what customer data we store.
        // We store products linked to stores, not direct customer PII.
        // Respond with acknowledgement — no customer PII to return.
        console.log(
          `customers/data_request for shop ${shopDomain}, customer ${
            (payload as { customer?: { id?: number } }).customer?.id
          }`
        );
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "customers/redact": {
        // Delete any customer-specific data we might hold.
        // Our app stores products by store/user, not by end-customer,
        // so there's nothing to redact. Acknowledge receipt.
        console.log(
          `customers/redact for shop ${shopDomain}, customer ${
            (payload as { customer?: { id?: number } }).customer?.id
          }`
        );
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "shop/redact": {
        // Merchant uninstalled or requested data deletion.
        // Remove all data associated with this shop.
        console.log(`shop/redact for shop ${shopDomain} — deleting store data`);

        // Find the store(s) matching this domain
        const { data: stores } = await supabase
          .from("shopify_stores")
          .select("id, user_id")
          .eq("shop_domain", shopDomain);

        if (stores && stores.length > 0) {
          for (const store of stores) {
            // Delete products linked to this store
            await supabase
              .from("products")
              .delete()
              .eq("store_id", store.id);

            // Delete the store record itself
            await supabase
              .from("shopify_stores")
              .delete()
              .eq("id", store.id);

            console.log(`Deleted store ${store.id} and its products for ${shopDomain}`);
          }
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default: {
        console.warn(`Unknown compliance topic: ${topic}`);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  } catch (err) {
    console.error(`Error handling ${topic}:`, err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
