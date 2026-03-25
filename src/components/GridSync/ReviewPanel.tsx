import { useMemo, useState } from "react";
import { Product } from "@/data/mockProducts";
import { AlertTriangle, CheckCircle2, XCircle, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReviewPanelProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  changedCells: Map<string, Record<string, unknown>>;
  onApply: () => void;
  onDiscard: () => void;
  onAutoFixChange?: (productId: string, field: string, value: unknown) => void;
}

interface ValidationWarning {
  productId: string;
  productTitle: string;
  field: string;
  message: string;
  severity: "warning" | "error";
  fix?: {
    label: string;
    value: unknown;
  };
}

function getNextValue(product: Product, changes: Record<string, unknown>, field: keyof Product): unknown {
  return changes[field as string] !== undefined ? changes[field as string] : product[field];
}

function getValidationWarnings(products: Product[], changedCells: Map<string, Record<string, unknown>>): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const effectiveSkuByProduct = new Map<string, string>();

  products.forEach((p) => {
    const changes = changedCells.get(p.id) || {};
    const sku = String(changes.sku ?? p.sku ?? "").trim();
    effectiveSkuByProduct.set(p.id, sku);
  });

  changedCells.forEach((changes, productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const nextSeoTitle = changes.seoTitle !== undefined ? String(changes.seoTitle) : product.seoTitle;
    if (nextSeoTitle.length > 60) {
      warnings.push({
        productId,
        productTitle: product.title,
        field: "SEO Title",
        message: `SEO title is ${nextSeoTitle.length} chars (recommended: ≤60)`,
        severity: "warning",
        fix: { label: "Trim to 60", value: nextSeoTitle.slice(0, 60) },
      });
    }

    const nextSeoDescription = changes.seoDescription !== undefined ? String(changes.seoDescription) : product.seoDescription;
    if (nextSeoDescription.length > 160) {
      warnings.push({
        productId,
        productTitle: product.title,
        field: "SEO Description",
        message: `SEO description is ${nextSeoDescription.length} chars (recommended: ≤160)`,
        severity: "warning",
        fix: { label: "Trim to 160", value: nextSeoDescription.slice(0, 160) },
      });
    }

    if (changes.price !== undefined) {
      const price = Number(changes.price);
      if (Number.isNaN(price)) {
        warnings.push({ productId, productTitle: product.title, field: "Price", message: "Price format is invalid", severity: "error" });
      } else {
        if (price <= 0) {
          warnings.push({ productId, productTitle: product.title, field: "Price", message: "Price is $0 or negative", severity: "error", fix: { label: "Set to $0.01", value: 0.01 } });
        }
        const compareAt = changes.compareAtPrice !== undefined ? Number(changes.compareAtPrice) : product.compareAtPrice;
        if (compareAt && price >= compareAt) {
          warnings.push({ productId, productTitle: product.title, field: "Price", message: "Price is ≥ compare-at price (discount will not show)", severity: "warning" });
        }
      }
    }

    if (changes.inventory !== undefined) {
      const inventory = Number(changes.inventory);
      if (Number.isNaN(inventory) || inventory < 0) {
        warnings.push({ productId, productTitle: product.title, field: "Inventory", message: "Inventory must be a non-negative number", severity: "error", fix: { label: "Set to 0", value: 0 } });
      }
    }

    if (changes.imageUrl !== undefined && String(changes.imageUrl).trim() === "" && product.imageUrl) {
      warnings.push({ productId, productTitle: product.title, field: "Image", message: "Image will be cleared", severity: "warning" });
    }

    if (changes.title !== undefined && String(changes.title).trim() === "") {
      warnings.push({ productId, productTitle: product.title, field: "Title", message: "Product title is empty", severity: "error" });
    }

    if (changes.sku !== undefined) {
      const nextSku = String(changes.sku ?? "").trim();
      if (nextSku) {
        const duplicate = Array.from(effectiveSkuByProduct.entries()).find(
          ([id, sku]) => id !== productId && sku === nextSku
        );
        if (duplicate) {
          warnings.push({ productId, productTitle: product.title, field: "SKU", message: `SKU conflicts with another product (${nextSku})`, severity: "error" });
        }
      }
    }
  });

  return warnings;
}

