import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, RotateCcw, Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ChangeDetail {
  productId: string;
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
}

export function ChangeHistory() {
  const [history, setHistory] = useState<EditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data: entries, error: entriesErr } = await supabase
        .from("edit_history")
        .select("*")
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

      const mapped: EditHistoryEntry[] = entries.map((entry) => {
        const entryChanges = (changes || [])
          .filter((c) => c.edit_history_id === entry.id)
          .map((c) => ({
            productId: c.product_id,
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
        };
      });

      setHistory(mapped);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      toast.error("Failed to load change history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRevert = async (id: string) => {
    const entry = history.find((h) => h.id === id);
    if (!entry) return;

    const { error } = await supabase
      .from("edit_history")
      .update({ reverted: !entry.reverted })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update revert status");
      return;
    }

    setHistory((prev) =>
      prev.map((h) => (h.id === id ? { ...h, reverted: !h.reverted } : h))
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " at " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
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
          <p className="text-xs">Changes you apply will appear here.</p>
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
        {history.map((entry) => (
          <div
            key={entry.id}
            className={`border rounded-lg transition-colors ${
              entry.reverted
                ? "border-border bg-muted/30 opacity-60"
                : "border-border bg-card"
            }`}
          >
            <button
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              className="w-full px-4 py-3 flex items-center gap-3 text-left"
            >
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    {entry.description}
                  </span>
                  {entry.reverted && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-destructive border-destructive/30"
                    >
                      Reverted
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(entry.timestamp)}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.productsAffected} products
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.fieldsChanged.join(", ")}
                  </span>
                </div>
              </div>
              {expandedId === entry.id ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {expandedId === entry.id && (
              <div className="px-4 pb-3 border-t border-border pt-3 ml-7">
                <div className="space-y-1.5 mb-3">
                  {entry.changes.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-16 shrink-0 font-mono truncate">
                        #{c.productId.slice(0, 8)}
                      </span>
                      <span className="text-muted-foreground w-28 shrink-0 capitalize">
                        {c.field.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      <span className="bg-destructive/10 text-destructive line-through px-1.5 py-0.5 rounded">
                        {c.oldValue != null ? String(c.oldValue) : "—"}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="bg-success/10 text-success px-1.5 py-0.5 rounded">
                        {c.newValue != null ? String(c.newValue) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
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
                  {entry.reverted ? (
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
        ))}
      </div>
    </div>
  );
}
