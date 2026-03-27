import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, RotateCcw, Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlan, type PlanType } from "@/hooks/usePlan";
import { toast } from "sonner";

interface ChangeDetail {
  productId: string;
  productTitle?: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

interface EditHistoryEntry {
  id: string;
  timestamp: string;
  description: string;
  productsAffected: number;
  fieldsChanged: string[];
  changes: ChangeDetail[];
  reverted: boolean;
  restorable: boolean;
}

interface PushResult {
  productId: string;
  shopifyId: string;
  success: boolean;
  error?: string;
}

const FIELD_TO_DB_COLUMN: Record<string, string> = {
  title: "title",
  description: "description",
  sku: "sku",
  price: "price",
  compareAtPrice: "compare_at_price",
  inventory: "inventory",
  status: "status",
  vendor: "vendor",
  productType: "product_type",
  tags: "tags",
  seoTitle: "seo_title",
  seoDescription: "seo_description",
  imageUrl: "image_url",
};

const HISTORY_RETENTION_DAYS: Record<PlanType, number> = {
  free: 7,
  starter: 30,
  growth: 180,
};

export function ChangeHistory() {
  const [history, setHistory] = useState<EditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const { plan } = usePlan();

  const retentionDays = HISTORY_RETENTION_DAYS[plan] ?? 7;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setHistory([]);
        return;
      }

      const retentionCutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

      const { data: entries, error: entriesErr } = await supabase
        .from("edit_history")
        .select("*")
        .gte("created_at", retentionCutoff)
        .order("created_at", { ascending: false });

      if (entriesErr) throw entriesErr;
      if (!entries || entries.length === 0) {
        setHistory([]);
        return;
      }

      const entryIds = entries.map((e) => e.id);
      const { data: changes, error: changesErr } = await supabase
        .from("edit_history_changes")
        .select("*")
        .in("edit_history_id", entryIds);

      if (changesErr) throw changesErr;

      const allProductIds = [...new Set((changes || []).map((c) => c.product_id))];
      let productTitleMap = new Map<string, string>();

      if (allProductIds.length > 0) {
        const { data: productRows } = await supabase
          .from("products")
          .select("id, title")
          .in("id", allProductIds);

        if (productRows) {
          productTitleMap = new Map(productRows.map((p) => [p.id, p.title]));
        }
      }

      const mapped: EditHistoryEntry[] = entries.map((entry) => {
        const entryChanges = (changes || [])
          .filter((c) => c.edit_history_id === entry.id)
          .map((c) => ({
            productId: c.product_id,
            productTitle: productTitleMap.get(c.product_id) || `#${c.product_id.slice(0, 8)}`,
            field: c.field,
            oldValue: c.old_value,
            newValue: c.new_value,
          }));

        return {
          id: entry.id,
          timestamp: entry.created_at,
          description: entry.description,
          productsAffected: entry.products_affected,
          fieldsChanged: entry.fields_changed,
          changes: entryChanges,
          reverted: entry.reverted,
          restorable: entryChanges.length > 0,
        };
      });

      const seen = new Set<string>();
      const deduped = mapped.filter((entry) => {
        const signature = `${entry.timestamp}|${entry.description}|${entry.productsAffected}|${entry.fieldsChanged.join(",")}`;
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
      });

