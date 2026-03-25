import { useState, useCallback } from "react";
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  ArrowUpFromLine,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/data/mockProducts";
import { toast } from "sonner";

type SyncStatus = "idle" | "syncing" | "pushing" | "done" | "error";

interface ImportExportProps {
  products: Product[];
  changedCells: Map<string, Record<string, unknown>>;
  onImportComplete?: () => void;
  onPushComplete?: () => void;
  importFromShopify: () => Promise<{ success: boolean; imported: number }>;
  pushChangesToShopify: (
    changedCells: Map<string, Record<string, unknown>>
  ) => Promise<{ success: boolean; summary: { total: number; succeeded: number; failed: number } }>;
}

const EXPORTABLE_FIELDS: (keyof Product)[] = [
  "id", "title", "description", "sku", "price", "compareAtPrice",
  "inventory", "status", "vendor", "productType", "tags", "seoTitle", "seoDescription",
];

function productsToCsv(products: Product[]): string {
  const header = EXPORTABLE_FIELDS.join(",");
  const rows = products.map((p) =>
    EXPORTABLE_FIELDS.map((f) => {
      const val = p[f];
      if (Array.isArray(val)) return `"${val.join("; ")}"`;
      if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n")))
        return `"${val.replace(/"/g, '""')}"`;
      return val ?? "";
    }).join(",")
  );
  return [header, ...rows].join("\n");
}

export function ImportExport({
  products,
  changedCells,
  onImportComplete,
  onPushComplete,
  importFromShopify,
  pushChangesToShopify,
}: ImportExportProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncResult, setSyncResult] = useState<string>("");

  const handleImportFromShopify = useCallback(async () => {
    setSyncStatus("syncing");
    setSyncResult("");
    try {
      const result = await importFromShopify();
      setSyncResult(`${result.imported} products imported from Shopify`);
      setSyncStatus("done");
      toast.success(`Imported ${result.imported} products from Shopify`);
      onImportComplete?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setSyncResult(msg);
      setSyncStatus("error");
      toast.error("Import failed", { description: msg });
    }
  }, [importFromShopify, onImportComplete]);

  const handlePushToShopify = useCallback(async () => {
    if (changedCells.size === 0) {
      toast.info("No changes to push");
      return;
    }
    setSyncStatus("pushing");
    setSyncResult("");
    try {
      const result = await pushChangesToShopify(changedCells);
      const { succeeded, failed } = result.summary;
      setSyncResult(`${succeeded} products updated, ${failed} failed`);
      setSyncStatus("done");
      toast.success(`Pushed changes to Shopify`, {
        description: `${succeeded} updated, ${failed} failed`,
      });
      onPushComplete?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Push failed";
      setSyncResult(msg);
      setSyncStatus("error");
      toast.error("Push failed", { description: msg });
    }
  }, [changedCells, pushChangesToShopify, onPushComplete]);

  const handleExportCsv = useCallback(() => {
    const csv = productsToCsv(products);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [products]);

  const stagedChanges = Array.from(changedCells.values()).reduce(
    (acc, c) => acc + Object.keys(c).length,
    0
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground">Shopify Sync</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Import products from your Shopify store, push changes back, or export as CSV.
        </p>
      </div>

      {/* Import from Shopify */}
      <div className="border border-border rounded-lg p-5 mb-6 bg-card">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">Import from Shopify</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pull all products from your Shopify store into the editor. This replaces your current
              product data with fresh data from Shopify.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportFromShopify}
            disabled={syncStatus === "syncing" || syncStatus === "pushing"}
          >
            {syncStatus === "syncing" ? (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5" />
            )}
            {syncStatus === "syncing" ? "Importing..." : "Import Products"}
          </Button>
        </div>
      </div>

      {/* Push to Shopify */}
      <div className="border border-border rounded-lg p-5 mb-6 bg-card">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <ArrowUpFromLine className="w-5 h-5 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">Push Changes to Shopify</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send your staged edits back to Shopify. Only changed fields will be updated.
            </p>
            {stagedChanges > 0 && (
              <Badge variant="secondary" className="mt-1.5 text-[10px]">
                {stagedChanges} pending changes across {changedCells.size} products
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            onClick={handlePushToShopify}
            disabled={
              syncStatus === "syncing" ||
              syncStatus === "pushing" ||
              changedCells.size === 0
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {syncStatus === "pushing" ? (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 mr-1.5" />
            )}
            {syncStatus === "pushing" ? "Pushing..." : "Push to Shopify"}
          </Button>
        </div>
      </div>

      {/* Export CSV */}
      <div className="border border-border rounded-lg p-5 mb-6 bg-card">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">Export as CSV</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Download all {products.length} products as a CSV file.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download CSV
          </Button>
        </div>
      </div>

      {/* Status feedback */}
      {syncStatus === "done" && (
        <div className="border border-border rounded-lg p-5 bg-card">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Sync complete</p>
              <p className="text-xs text-muted-foreground">{syncResult}</p>
            </div>
          </div>
        </div>
      )}

      {syncStatus === "error" && (
        <div className="border border-destructive/20 rounded-lg p-5 bg-destructive/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Sync failed</p>
              <p className="text-xs text-muted-foreground">{syncResult}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
