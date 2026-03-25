import { useState, useCallback, useEffect } from "react";
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowUpFromLine,
  Store,
  Plus,
  Trash2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/data/mockProducts";
import { ShopifyStore, ShopifyPushResult } from "@/hooks/useSupabaseProducts";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SyncStatus = "idle" | "syncing" | "pushing" | "done" | "error";

interface ImportExportProps {
  products: Product[];
  changedCells: Map<string, Record<string, unknown>>;
  stores: ShopifyStore[];
  onImportComplete?: () => void;
  onPushComplete?: () => void;
  importFromShopify: (storeId: string) => Promise<{ success: boolean; imported: number }>;
  pushChangesToShopify: (
    changedCells: Map<string, Record<string, unknown>>
  ) => Promise<{
    success: boolean;
    summary: { total: number; succeeded: number; failed: number };
    results: ShopifyPushResult[];
  }>;
  connectStore: (shopDomain: string) => Promise<string | null>;
  disconnectStore: (storeId: string) => Promise<void>;
  onStoreConnected?: () => void;
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
      if (Array.isArray(val)) return `"${val.join("\t")}"`;
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
  stores,
  onImportComplete,
  onPushComplete,
  importFromShopify,
  pushChangesToShopify,
  connectStore,
  disconnectStore,
  onStoreConnected,
}: ImportExportProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncResult, setSyncResult] = useState("");
  const [syncingStoreId, setSyncingStoreId] = useState<string | null>(null);
  const [showAddStore, setShowAddStore] = useState(false);
  const [newShopDomain, setNewShopDomain] = useState("");
  const [connecting, setConnecting] = useState(false);

  // Delete confirmation state
  const [deleteConfirmStore, setDeleteConfirmStore] = useState<ShopifyStore | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  // Reset sync status when changed cells change so push button isn't stuck
  useEffect(() => {
    setSyncStatus((prev) => (prev === "done" || prev === "error") ? "idle" : prev);
  }, [changedCells]);

  const handleConnectStore = useCallback(async () => {
    if (!newShopDomain.trim()) {
      toast.error("Please enter a shop domain");
      return;
    }
    setConnecting(true);
    try {
      const authUrl = await connectStore(newShopDomain.trim());
      if (authUrl) {
        const popup = window.open(authUrl, "shopify-oauth", "width=600,height=700,scrollbars=yes");
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === "shopify-oauth-success") {
            window.removeEventListener("message", handleMessage);
            toast.success(`Connected to ${event.data.storeName || event.data.shop}`);
            setShowAddStore(false);
            setNewShopDomain("");
            onStoreConnected?.();
          }
        };
        window.addEventListener("message", handleMessage);
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener("message", handleMessage);
            setConnecting(false);
            onStoreConnected?.();
          }
        }, 1000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      toast.error("Failed to connect store", { description: msg });
    } finally {
      setConnecting(false);
    }
  }, [newShopDomain, connectStore, onStoreConnected]);

  const handleDeleteStore = useCallback(async () => {
    if (!deleteConfirmStore) return;
    await disconnectStore(deleteConfirmStore.id);
    setDeleteConfirmStore(null);
    setDeleteConfirmInput("");
  }, [deleteConfirmStore, disconnectStore]);

  const handleImportFromShopify = useCallback(async (storeId: string) => {
    setSyncStatus("syncing");
    setSyncResult("");
    setSyncingStoreId(storeId);
    try {
      const result = await importFromShopify(storeId);
      setSyncResult(`${result.imported} products imported`);
      setSyncStatus("done");
      toast.success(`Imported ${result.imported} products`);
      onImportComplete?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setSyncResult(msg);
      setSyncStatus("error");
      toast.error("Import failed", { description: msg });
    } finally {
      setSyncingStoreId(null);
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
      const { succeeded, failed, total } = result.summary;
      const firstError = result.results.find((r) => !r.success)?.error;

      if (succeeded === 0 && failed > 0) {
        setSyncStatus("error");
        setSyncResult(firstError || `${failed}/${total} products failed to update`);
        toast.error("Push failed", { description: firstError || `All ${failed} products failed to update` });
        return;
      }

      if (failed > 0) {
        setSyncStatus("done");
        setSyncResult(`${succeeded} products updated, ${failed} failed${firstError ? ` · ${firstError}` : ""}`);
        toast.warning("Push partially completed", { description: `${succeeded} updated, ${failed} failed` });
      } else {
        setSyncStatus("done");
        setSyncResult(`${succeeded} products updated`);
        toast.success("Pushed changes to Shopify", { description: `${succeeded} products updated successfully` });
      }

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

  const pushDisabled = syncStatus === "syncing" || syncStatus === "pushing" || changedCells.size === 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground">Shopify Stores & Sync</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your connected Shopify stores, import products, and push changes.
        </p>
      </div>

      {/* Connected Stores */}
      <div className="border border-border rounded-lg p-5 mb-6 bg-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Connected Stores</h3>
              <p className="text-xs text-muted-foreground">
                {stores.length} store{stores.length !== 1 ? "s" : ""} connected
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAddStore(!showAddStore)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Store
          </Button>
        </div>

        {showAddStore && (
          <div className="border border-dashed border-border rounded-lg p-4 mb-4 bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">
              Enter your Shopify store domain (e.g., <code className="text-foreground">my-store</code> or <code className="text-foreground">my-store.myshopify.com</code>)
            </p>
            <div className="flex gap-2">
              <input
                value={newShopDomain}
                onChange={(e) => setNewShopDomain(e.target.value)}
                placeholder="my-store.myshopify.com"
                className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                onKeyDown={(e) => e.key === "Enter" && handleConnectStore()}
              />
              <Button size="sm" onClick={handleConnectStore} disabled={connecting || !newShopDomain.trim()}>
                {connecting ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5 mr-1.5" />}
                {connecting ? "Connecting..." : "Connect via OAuth"}
              </Button>
            </div>
          </div>
        )}

        {stores.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No stores connected yet. Click "Add Store" to connect your first Shopify store.
          </p>
        ) : (
          <div className="space-y-2">
            {stores.map((store) => (
              <div key={store.id} className="flex items-center gap-3 px-3 py-2.5 border border-border rounded-md bg-background">
                <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{store.store_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{store.shop_domain}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleImportFromShopify(store.id)}
                    disabled={syncStatus === "syncing" || syncStatus === "pushing"}
                  >
                    {syncingStoreId === store.id ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
                    Sync
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setDeleteConfirmStore(store);
                      setDeleteConfirmInput("");
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
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
            {stagedChanges > 0 ? (
              <Badge variant="secondary" className="mt-1.5 text-[10px]">
                {stagedChanges} pending changes across {changedCells.size} products
              </Badge>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1.5 italic">
                No changes staged. Edit products in the Bulk Editor tab first.
              </p>
            )}
          </div>
          <Button
            size="sm"
            onClick={handlePushToShopify}
            disabled={pushDisabled}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {syncStatus === "pushing" ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
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

      {/* Delete Store Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmStore} onOpenChange={(open) => { if (!open) { setDeleteConfirmStore(null); setDeleteConfirmInput(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Disconnect Store
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will permanently disconnect <strong className="text-foreground">{deleteConfirmStore?.store_name}</strong> and remove all its synced products from GridSync.
                </p>
                <p>
                  To confirm, type the store name below:
                </p>
                <div className="px-3 py-2 bg-muted rounded-md text-sm font-mono text-foreground text-center">
                  {deleteConfirmStore?.store_name}
                </div>
                <input
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  placeholder="Type store name to confirm..."
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-destructive"
                  autoFocus
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStore}
              disabled={deleteConfirmInput !== deleteConfirmStore?.store_name}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Disconnect Store
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
