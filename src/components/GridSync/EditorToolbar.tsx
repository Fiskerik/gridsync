import { useState } from "react";
import { Search, Columns3, ChevronDown, Eye, EyeOff, Filter, RefreshCw, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ShopifyStore } from "@/hooks/useSupabaseProducts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ColumnKey = "image" | "title" | "sku" | "price" | "compareAtPrice" | "inventory" | "status" | "vendor" | "category" | "tags" | "seoTitle" | "description" | "productType" | "variants";

export const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "image", label: "Image" },
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "sku", label: "SKU" },
  { key: "price", label: "Price" },
  { key: "compareAtPrice", label: "Compare at" },
  { key: "inventory", label: "Inventory" },
  { key: "status", label: "Status" },
  { key: "vendor", label: "Vendor" },
  { key: "category", label: "Category" },
  { key: "tags", label: "Tags" },
  { key: "seoTitle", label: "SEO Title" },
  { key: "productType", label: "Type" },
  { key: "variants", label: "Variants" },
];

export const DEFAULT_VISIBLE: ColumnKey[] = ["image", "title", "sku", "price", "compareAtPrice", "inventory", "status", "vendor", "category"];

interface EditorToolbarProps {
  productCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  visibleColumns: ColumnKey[];
  onColumnsChange: (cols: ColumnKey[]) => void;
  showBefore: boolean;
  onShowBeforeChange: (v: boolean) => void;
  hasChanges: boolean;
  onOpenFilters?: () => void;
  stores?: ShopifyStore[];
  onSyncStores?: (storeIds: string[]) => Promise<void>;
}

export function EditorToolbar({
  productCount,
  searchQuery,
  onSearchChange,
  visibleColumns,
  onColumnsChange,
  showBefore,
  onShowBeforeChange,
  hasChanges,
  onOpenFilters,
  stores = [],
  onSyncStores,
}: EditorToolbarProps) {
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncSelectedIds, setSyncSelectedIds] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);

  const toggleColumn = (key: ColumnKey) => {
    if (visibleColumns.includes(key)) {
      if (visibleColumns.length > 1) onColumnsChange(visibleColumns.filter((c) => c !== key));
    } else {
      onColumnsChange([...visibleColumns, key]);
    }
  };

  const openSyncDialog = () => {
    setSyncSelectedIds(new Set(stores.map((s) => s.id)));
    setSyncDialogOpen(true);
  };

  const handleSync = async () => {
    if (syncSelectedIds.size === 0 || !onSyncStores) return;
    setSyncing(true);
    try {
      await onSyncStores(Array.from(syncSelectedIds));
    } finally {
      setSyncing(false);
      setSyncDialogOpen(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 border-b border-border">
        <div className="relative flex-1 min-w-[140px] max-w-full md:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-card border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {onOpenFilters && (
            <button
              onClick={onOpenFilters}
              className="md:hidden flex items-center gap-1 px-2 py-1.5 text-xs border border-input rounded-md text-foreground hover:bg-secondary transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
            </button>
          )}
          {stores.length > 0 && onSyncStores && (
            <Button
              variant="outline"
              size="sm"
              onClick={openSyncDialog}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
          {hasChanges && (
            <button
              onClick={() => onShowBeforeChange(!showBefore)}
              className={`flex items-center gap-1 px-2 md:px-3 py-1.5 text-xs md:text-sm border rounded-md transition-colors ${
                showBefore
                  ? "border-changed bg-changed-background text-changed"
                  : "border-input text-foreground hover:bg-secondary"
              }`}
            >
              {showBefore ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{showBefore ? "Before" : "After"}</span>
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 px-2 md:px-3 py-1.5 text-xs md:text-sm border border-input rounded-md text-foreground hover:bg-secondary transition-colors">
                <Columns3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Columns</span>
                <span className="text-muted-foreground text-xs">{visibleColumns.length}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {ALL_COLUMNS.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleColumns.includes(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
          {productCount} products
        </span>
      </div>

      {/* Sync Store Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Refresh from Shopify
            </DialogTitle>
            <DialogDescription>
              Select which stores to sync. This will pull the latest product data from Shopify.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {stores.map((store) => {
              const isSelected = syncSelectedIds.has(store.id);
              return (
                <button
                  key={store.id}
                  onClick={() => {
                    const next = new Set(syncSelectedIds);
                    if (isSelected) next.delete(store.id);
                    else next.add(store.id);
                    setSyncSelectedIds(next);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 border border-border rounded-md bg-background hover:bg-muted/50 transition-colors text-left"
                >
                  <span
                    className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-primary border-primary" : "border-input"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{store.store_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{store.shop_domain}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                </button>
              );
            })}
            {stores.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No stores connected. Go to the Import tab to add a store.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSync}
              disabled={syncSelectedIds.size === 0 || syncing}
              className="gap-1.5"
            >
              {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {syncing ? "Syncing..." : `Sync ${syncSelectedIds.size} store${syncSelectedIds.size !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
