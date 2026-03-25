import { useState, useCallback, useMemo } from "react";
import { Product } from "@/data/mockProducts";
import { TabNav, TabId } from "@/components/GridSync/TabNav";
import { Sidebar } from "@/components/GridSync/Sidebar";
import { EditorToolbar, DEFAULT_VISIBLE, ColumnKey } from "@/components/GridSync/EditorToolbar";
import { InfoBanner } from "@/components/GridSync/InfoBanner";
import { ProductTable } from "@/components/GridSync/ProductTable";
import { StatusBar } from "@/components/GridSync/StatusBar";
import { BulkActionsModal } from "@/components/GridSync/BulkActionsModal";
import { ReviewPanel } from "@/components/GridSync/ReviewPanel";
import { ChangeHistory } from "@/components/GridSync/ChangeHistory";
import { ApplyProgress } from "@/components/GridSync/ApplyProgress";
import { ScheduledJobs } from "@/components/GridSync/ScheduledJobs";
import { ImportExport } from "@/components/GridSync/ImportExport";
import { ExportCsv } from "@/components/GridSync/ExportCsv";
import { useShopifyProducts } from "@/hooks/useShopifyProducts";
import { Loader2, RefreshCw } from "lucide-react";

export interface AdvancedFilters {
  vendor: string;
  productType: string;
  tag: string;
  priceMin: string;
  priceMax: string;
  dateFrom: string;
  dateTo: string;
}

const emptyAdvancedFilters: AdvancedFilters = {
  vendor: "",
  productType: "",
  tag: "",
  priceMin: "",
  priceMax: "",
  dateFrom: "",
  dateTo: "",
};

