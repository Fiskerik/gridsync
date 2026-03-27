import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, RotateCcw, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChangeDetail {
  productId: string;
  productTitle?: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: ChangeDetail[];
  reverted: boolean;
  onRevert: (selectedProductIds: string[]) => void;
  isActioning: boolean;
}

export function RevertPreviewModal({ open, onOpenChange, changes, reverted, onRevert, isActioning }: Props) {
  const grouped = groupChangesByProduct(changes);
  const productIds = Array.from(grouped.keys());
  const [selected, setSelected] = useState<Set<string>>(new Set(productIds));
  const [previewProductId, setPreviewProductId] = useState<string | null>(null);

  const toggleProduct = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === productIds.length) setSelected(new Set());
    else setSelected(new Set(productIds));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{reverted ? "Re-apply Changes" : "Revert Changes"}</DialogTitle>
          <DialogDescription>
            Select which products to {reverted ? "re-apply" : "revert"}. {productIds.length} product{productIds.length > 1 ? "s" : ""} affected.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={selected.size === productIds.length}
            onCheckedChange={toggleAll}
            id="select-all"
          />
          <label htmlFor="select-all" className="text-xs font-medium text-muted-foreground cursor-pointer">
            Select all ({selected.size}/{productIds.length})
          </label>
        </div>

        <ScrollArea className="flex-1 min-h-0 max-h-[50vh]">
          <div className="space-y-3 pr-3">
            {Array.from(grouped.entries()).map(([productId, productChanges]) => {
              const title = productChanges[0]?.productTitle || `#${productId.slice(0, 8)}`;
              const isSelected = selected.has(productId);
              const isPreviewing = previewProductId === productId;

              return (
                <div
                  key={productId}
                  className={`border rounded-lg p-3 transition-colors ${
                    isSelected ? "border-primary/40 bg-card" : "border-border bg-muted/20 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleProduct(productId)}
                    />
                    <span className="text-sm font-medium text-foreground flex-1">{title}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">#{productId.slice(0, 8)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setPreviewProductId(isPreviewing ? null : productId)}
                      title={isPreviewing ? "Hide preview" : "Preview after revert"}
                    >
                      {isPreviewing ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                  </div>

                  <div className="space-y-1 ml-6">
                    {productChanges.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground w-28 shrink-0 capitalize">
                          {c.field.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        {isPreviewing ? (
                          <PreviewValue value={reverted ? c.newValue : c.oldValue} label="After revert" />
                        ) : (
                          <>
                            <span className="bg-destructive/10 text-destructive line-through px-1.5 py-0.5 rounded truncate max-w-[160px]">
                              {c.oldValue != null ? String(c.oldValue) : "—"}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="bg-green-500/10 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded truncate max-w-[160px]">
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
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isActioning}>
            Cancel
          </Button>
          <Button
            variant={reverted ? "default" : "destructive"}
            disabled={selected.size === 0 || isActioning}
            onClick={() => onRevert(Array.from(selected))}
          >
            {isActioning ? (
              <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing…</>
            ) : (
              <><RotateCcw className="w-3 h-3 mr-1" /> {reverted ? "Re-apply" : "Revert"} {selected.size} product{selected.size !== 1 ? "s" : ""}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewValue({ value, label }: { value: unknown; label: string }) {
  return (
    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded truncate max-w-[240px]" title={label}>
      {value != null ? String(value) : "—"}
    </span>
  );
}

function groupChangesByProduct(changes: ChangeDetail[]) {
  const grouped = new Map<string, ChangeDetail[]>();
  for (const c of changes) {
    const list = grouped.get(c.productId) || [];
    list.push(c);
    grouped.set(c.productId, list);
  }
  return grouped;
}
