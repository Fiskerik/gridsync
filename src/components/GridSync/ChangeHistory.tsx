import { mockHistory, EditHistoryEntry } from "@/data/mockProducts";
import { useState } from "react";
import { Clock, RotateCcw, Check, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ChangeHistory() {
  const [history, setHistory] = useState<EditHistoryEntry[]>(mockHistory);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleRevert = (id: string) => {
    setHistory((prev) => prev.map((h) => h.id === id ? { ...h, reverted: !h.reverted } : h));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Change History</h2>
        <p className="text-sm text-muted-foreground mt-1">Full timeline of every edit applied to your store. One-click undo available.</p>
      </div>

      <div className="space-y-3">
        {history.map((entry) => (
          <div key={entry.id} className={`border rounded-lg transition-colors ${entry.reverted ? "border-border bg-muted/30 opacity-60" : "border-border bg-card"}`}>
            <button
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              className="w-full px-4 py-3 flex items-center gap-3 text-left"
            >
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{entry.description}</span>
                  {entry.reverted && (
                    <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">Reverted</Badge>
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
              {expandedId === entry.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>

            {expandedId === entry.id && (
              <div className="px-4 pb-3 border-t border-border pt-3 ml-7">
                <div className="space-y-1.5 mb-3">
                  {entry.changes.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-16 shrink-0 font-mono">#{c.productId}</span>
                      <span className="text-muted-foreground w-28 shrink-0 capitalize">{c.field.replace(/([A-Z])/g, " $1").trim()}</span>
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
                  onClick={(e) => { e.stopPropagation(); handleRevert(entry.id); }}
                  className={entry.reverted ? "text-success border-success/30" : "text-destructive border-destructive/30"}
                >
                  {entry.reverted ? <><Check className="w-3 h-3 mr-1" /> Re-apply</> : <><RotateCcw className="w-3 h-3 mr-1" /> Revert this edit</>}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