      setHistory(deduped);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      toast.error("Failed to load change history");
    } finally {
      setLoading(false);
    }
  }, [retentionDays]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " at " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  };

  const handleRevert = async (id: string) => {
    const entry = history.find((h) => h.id === id);
    if (!entry || actioningId) return;

    if (!entry.restorable) {
      toast.error("This history event has no snapshot details, so it can't be restored");
      return;
    }

    setActioningId(id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const productIds = [...new Set(entry.changes.map((c) => c.productId))];
      if (productIds.length === 0) {
        toast.error("No products found for this history event");
        return;
      }

      const { data: productRows, error: productsErr } = await supabase
        .from("products")
        .select("id, shopify_id, store_id")
        .in("id", productIds);

      if (productsErr || !productRows) {
        throw new Error(productsErr?.message || "Failed to load products for revert");
      }

      const productMap = new Map(productRows.map((p) => [p.id, p]));
      const stagedByProduct = new Map<string, Record<string, unknown>>();

      for (const change of entry.changes) {
        const value = entry.reverted ? change.newValue : change.oldValue;
        const current = stagedByProduct.get(change.productId) || {};
        current[change.field] = value;
        stagedByProduct.set(change.productId, current);
      }

      const payload = Array.from(stagedByProduct.entries())
        .map(([productId, changes]) => {
          const p = productMap.get(productId);
          if (!p?.shopify_id || !p?.store_id) return null;
          return {
            productId,
            shopifyId: p.shopify_id,
            storeId: p.store_id,
            changes,
          };
        })
        .filter(Boolean);

      if (payload.length === 0) {
        throw new Error("No Shopify-linked products found for this history event");
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/push-shopify-changes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ changes: payload }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Revert failed: ${res.status}`);
      }

      const results = (data.results || []) as PushResult[];
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        const firstError = failed[0]?.error || "Some products failed to update";
        toast.error("Revert partially failed", { description: firstError });
        return;
      }

      for (const [productId, fields] of stagedByProduct.entries()) {
        const dbUpdate: Record<string, unknown> = {};
        Object.entries(fields).forEach(([field, value]) => {
          const dbCol = FIELD_TO_DB_COLUMN[field];
          if (dbCol) dbUpdate[dbCol] = value;
        });
        if (Object.keys(dbUpdate).length > 0) {
          await supabase.from("products").update(dbUpdate).eq("id", productId);
        }
      }

      const { error } = await supabase
        .from("edit_history")
        .update({ reverted: !entry.reverted })
        .eq("id", id);

      if (error) {
        toast.error("Updated products, but failed to update history status");
        return;
      }

      setHistory((prev) => prev.map((h) => (h.id === id ? { ...h, reverted: !h.reverted } : h)));
      toast.success(entry.reverted ? "Edit reapplied successfully" : "Edit reverted successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Revert failed";
      toast.error("Failed to revert edit", { description: msg });
    } finally {
      setActioningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading history…</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground mb-1">No edit history yet</p>
          <p className="text-xs">Changes you apply will appear here for {retentionDays} days on your current plan.</p>
        </div>
      </div>
    );
  }

  const groupChangesByProduct = (changes: ChangeDetail[]) => {
    const grouped = new Map<string, ChangeDetail[]>();
    for (const c of changes) {
      const list = grouped.get(c.productId) || [];
      list.push(c);
      grouped.set(c.productId, list);
    }
    return grouped;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Change History</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Snapshots are stored in Supabase and kept for {retentionDays} days on your current plan.
        </p>
      </div>

      <div className="space-y-3">
        {history.map((entry) => {
          const isExpanded = expandedId === entry.id;
          const grouped = isExpanded ? groupChangesByProduct(entry.changes) : null;

          return (
            <div
              key={entry.id}
              className={`border rounded-lg transition-colors ${
                entry.reverted
                  ? "border-border bg-muted/30 opacity-60"
                  : "border-border bg-card"
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left"
              >
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{entry.description}</span>
                    {entry.reverted && (
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                        Reverted
                      </Badge>
                    )}
                    {!entry.restorable && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                        Snapshot missing
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formatDate(entry.timestamp)}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{entry.productsAffected} products</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{entry.fieldsChanged.join(", ")}</span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {isExpanded && grouped && (
                <div className="px-4 pb-3 border-t border-border pt-3 ml-7 space-y-4">
                  {entry.restorable ? (
                    Array.from(grouped.entries()).map(([productId, productChanges]) => {
                      const productTitle = productChanges[0]?.productTitle || `#${productId.slice(0, 8)}`;
                      return (
                        <div key={productId}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-semibold text-foreground">{productTitle}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">#{productId.slice(0, 8)}</span>
                          </div>
                          <div className="space-y-1 ml-2">
                            {productChanges.map((c, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground w-28 shrink-0 capitalize">
                                  {c.field.replace(/([A-Z])/g, " $1").trim()}
                                </span>
                                <span className="bg-destructive/10 text-destructive line-through px-1.5 py-0.5 rounded truncate max-w-[160px]">
                                  {c.oldValue != null ? String(c.oldValue) : "—"}
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span className="bg-success/10 text-success px-1.5 py-0.5 rounded truncate max-w-[160px]">
                                  {c.newValue != null ? String(c.newValue) : "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Snapshot details are missing for this event, so this specific edit cannot be restored.
                    </p>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actioningId === entry.id || !entry.restorable}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRevert(entry.id);
                    }}
                    className={
                      entry.reverted
                        ? "text-success border-success/30"
                        : "text-destructive border-destructive/30"
                    }
                  >
                    {actioningId === entry.id ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing...
                      </>
                    ) : !entry.restorable ? (
                      <>Not restorable</>
                    ) : entry.reverted ? (
                      <>
                        <Check className="w-3 h-3 mr-1" /> Re-apply
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3 h-3 mr-1" /> Revert this edit
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
