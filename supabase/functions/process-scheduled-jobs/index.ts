import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ValidationIssue {
  productId: string;
  field: string;
  message: string;
}

function validateProductUpdate(
  product: Record<string, unknown>,
  updates: Record<string, unknown>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const productId = String(product.id);

  if (updates.price !== undefined) {
    const price = Number(updates.price);
    if (Number.isNaN(price) || price < 0) {
      issues.push({ productId, field: "price", message: `Price would become ${updates.price} (invalid or negative)` });
    }
  }

  if (updates.compare_at_price !== undefined && updates.compare_at_price !== null) {
    const cap = Number(updates.compare_at_price);
    if (Number.isNaN(cap) || cap < 0) {
      issues.push({ productId, field: "compare_at_price", message: `Compare-at price would become ${updates.compare_at_price} (invalid or negative)` });
    }
    const effectivePrice = updates.price !== undefined ? Number(updates.price) : Number(product.price);
    if (!Number.isNaN(cap) && !Number.isNaN(effectivePrice) && effectivePrice >= cap && cap > 0) {
      issues.push({ productId, field: "compare_at_price", message: `Price (${effectivePrice}) >= compare-at price (${cap}), discount won't show` });
    }
  }

  if (updates.seo_title !== undefined) {
    const len = String(updates.seo_title).length;
    if (len > 70) {
      issues.push({ productId, field: "seo_title", message: `SEO title is ${len} chars (max recommended: 60)` });
    }
  }

  if (updates.seo_description !== undefined) {
    const len = String(updates.seo_description).length;
    if (len > 320) {
      issues.push({ productId, field: "seo_description", message: `SEO description is ${len} chars (max recommended: 160)` });
    }
  }

  if (updates.title !== undefined && String(updates.title).trim() === "") {
    issues.push({ productId, field: "title", message: "Title would become empty" });
  }

  if (updates.inventory !== undefined) {
    const inv = Number(updates.inventory);
    if (Number.isNaN(inv) || inv < 0) {
      issues.push({ productId, field: "inventory", message: `Inventory would become ${updates.inventory} (invalid or negative)` });
    }
  }

  return issues;
}

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
    const allValidationIssues: { jobId: string; issues: ValidationIssue[] }[] = [];

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

        const jobIssues: ValidationIssue[] = [];

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
            // Validate before applying
            const issues = validateProductUpdate(product as Record<string, unknown>, updates);
            if (issues.length > 0) {
              jobIssues.push(...issues);
              // Skip products with blocking issues (negative price, empty title)
              const hasBlockingIssue = issues.some(
                (i) =>
                  i.message.includes("negative") ||
                  i.message.includes("invalid") ||
                  i.message.includes("empty")
              );
              if (hasBlockingIssue) {
                console.warn(`Skipping product ${product.id} due to validation: ${issues.map((i) => i.message).join("; ")}`);
                continue;
              }
            }

            updates.updated_at = new Date().toISOString();
            await supabase
              .from("products")
              .update(updates)
              .eq("id", product.id);
          }
        }

        if (jobIssues.length > 0) {
          allValidationIssues.push({ jobId: job.id, issues: jobIssues });
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
      JSON.stringify({ message: "Jobs processed", processed, validationIssues: allValidationIssues }),
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