const Index = () => {
  const { products: shopifyProducts, loading, error, refetch } = useShopifyProducts();

  const [activeTab, setActiveTab] = useState<TabId>("editor");
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [changedCells, setChangedCells] = useState<Map<string, Record<string, unknown>>>(new Map());
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_VISIBLE);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [showBefore, setShowBefore] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(emptyAdvancedFilters);

  // Derive unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const vendors = [...new Set(shopifyProducts.map((p) => p.vendor).filter(Boolean))].sort();
    const types = [...new Set(shopifyProducts.map((p) => p.productType).filter(Boolean))].sort();
    const tags = [...new Set(shopifyProducts.flatMap((p) => p.tags))].sort();
    const collections = [...new Set(shopifyProducts.flatMap((p) => p.collection))].sort();
    return { vendors, types, tags, collections };
  }, [shopifyProducts]);

  const filteredProducts = useMemo(() => {
    let list = [...shopifyProducts];

    // Sidebar filter
    if (activeFilter === "active") list = list.filter((p) => p.status === "active");
    else if (activeFilter === "draft") list = list.filter((p) => p.status === "draft");
    else if (activeFilter.startsWith("collection:")) {
      const col = activeFilter.replace("collection:", "");
      list = list.filter((p) => p.collection.includes(col));
    } else if (activeFilter === "changed") {
      list = list.filter((p) => changedCells.has(p.id));
    } else if (activeFilter === "smart:lowstock") {
      list = list.filter((p) => p.inventory > 0 && p.inventory < 20);
    } else if (activeFilter === "smart:outofstock") {
      list = list.filter((p) => p.inventory === 0);
    } else if (activeFilter === "smart:noseo") {
      list = list.filter((p) => !p.seoTitle || !p.seoDescription);
    } else if (activeFilter === "smart:onsale") {
      list = list.filter((p) => p.compareAtPrice !== null);
    }

    // Advanced filters
    if (advancedFilters.vendor) list = list.filter((p) => p.vendor === advancedFilters.vendor);
    if (advancedFilters.productType) list = list.filter((p) => p.productType === advancedFilters.productType);
    if (advancedFilters.tag) list = list.filter((p) => p.tags.includes(advancedFilters.tag));
    if (advancedFilters.priceMin) {
      const min = parseFloat(advancedFilters.priceMin);
      if (!isNaN(min)) list = list.filter((p) => p.price >= min);
    }
    if (advancedFilters.priceMax) {
      const max = parseFloat(advancedFilters.priceMax);
      if (!isNaN(max)) list = list.filter((p) => p.price <= max);
    }
    if (advancedFilters.dateFrom) {
      const from = new Date(advancedFilters.dateFrom);
      list = list.filter((p) => new Date(p.createdAt) >= from);
    }
    if (advancedFilters.dateTo) {
      const to = new Date(advancedFilters.dateTo);
      list = list.filter((p) => new Date(p.createdAt) <= to);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.vendor.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeFilter, searchQuery, changedCells, shopifyProducts, advancedFilters]);

  const handleCellChange = useCallback((productId: string, field: string, value: unknown) => {
    setChangedCells((prev) => {
      const next = new Map(prev);
      next.set(productId, { ...(next.get(productId) || {}), [field]: value });
      return next;
    });
  }, []);

  const handleBulkAction = useCallback(
    (action: string, params: Record<string, string>) => {
      const ids = Array.from(selectedIds);
      setChangedCells((prev) => {
        const next = new Map(prev);
        ids.forEach((id) => {
          const product = shopifyProducts.find((p) => p.id === id);
          if (!product) return;
          const existing = next.get(id) || {};
          if (action === "price_percent") {
            const pct = parseFloat(params.percent || "0") / 100;
            const field = params.field || "price";
            const current = (product as unknown as Record<string, number>)[field] || 0;
            existing[field] = Math.round(current * (1 + pct) * 100) / 100;
          } else if (action === "price_set") {
            existing[params.field || "price"] = parseFloat(params.price || "0");
          } else if (action === "find_replace") {
            const field = params.field || "title";
            const current = String((product as unknown as Record<string, unknown>)[field] || "");
            existing[field] = current.split(params.find || "").join(params.replace || "");
          } else if (action === "set_tags") {
            const newTags = (params.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
            if (params.action === "replace") existing.tags = newTags;
            else if (params.action === "remove") existing.tags = product.tags.filter((t) => !newTags.includes(t));
            else existing.tags = [...new Set([...product.tags, ...newTags])];
          }
          next.set(id, existing);
        });
        return next;
      });
    },
    [selectedIds, shopifyProducts]
  );

  const handleApply = useCallback(() => {
    setReviewOpen(false);
    setApplyOpen(true);
  }, []);

  const handleApplyComplete = useCallback(() => {
    setApplyOpen(false);
    setChangedCells(new Map());
    setSelectedIds(new Set());
  }, []);

  const activeCount = shopifyProducts.filter((p) => p.status === "active").length;
  const draftCount = shopifyProducts.filter((p) => p.status === "draft").length;
  const stagedChanges = Array.from(changedCells.values()).reduce((acc, c) => acc + Object.keys(c).length, 0);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} pendingChanges={stagedChanges} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          totalProducts={shopifyProducts.length}
          activeCount={activeCount}
          draftCount={draftCount}
          pendingEdits={changedCells.size}
          collections={filterOptions.collections}
          advancedFilters={advancedFilters}
          onAdvancedFiltersChange={setAdvancedFilters}
          filterOptions={filterOptions}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === "editor" && (
            <>
              <EditorToolbar
                productCount={filteredProducts.length}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                visibleColumns={visibleColumns}
                onColumnsChange={setVisibleColumns}
                showBefore={showBefore}
                onShowBeforeChange={setShowBefore}
                hasChanges={changedCells.size > 0}
              />
              <InfoBanner />
              {loading ? (
                <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading products from Shopify...</span>
                </div>
              ) : error ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <p className="text-sm text-destructive">{error}</p>
                  <button
                    onClick={refetch}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-input rounded-md hover:bg-secondary transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <p className="text-lg font-medium text-foreground mb-1">No products found</p>
                    <p className="text-sm">
                      {shopifyProducts.length === 0
                        ? "Your Shopify store has no products yet. Add products in your Shopify admin."
                        : "Try adjusting your filters or search query."}
                    </p>
                  </div>
                </div>
              ) : (
                <ProductTable
                  products={filteredProducts}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  changedCells={changedCells}
                  onCellChange={handleCellChange}
                  visibleColumns={visibleColumns}
                  showBefore={showBefore}
                />
              )}
              <StatusBar
                selectedCount={selectedIds.size}
                stagedChanges={stagedChanges}
                onBulkActions={() => setBulkModalOpen(true)}
                onReviewApply={() => setReviewOpen(true)}
                onDiscardAll={() => setChangedCells(new Map())}
              />
            </>
          )}

          {activeTab === "history" && <ChangeHistory />}

          {activeTab === "review" && (
            <ReviewPanel
              open={true}
              onClose={() => setActiveTab("editor")}
              products={shopifyProducts}
              changedCells={changedCells}
              onApply={handleApply}
              onDiscard={() => {
                setChangedCells(new Map());
                setActiveTab("editor");
              }}
            />
          )}

          {activeTab === "scheduled" && <ScheduledJobs />}
          {activeTab === "import" && <ImportExport />}
          {activeTab === "export-csv" && <ExportCsv />}
        </div>
      </div>

      <BulkActionsModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        selectedCount={selectedIds.size}
        onApplyAction={handleBulkAction}
      />

      {activeTab === "editor" && (
        <ReviewPanel
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          products={shopifyProducts}
          changedCells={changedCells}
          onApply={handleApply}
          onDiscard={() => {
            setChangedCells(new Map());
            setReviewOpen(false);
          }}
        />
      )}

      <ApplyProgress
        open={applyOpen}
        totalChanges={stagedChanges}
        onComplete={handleApplyComplete}
      />
    </div>
  );
};

export default Index;
