import { useState, useCallback, useMemo } from "react";
import { Product } from "@/data/mockProducts";
import type { Json } from "@/integrations/supabase/types";
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
import { ProfilePage } from "@/components/GridSync/ProfilePage";
import { ImportExport } from "@/components/GridSync/ImportExport";
import { ExportCsv } from "@/components/GridSync/ExportCsv";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import { useCategories } from "@/hooks/useCategories";
import { usePlan } from "@/hooks/usePlan";
import { UpgradeModal } from "@/components/GridSync/UpgradeModal";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

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
  const {
    products: shopifyProducts,
    stores,
    selectedStoreIds,
    setSelectedStoreIds,
    loading,
    error,
    refetch,
    refetchStores,
    connectStore,
    disconnectStore,
    importFromShopify,
    pushChangesToShopify,
  } = useSupabaseProducts();

  const {
    categories,
    createCategory,
    deleteCategory,
    assignCategory,
    unassignCategory,
    assignCategoryToMany,
    unassignCategoryFromMany,
    getProductCategories,
    getProductsByCategory,
  } = useCategories();

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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(emptyAdvancedFilters);

  // Plan & upgrade modal
  const { plan, limits, canUseTrial, startTrial } = usePlan();
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature: string; requiredPlan: "starter" | "growth" }>({ open: false, feature: "", requiredPlan: "starter" });

  const filterOptions = useMemo(() => {
    const vendors = [...new Set(shopifyProducts.map((p) => p.vendor).filter(Boolean))].sort();
    const types = [...new Set(shopifyProducts.map((p) => p.productType).filter(Boolean))].sort();
    const tags = [...new Set(shopifyProducts.flatMap((p) => p.tags))].sort();
    const collections = [...new Set(shopifyProducts.flatMap((p) => p.collection))].sort();
    return { vendors, types, tags, collections };
  }, [shopifyProducts]);

  const filteredProducts = useMemo(() => {
    let list = [...shopifyProducts];

    if (activeFilter === "active") list = list.filter((p) => p.status === "active");
    else if (activeFilter === "draft") list = list.filter((p) => p.status === "draft");
    else if (activeFilter.startsWith("collection:")) {
      const col = activeFilter.replace("collection:", "");
      list = list.filter((p) => p.collection.includes(col));
    } else if (activeFilter.startsWith("category:")) {
      const catId = activeFilter.replace("category:", "");
      const productIds = getProductsByCategory(catId);
      list = list.filter((p) => productIds.includes(p.id));
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
  }, [activeFilter, searchQuery, changedCells, shopifyProducts, advancedFilters, getProductsByCategory]);

  const handleCellChange = useCallback((productId: string, field: string, value: unknown) => {
    setChangedCells((prev) => {
      const next = new Map(prev);
      next.set(productId, { ...(next.get(productId) || {}), [field]: value });
      return next;
    });
  }, []);

  const handleAutoFixChange = useCallback((productId: string, field: string, value: unknown) => {
    setChangedCells((prev) => {
      const next = new Map(prev);
      next.set(productId, { ...(next.get(productId) || {}), [field]: value });
      return next;
    });
  }, []);

  const handleBulkAction = useCallback(
    (action: string, params: Record<string, string>) => {
      const ids = Array.from(selectedIds);

      // Handle category actions
      if (action === "set_category") {
        const categoryId = params.categoryId;
        if (params.action === "remove") {
          unassignCategoryFromMany(ids, categoryId);
        } else {
          assignCategoryToMany(ids, categoryId);
        }
        return;
      }

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
    [selectedIds, shopifyProducts, assignCategoryToMany, unassignCategoryFromMany]
  );

  const handleSyncStores = useCallback(async (storeIds: string[]) => {
    for (const storeId of storeIds) {
      try {
        await importFromShopify(storeId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Sync failed";
        toast.error(`Failed to sync store`, { description: msg });
      }
    }
    toast.success(`Synced ${storeIds.length} store${storeIds.length !== 1 ? "s" : ""}`);
  }, [importFromShopify]);

  const handleApply = useCallback(async () => {
    setReviewOpen(false);
    setApplyOpen(true);
  }, []);

  const saveEditHistory = useCallback(async (cells: Map<string, Record<string, unknown>>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const allFields = new Set<string>();
      cells.forEach((fields) => Object.keys(fields).forEach((f) => allFields.add(f)));

      const { data: historyEntry, error: histErr } = await supabase
        .from("edit_history")
        .insert({
          user_id: session.user.id,
          description: `Edited ${cells.size} product${cells.size > 1 ? "s" : ""}`,
          products_affected: cells.size,
          fields_changed: Array.from(allFields),
        })
        .select("id")
        .single();

      if (histErr || !historyEntry) throw histErr;

      const changeRows = Array.from(cells.entries()).flatMap(([productId, fields]) => {
        const product = shopifyProducts.find((p) => p.id === productId);
        return Object.entries(fields).map(([field, newValue]) => ({
          edit_history_id: historyEntry.id,
          product_id: productId,
          field,
          old_value: (product ? (product as unknown as Record<string, unknown>)[field] ?? null : null) as Json,
          new_value: (newValue ?? null) as Json,
        }));
      });

      if (changeRows.length > 0) {
        await supabase
          .from("edit_history_changes")
          .insert(changeRows);
      }
    } catch (err) {
      console.error("Failed to save edit history:", err);
    }
  }, [shopifyProducts]);

  const handleApplyComplete = useCallback(async () => {
    try {
      const result = await pushChangesToShopify(changedCells);
      const failedIds = new Set(result.results.filter((r) => !r.success).map((r) => r.productId));

      const succeededChanges = new Map<string, Record<string, unknown>>();
      changedCells.forEach((fields, productId) => {
        if (!failedIds.has(productId)) succeededChanges.set(productId, fields);
      });

      if (succeededChanges.size > 0) {
        await saveEditHistory(succeededChanges);
      }

      if (result.summary.failed > 0) {
        const firstError = result.results.find((r) => !r.success)?.error;
        toast.warning(`${result.summary.succeeded} updated, ${result.summary.failed} failed`, {
          description: firstError || "Some products could not be synced",
        });
      } else {
        toast.success(`${result.summary.succeeded} products updated on Shopify`);
      }

      if (failedIds.size > 0) {
        setChangedCells((prev) => {
          const next = new Map<string, Record<string, unknown>>();
          prev.forEach((fields, productId) => {
            if (failedIds.has(productId)) next.set(productId, fields);
          });
          return next;
        });
      } else {
        setChangedCells(new Map());
      }

      setSelectedIds(new Set());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Push failed";
      toast.error("Failed to push to Shopify", { description: msg });
    }

    setApplyOpen(false);
  }, [changedCells, pushChangesToShopify, saveEditHistory]);

  const activeCount = shopifyProducts.filter((p) => p.status === "active").length;
  const draftCount = shopifyProducts.filter((p) => p.status === "draft").length;
  const stagedChanges = Array.from(changedCells.values()).reduce((acc, c) => acc + Object.keys(c).length, 0);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} pendingChanges={stagedChanges} />
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar */}
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
          stores={stores}
          selectedStoreIds={selectedStoreIds}
          onSelectedStoreIdsChange={setSelectedStoreIds}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          categories={categories}
          getProductsByCategory={getProductsByCategory}
          onSwitchToEditor={() => setActiveTab("editor")}
        />

        {/* Desktop: resizable panels */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={18} minSize={12} maxSize={30}>
              <aside className="h-full bg-sidebar py-4 flex flex-col gap-4 overflow-y-auto border-r border-border">
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
                  stores={stores}
                  selectedStoreIds={selectedStoreIds}
                  onSelectedStoreIdsChange={setSelectedStoreIds}
                  categories={categories}
                  getProductsByCategory={getProductsByCategory}
                  desktopInline
                  onSwitchToEditor={() => setActiveTab("editor")}
                />
              </aside>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={82}>
              <div className="flex-1 flex flex-col overflow-hidden h-full">
                {renderMainContent()}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Mobile: no resizable */}
        <div className="md:hidden flex-1 flex flex-col overflow-hidden">
          {renderMainContent()}
        </div>
      </div>

      <BulkActionsModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        selectedCount={selectedIds.size}
        onApplyAction={handleBulkAction}
        categories={categories}
      />

      {activeTab === "editor" && (
        <ReviewPanel
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          products={shopifyProducts}
          changedCells={changedCells}
          onApply={handleApply}
          onAutoFixChange={handleAutoFixChange}
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

      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal((p) => ({ ...p, open: false }))}
        feature={upgradeModal.feature}
        requiredPlan={upgradeModal.requiredPlan}
        canUseTrial={canUseTrial}
        onStartTrial={startTrial}
      />
    </div>
  );

  function renderMainContent() {
    return (
      <>
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
              onOpenFilters={() => setMobileSidebarOpen(true)}
              stores={stores}
              onSyncStores={handleSyncStores}
            />
            <InfoBanner />
            {loading ? (
              <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading products...</span>
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
                      ? "No products yet. Go to the Import tab to pull products from Shopify."
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
                categories={categories}
                getProductCategories={getProductCategories}
                onAssignCategory={assignCategory}
                onUnassignCategory={unassignCategory}
                onCreateCategory={createCategory}
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

        {activeTab === "scheduled" && (
          limits.scheduledJobs ? (
            <ScheduledJobs
              products={shopifyProducts}
              categories={categories}
              getProductsByCategory={getProductsByCategory}
              getProductCategories={getProductCategories}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground p-8">
              <p className="text-lg font-medium text-foreground">Scheduled Jobs</p>
              <p className="text-sm text-center max-w-md">Schedule automated price changes, tag updates, and more. Available on the Growth plan.</p>
              <button
                onClick={() => setUpgradeModal({ open: true, feature: "Scheduled Jobs", requiredPlan: "growth" })}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Upgrade to Growth
              </button>
            </div>
          )
        )}
        {activeTab === "import" && (
          <ImportExport
            products={shopifyProducts}
            changedCells={changedCells}
            stores={stores}
            onImportComplete={refetch}
            onPushComplete={() => {
              setChangedCells(new Map());
              setSelectedIds(new Set());
            }}
            importFromShopify={importFromShopify}
            pushChangesToShopify={pushChangesToShopify}
            connectStore={connectStore}
            disconnectStore={disconnectStore}
            onStoreConnected={refetchStores}
            maxProducts={limits.maxProducts}
            onUpgradeNeeded={() => setUpgradeModal({ open: true, feature: "More than " + limits.maxProducts + " products", requiredPlan: plan === "free" ? "starter" : "growth" })}
          />
        )}
        {activeTab === "export-csv" && <ExportCsv products={shopifyProducts} />}
        {activeTab === "profile" && <ProfilePage />}
      </>
    );
  }
};

export default Index;

// Upgrade modal rendered at top level - need to add to component

