import { Product } from "@/data/mockProducts";
import { AlertTriangle, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReviewPanelProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  changedCells: Map<string, Record<string, unknown>>;
  onApply: () => void;
  onDiscard: () => void;
}

interface ValidationWarning {
  productId: string;
  productTitle: string;
  field: string;
  message: string;
  severity: "warning" | "error";
}

function getValidationWarnings(products: Product[], changedCells: Map<string, Record<string, unknown>>): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  changedCells.forEach((changes, productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (changes.seoTitle && typeof changes.seoTitle === "string") {
      if ((changes.seoTitle as string).length > 60) {
        warnings.push({ productId, productTitle: product.title, field: "SEO Title", message: `SEO title is ${(changes.seoTitle as string).length} chars (recommended: ≤60)`, severity: "warning" });
      }
      if ((changes.seoTitle as string).length === 0) {
        warnings.push({ productId, productTitle: product.title, field: "SEO Title", message: "SEO title is empty — this may hurt search rankings", severity: "warning" });
      }
    }

    if (changes.price !== undefined) {
      const price = Number(changes.price);
      if (price <= 0) {
        warnings.push({ productId, productTitle: product.title, field: "Price", message: "Price is $0 or negative", severity: "error" });
      }
      if (product.compareAtPrice && price >= product.compareAtPrice) {
        warnings.push({ productId, productTitle: product.title, field: "Price", message: "Price is ≥ compare-at price (no discount visible)", severity: "warning" });
      }
    }

    if (changes.title !== undefined && (changes.title as string).trim() === "") {
      warnings.push({ productId, productTitle: product.title, field: "Title", message: "Product title is empty", severity: "error" });
    }
  });

  return warnings;
}

export function ReviewPanel({ open, onClose, products, changedCells, onApply, onDiscard }: ReviewPanelProps) {
  if (!open) return null;

  const warnings = getValidationWarnings(products, changedCells);
  const errors = warnings.filter((w) => w.severity === "error");
  const changedCount = changedCells.size;
  const totalFields = Array.from(changedCells.values()).reduce((acc, c) => acc + Object.keys(c).length, 0);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-full md:max-w-lg bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Review & Apply</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            You're changing <strong className="text-foreground">{changedCount}</strong> products across{" "}
            <strong className="text-foreground">{totalFields}</strong> fields.
          </p>
        </div>

        {/* Validation */}
        {warnings.length > 0 && (
          <div className="px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              {errors.length > 0 ? (
                <XCircle className="w-4 h-4 text-destructive" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-accent" />
              )}
              <span className="text-sm font-medium text-foreground">
                {errors.length > 0 ? `${errors.length} error(s)` : ""}{" "}
                {warnings.length - errors.length > 0 ? `${warnings.length - errors.length} warning(s)` : ""}
              </span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {warnings.map((w, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded ${
                  w.severity === "error" ? "bg-destructive/5 text-destructive" : "bg-warning/10 text-accent-foreground"
                }`}>
                  {w.severity === "error" ? <XCircle className="w-3 h-3 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />}
                  <div>
                    <span className="font-medium">{w.productTitle}</span>
                    <span className="text-muted-foreground"> · {w.field}</span>
                    <p>{w.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {warnings.length === 0 && changedCount > 0 && (
          <div className="px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">All checks passed — safe to apply</span>
            </div>
          </div>
        )}

        {/* Changes diff */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Changes</h3>
          <div className="space-y-3">
            {Array.from(changedCells.entries()).map(([productId, changes]) => {
              const product = products.find((p) => p.id === productId);
              if (!product) return null;
              return (
                <div key={productId} className="border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{product.title}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{product.sku}</span>
                  </div>
                  <div className="space-y-1.5 ml-5">
                    {Object.entries(changes).map(([field, newValue]) => {
                      const oldValue = (product as unknown as Record<string, unknown>)[field];
                      return (
                        <div key={field} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground w-24 shrink-0 capitalize">{field.replace(/([A-Z])/g, " $1").trim()}</span>
                          <span className="bg-destructive/10 text-destructive line-through px-1.5 py-0.5 rounded truncate max-w-[120px]">
                            {oldValue != null ? String(oldValue) : "—"}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="bg-success/10 text-success px-1.5 py-0.5 rounded truncate max-w-[120px]">
                            {newValue != null ? String(newValue) : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {changedCount === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No changes to review</p>
              <p className="text-xs mt-1">Edit cells in the table to stage changes</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center gap-2">
          <Button variant="outline" onClick={onDiscard} disabled={changedCount === 0} className="text-destructive border-destructive/30 hover:bg-destructive/5">
            Discard all
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onApply} disabled={changedCount === 0 || errors.length > 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90">
            Apply {changedCount} changes
          </Button>
        </div>
      </div>
    </div>
  );
}
