import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find pending jobs that are due
    const now = new Date().toISOString();
    const { data: jobs, error: fetchError } = await supabase
      .from("scheduled_jobs")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", now);

    if (fetchError) throw fetchError;

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No jobs to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;

    for (const job of jobs) {
      // Mark as running
      await supabase
        .from("scheduled_jobs")
        .update({ status: "running" })
        .eq("id", job.id);

      try {
        const params = job.action_params as Record<string, string>;
        const productIds = job.product_ids as string[];

        // Fetch affected products
        const { data: products, error: prodError } = await supabase
          .from("products")
          .select("*")
          .in("id", productIds)
          .eq("user_id", job.user_id);

        if (prodError) throw prodError;

        for (const product of products || []) {
          const updates: Record<string, unknown> = {};

          switch (job.action_type) {
            case "price_percent": {
              const pct = parseFloat(params.percent || "0") / 100;
              const fieldName = params.field === "compareAtPrice" ? "compare_at_price" : "price";
              const current = Number(product[fieldName]) || 0;
              updates[fieldName] = Math.round(current * (1 + pct) * 100) / 100;
              break;
            }
            case "price_set": {
              const fieldName = params.field === "compareAtPrice" ? "compare_at_price" : "price";
              updates[fieldName] = parseFloat(params.price || "0");
              break;
            }
            case "find_replace": {
              const fieldName = params.field || "title";
              const current = String(product[fieldName] || "");
              updates[fieldName] = current.split(params.find || "").join(params.replace || "");
              break;
            }
            case "set_tags": {
              const newTags = (params.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean);
              const currentTags = (product.tags || []) as string[];
              if (params.action === "replace") updates.tags = newTags;
              else if (params.action === "remove") updates.tags = currentTags.filter((t: string) => !newTags.includes(t));
              else updates.tags = [...new Set([...currentTags, ...newTags])];
              break;
            }
          }

          if (Object.keys(updates).length > 0) {
            updates.updated_at = new Date().toISOString();
            await supabase
              .from("products")
              .update(updates)
              .eq("id", product.id);
          }
        }

        // Mark completed
        await supabase
          .from("scheduled_jobs")
          .update({ status: "completed", executed_at: new Date().toISOString() })
          .eq("id", job.id);

        processed++;
      } catch (jobError) {
        console.error(`Job ${job.id} failed:`, jobError);
        await supabase
          .from("scheduled_jobs")
          .update({ status: "failed" })
          .eq("id", job.id);
      }
    }

    return new Response(
      JSON.stringify({ message: "Jobs processed", processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
