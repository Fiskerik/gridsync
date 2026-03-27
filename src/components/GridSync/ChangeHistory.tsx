import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, RotateCcw, Check, ChevronDown, ChevronRight, Loader2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { usePlan, type PlanType } from "@/hooks/usePlan";
import { toast } from "sonner";
import { RevertPreviewModal } from "./RevertPreviewModal";
import type { Json } from "@/integrations/supabase/types";

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
  const [modalEntry, setModalEntry] = useState<EditHistoryEntry | null>(null);
  const [previewProductId, setPreviewProductId] = useState<string | null>(null);
  const [inlineSelected, setInlineSelected] = useState<Map<string, Set<string>>>(new Map());
  const { plan } = usePlan();

  const retentionDays = HISTORY_RETENTION_DAYS[plan] ?? 7;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setHistory([]); return; }

      const retentionCutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

      const { data: entries, error: entriesErr } = await supabase
        .from("edit_history")
        .select("*")
        .gte("created_at", retentionCutoff)
        .order("created_at", { ascending: false });

      if (entriesErr) throw entriesErr;
      if (!entries || entries.length === 0) { setHistory([]); return; }

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
        if (productRows) productTitleMap = new Map(productRows.map((p) => [p.id, p.title]));
      }

      const mapped: EditHistoryEntry[] = entries.map((entry) => {
        const entryChanges = (changes || [])
          .filter((c) => c.edit_history_id === entry.id)
          .map((c) => ({
            productId: c.product_id,
            productTitle: productTitleMap.get(c.product_id) || `Product #${c.product_id.slice(0, 8)}`,
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

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const getProductIdsFromEntry = (entry: EditHistoryEntry) =>
    [...new Set(entry.changes.map((c) => c.productId))];

  const getInlineSelected = (entryId: string, allProductIds: string[]) => {
    const sel = inlineSelected.get(entryId);
    return sel ?? new Set(allProductIds);
  };

  const toggleInlineProduct = (entryId: string, productId: string, allProductIds: string[]) => {
    setInlineSelected((prev) => {
      const next = new Map(prev);
      const current = next.get(entryId) ?? new Set(allProductIds);
      const updated = new Set(current);
      if (updated.has(productId)) updated.delete(productId);
      else updated.add(productId);
      next.set(entryId, updated);
      return next;
    });
  };

  const toggleInlineAll = (entryId: string, allProductIds: string[]) => {
    setInlineSelected((prev) => {
      const next = new Map(prev);
      const current = next.get(entryId) ?? new Set(allProductIds);
      if (current.size === allProductIds.length) next.set(entryId, new Set());
      else next.set(entryId, new Set(allProductIds));
      return next;
    });
  };

  const executeRevert = async (entry: EditHistoryEntry, selectedProductIds: string[]) => {
    if (actioningId) return;
    setActioningId(entry.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }

      const filteredChanges = entry.changes.filter((c) => selectedProductIds.includes(c.productId));
      if (filteredChanges.length === 0) { toast.error("No products selected"); return; }

      const { data: productRows, error: productsErr } = await supabase
        .from("products")
        .select("id, shopify_id, store_id")
        .in("id", selectedProductIds);

      if (productsErr || !productRows) throw new Error(productsErr?.message || "Failed to load products");

      const productMap = new Map(productRows.map((p) => [p.id, p]));
      const stagedByProduct = new Map<string, Record<string, unknown>>();

      for (const change of filteredChanges) {
        const value = entry.reverted ? change.newValue : change.oldValue;
        const current = stagedByProduct.get(change.productId) || {};
        current[change.field] = value;
        stagedByProduct.set(change.productId, current);
      }

      const payload = Array.from(stagedByProduct.entries())
        .map(([productId, changes]) => {
          const p = productMap.get(productId);
          if (!p?.shopify_id || !p?.store_id) return null;
          return { productId, shopifyId: p.shopify_id, storeId: p.store_id, changes };
        })
        .filter(Boolean);

      if (payload.length === 0) throw new Error("No Shopify-linked products found");

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
      if (!res.ok || data.error) throw new Error(data.error || `Revert failed: ${res.status}`);

      const results = (data.results || []) as PushResult[];
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        toast.error("Revert partially failed", { description: failed[0]?.error || "Some products failed" });
        return;
      }

      // Update local DB
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

      // If reverting ALL products, mark original as reverted
      const allProductIds = getProductIdsFromEntry(entry);
      const isFullRevert = selectedProductIds.length === allProductIds.length;

      if (isFullRevert) {
        await supabase.from("edit_history").update({ reverted: !entry.reverted }).eq("id", entry.id);
        setHistory((prev) => prev.map((h) => (h.id === entry.id ? { ...h, reverted: !h.reverted } : h)));
      }

      // Log as a new history entry
      const action = entry.reverted ? "Re-applied" : "Reverted";
      const scope = isFullRevert ? "all" : `${selectedProductIds.length} of ${allProductIds.length}`;
      const newDescription = `${action} ${scope} product${selectedProductIds.length > 1 ? "s" : ""} from "${entry.description}"`;

      const normalizeValue = (v: unknown): Json => {
        if (v === null || v === undefined) return null;
        if (typeof v === "number") return Number.isFinite(v) ? v : null;
        if (typeof v === "string" || typeof v === "boolean") return v;
        if (Array.isArray(v)) return v.map(normalizeValue);
        if (typeof v === "object") {
          const obj: Record<string, Json> = {};
          Object.entries(v as Record<string, unknown>).forEach(([k, val]) => { obj[k] = normalizeValue(val); });
          return obj;
        }
        return String(v);
      };

      const { data: newEntry, error: histErr } = await supabase
        .from("edit_history")
        .insert({
          user_id: session.user.id,
          description: newDescription,
          products_affected: selectedProductIds.length,
          fields_changed: [...new Set(filteredChanges.map((c) => c.field))],
        })
        .select("id")
        .single();

      if (!histErr && newEntry) {
        const changeRows = filteredChanges.map((c) => ({
          edit_history_id: newEntry.id,
          product_id: c.productId,
          field: c.field,
          // For revert: old=newValue (current), new=oldValue (restoring to)
          old_value: normalizeValue(entry.reverted ? c.oldValue : c.newValue),
          new_value: normalizeValue(entry.reverted ? c.newValue : c.oldValue),
        }));
        await supabase.from("edit_history_changes").insert(changeRows);
      }

      toast.success(`${action} ${selectedProductIds.length} product${selectedProductIds.length > 1 ? "s" : ""} successfully`);
      setModalEntry(null);
      fetchHistory();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Revert failed";
      toast.error("Failed to revert", { description: msg });
    } finally {
      setActioningId(null);
    }
  };

  const groupChangesByProduct = (changes: ChangeDetail[]) => {
    const grouped = new Map<string, ChangeDetail[]>();
    for (const c of changes) {
      const list = grouped.get(c.productId) || [];
      list.push(c);
      grouped.set(c.productId, list);
    }
    return grouped;
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

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Change History</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Full timeline of every edit applied to your store. One-click undo available.
        </p>
      </div>

      <div className="space-y-3">
        {history.map((entry) => {
          const isExpanded = expandedId === entry.id;
          const grouped = isExpanded ? groupChangesByProduct(entry.changes) : null;
          const allProductIds = getProductIdsFromEntry(entry);
          const productCount = allProductIds.length;
          const showInline = productCount <= 10;

          return (
            <div
              key={entry.id}
              className={`border rounded-lg transition-colors ${
                entry.reverted ? "border-border bg-muted/30 opacity-60" : "border-border bg-card"
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
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">Reverted</Badge>
                    )}
                    {!entry.restorable && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">Snapshot missing</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formatDate(entry.timestamp)}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{entry.productsAffected} product{entry.productsAffected !== 1 ? "s" : ""}</Badge>
                    {entry.fieldsChanged.map((f) => (
                      <span key={f} className="text-xs text-muted-foreground">{f}</span>
                    ))}
                  </div>
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border pt-3 ml-7 space-y-3">
                  {!entry.restorable ? (
                    <p className="text-xs text-muted-foreground">
                      Snapshot details are missing for this event, so this specific edit cannot be restored.
                    </p>
                  ) : showInline ? (
                    <>
                      {/* Select all */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={getInlineSelected(entry.id, allProductIds).size === allProductIds.length}
                          onCheckedChange={() => toggleInlineAll(entry.id, allProductIds)}
                          id={`select-all-${entry.id}`}
                        />
                        <label htmlFor={`select-all-${entry.id}`} className="text-xs text-muted-foreground cursor-pointer">
                          Select all ({getInlineSelected(entry.id, allProductIds).size}/{allProductIds.length})
                        </label>
                      </div>

                      {/* Product list */}
                      {grouped && Array.from(grouped.entries()).map(([productId, productChanges]) => {
                        const title = productChanges[0]?.productTitle || `#${productId.slice(0, 8)}`;
                        const isSelected = getInlineSelected(entry.id, allProductIds).has(productId);
                        const isPreviewing = previewProductId === productId;

                        return (
                          <div key={productId} className={`rounded-md border p-2.5 transition-colors ${isSelected ? "border-primary/30 bg-card" : "border-border bg-muted/20 opacity-50"}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleInlineProduct(entry.id, productId, allProductIds)}
                              />
                              <span className="text-xs font-semibold text-foreground flex-1">{title}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">#{productId.slice(0, 8)}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={(e) => { e.stopPropagation(); setPreviewProductId(isPreviewing ? null : productId); }}
                                title={isPreviewing ? "Hide preview" : "Preview after revert"}
                              >
                                {isPreviewing ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </Button>
                            </div>
                            <div className="space-y-1 ml-6">
                              {productChanges.map((c, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <span className="text-muted-foreground w-28 shrink-0 capitalize">
                                    {c.field.replace(/([A-Z])/g, " $1").trim()}
                                  </span>
                                  {isPreviewing ? (
                                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded truncate max-w-[200px]" title="Value after revert">
                                      {(entry.reverted ? c.newValue : c.oldValue) != null ? String(entry.reverted ? c.newValue : c.oldValue) : "—"}
                                    </span>
                                  ) : (
                                    <>
                                      <span className="bg-destructive/10 text-destructive line-through px-1.5 py-0.5 rounded truncate max-w-[140px]">
                                        {c.oldValue != null ? String(c.oldValue) : "—"}
                                      </span>
                                      <span className="text-muted-foreground">→</span>
                                      <span className="bg-green-500/10 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded truncate max-w-[140px]">
                                        {c.newValue != null ? String(c.newValue) : "—"}
                                      </span>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        {productCount} products affected — open full view to inspect and select.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setModalEntry(entry); }}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" /> View all {productCount} products
                      </Button>
                    </div>
                  )}

                  {/* Revert button */}
                  {entry.restorable && (
                    <div className="pt-1">
                      {showInline ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actioningId === entry.id || getInlineSelected(entry.id, allProductIds).size === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            const sel = getInlineSelected(entry.id, allProductIds);
                            executeRevert(entry, Array.from(sel));
                          }}
                          className={entry.reverted ? "text-green-700 dark:text-green-400 border-green-500/30" : "text-destructive border-destructive/30"}
                        >
                          {actioningId === entry.id ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing…</>
                          ) : entry.reverted ? (
                            <><Check className="w-3 h-3 mr-1" /> Re-apply {getInlineSelected(entry.id, allProductIds).size} product{getInlineSelected(entry.id, allProductIds).size !== 1 ? "s" : ""}</>
                          ) : (
                            <><RotateCcw className="w-3 h-3 mr-1" /> Revert {getInlineSelected(entry.id, allProductIds).size} product{getInlineSelected(entry.id, allProductIds).size !== 1 ? "s" : ""}</>
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setModalEntry(entry); }}
                          className={entry.reverted ? "text-green-700 dark:text-green-400 border-green-500/30" : "text-destructive border-destructive/30"}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> {entry.reverted ? "Re-apply" : "Revert"} — select products
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal for >10 products */}
      {modalEntry && (
        <RevertPreviewModal
          open={!!modalEntry}
          onOpenChange={(open) => { if (!open) setModalEntry(null); }}
          changes={modalEntry.changes}
          reverted={modalEntry.reverted}
          onRevert={(selectedIds) => executeRevert(modalEntry, selectedIds)}
          isActioning={actioningId === modalEntry.id}
        />
      )}
    </div>
  );
}
