import { useState, useCallback, useMemo } from "react";
import { mockProducts, Product } from "@/data/mockProducts";
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

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>("editor");
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [changedCells, setChangedCells] = useState<Map<string, Record<string, unknown>>>(new Map());
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_VISIBLE);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    let list = [...mockProducts];
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
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q)));
    }
    return list;
  }, [activeFilter, searchQuery, changedCells]);

  const handleCellChange = useCallback((productId: string, field: string, value: unknown) => {
    setChangedCells((prev) => {
      const next = new Map(prev);
      next.set(productId, { ...(next.get(productId) || {}), [field]: value });
      return next;
    });
  }, []);

  const handleBulkAction = useCallback((action: string, params: Record<string, string>) => {
    const ids = Array.from(selectedIds);
    setChangedCells((prev) => {
      const next = new Map(prev);
      ids.forEach((id) => {
        const product = mockProducts.find((p) => p.id === id);
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
          existing[field] = current.replaceAll(params.find || "", params.replace || "");
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
  }, [selectedIds]);

  const handleApply = useCallback(() => {
    setReviewOpen(false);
    setApplyOpen(true);
  }, []);

  const handleApplyComplete = useCallback(() => {
    setApplyOpen(false);
    setChangedCells(new Map());
    setSelectedIds(new Set());
  }, []);

  const activeCount = mockProducts.filter((p) => p.status === "active").length;
  const draftCount = mockProducts.filter((p) => p.status === "draft").length;
  const stagedChanges = Array.from(changedCells.values()).reduce((acc, c) => acc + Object.keys(c).length, 0);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} pendingChanges={stagedChanges} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          totalProducts={mockProducts.length}
          activeCount={activeCount}
          draftCount={draftCount}
          pendingEdits={changedCells.size}
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
              />
              <InfoBanner />
              <ProductTable
                products={filteredProducts}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                changedCells={changedCells}
                onCellChange={handleCellChange}
                visibleColumns={visibleColumns}
              />
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
              products={mockProducts}
              changedCells={changedCells}
              onApply={handleApply}
              onDiscard={() => { setChangedCells(new Map()); setActiveTab("editor"); }}
            />
          )}

          {(activeTab === "scheduled" || activeTab === "import" || activeTab === "export-csv") && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg font-medium text-foreground mb-1">Coming Soon</p>
                <p className="text-sm">{activeTab === "scheduled" ? "Scheduled jobs" : activeTab === "import" ? "Import / Export" : "CSV Export"} will be available in the next update.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <BulkActionsModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        selectedCount={selectedIds.size}
        onApplyAction={handleBulkAction}
      />

      {/* Inline review panel (slide-over) */}
      {activeTab === "editor" && (
        <ReviewPanel
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          products={mockProducts}
          changedCells={changedCells}
          onApply={handleApply}
          onDiscard={() => { setChangedCells(new Map()); setReviewOpen(false); }}
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