function PreviewCard({ product, changes }: { product: Product; changes: Record<string, unknown> }) {
  const beforePrice = product.price;
  const afterPrice = Number(getNextValue(product, changes, "price") || 0);
  const beforeTitle = String(product.title || "");
  const afterTitle = String(getNextValue(product, changes, "title") || "");
  const beforeDescription = String(product.description || "");
  const afterDescription = String(getNextValue(product, changes, "description") || "");
  const beforeImage = String(product.imageUrl || "");
  const afterImage = String(getNextValue(product, changes, "imageUrl") || "");

  const changed = {
    title: beforeTitle !== afterTitle,
    price: beforePrice !== afterPrice,
    description: beforeDescription !== afterDescription,
    image: beforeImage !== afterImage,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border border-border rounded-lg p-3">
      <div className="border border-border rounded-md p-2 bg-muted/20">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Before</p>
        <img src={beforeImage || ""} alt={beforeTitle} className="w-full h-24 object-cover rounded bg-muted mb-2" />
        <p className="text-xs font-semibold text-foreground truncate">{beforeTitle || "Untitled"}</p>
        <p className="text-xs text-foreground">${beforePrice.toFixed(2)}</p>
        <p className="text-[11px] text-muted-foreground line-clamp-2">{beforeDescription || "No description"}</p>
      </div>
      <div className="border border-border rounded-md p-2 bg-muted/20">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">After</p>
        <img src={afterImage || ""} alt={afterTitle} className={cn("w-full h-24 object-cover rounded mb-2 bg-muted", changed.image && "ring-1 ring-success")} />
        <p className={cn("text-xs font-semibold truncate", changed.title ? "text-success bg-success/10 px-1 rounded" : "text-foreground")}>{afterTitle || "Untitled"}</p>
        <p className={cn("text-xs", changed.price ? "text-success bg-success/10 inline-block px-1 rounded" : "text-foreground")}>${Number.isFinite(afterPrice) ? afterPrice.toFixed(2) : "0.00"}</p>
        <p className={cn("text-[11px] line-clamp-2", changed.description ? "text-success bg-success/10 px-1 rounded" : "text-muted-foreground")}>{afterDescription || "No description"}</p>
      </div>
    </div>
  );
}

export function ReviewPanel({ open, onClose, products, changedCells, onApply, onDiscard, onAutoFixChange }: ReviewPanelProps) {
  const [simulated, setSimulated] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [selectedDiffProductId, setSelectedDiffProductId] = useState<string | null>(null);

  const warnings = useMemo(() => getValidationWarnings(products, changedCells), [products, changedCells]);
  if (!open) return null;

  const errors = warnings.filter((w) => w.severity === "error");
  const changedCount = changedCells.size;
  const totalFields = Array.from(changedCells.values()).reduce((acc, c) => acc + Object.keys(c).length, 0);
  const changedProductIds = Array.from(changedCells.keys());

  // Show preview for the selected diff product, or first one by default
  const previewProductId = selectedDiffProductId && changedCells.has(selectedDiffProductId)
    ? selectedDiffProductId
    : changedProductIds[0] || null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-full md:max-w-xl bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Review & Apply</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            You're about to update <strong className="text-foreground">{changedCount}</strong> products across <strong className="text-foreground">{totalFields}</strong> fields.
          </p>
        </div>

        <div className="px-5 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-foreground">Dry-run simulation</p>
              <p className="text-[11px] text-muted-foreground">Preview impact without applying changes to Shopify</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setSimulating(true);
                await new Promise((r) => setTimeout(r, 500));
                setSimulating(false);
                setSimulated(true);
              }}
              disabled={simulating || changedCount === 0}
            >
              {simulating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              {simulating ? "Simulating..." : simulated ? "Simulated" : "Run dry-run"}
            </Button>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              {errors.length > 0 ? <XCircle className="w-4 h-4 text-destructive" /> : <AlertTriangle className="w-4 h-4 text-accent" />}
              <span className="text-sm font-medium text-foreground">
                {errors.length > 0 ? `${errors.length} error(s)` : "No blocking errors"} · {warnings.length - errors.length} warning(s)
              </span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded ${
                    w.severity === "error" ? "bg-destructive/5 text-destructive" : "bg-warning/10 text-accent-foreground"
                  }`}
                >
                  {w.severity === "error" ? <XCircle className="w-3 h-3 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />}
                  <div className="flex-1">
                    <span className="font-medium">{w.productTitle}</span>
                    <span className="text-muted-foreground"> · {w.field}</span>
                    <p>{w.message}</p>
                  </div>
                  {w.fix && onAutoFixChange && (
                    <button
                      onClick={() => onAutoFixChange(w.productId, w.field === "SEO Title" ? "seoTitle" : w.field === "SEO Description" ? "seoDescription" : w.field.toLowerCase(), w.fix!.value)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-background text-foreground hover:bg-muted"
                    >
                      {w.fix.label}
                    </button>
                  )}
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

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {/* Storefront preview - shows only selected product */}
          {previewProductId && (() => {
            const product = products.find((p) => p.id === previewProductId);
            const changes = changedCells.get(previewProductId) || {};
            if (!product) return null;
            return (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Storefront preview
                  {changedCount > 1 && (
                    <span className="text-muted-foreground font-normal ml-1">— click a product below to preview</span>
                  )}
                </h3>
                <PreviewCard product={product} changes={changes} />
              </div>
            );
          })()}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Change diff</h3>
            <div className="space-y-1">
              {changedProductIds.map((productId) => {
                const product = products.find((p) => p.id === productId);
                const changes = changedCells.get(productId) || {};
                if (!product) return null;
                const isSelected = productId === previewProductId;
                return (
                  <div
                    key={productId}
                    onClick={() => setSelectedDiffProductId(productId)}
                    className={cn(
                      "border rounded-lg p-3 cursor-pointer transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", isSelected && "rotate-90 text-primary")} />
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
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center gap-2">
          <Button variant="outline" onClick={onDiscard} disabled={changedCount === 0} className="text-destructive border-destructive/30 hover:bg-destructive/5">
            Discard all
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={onApply}
            disabled={changedCount === 0 || errors.length > 0 || !simulated}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Apply {changedCount} changes
          </Button>
        </div>
      </div>
    </div>
  );
}
