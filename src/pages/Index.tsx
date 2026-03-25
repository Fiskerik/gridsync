import { useState, useCallback, useMemo } from "react";
import { mockProducts } from "@/data/mockProducts";
import { TabNav } from "@/components/GridSync/TabNav";
import { Sidebar } from "@/components/GridSync/Sidebar";
import { EditorToolbar } from "@/components/GridSync/EditorToolbar";
import { InfoBanner } from "@/components/GridSync/InfoBanner";
import { ProductTable } from "@/components/GridSync/ProductTable";
import { StatusBar } from "@/components/GridSync/StatusBar";

const Index = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [changedCells, setChangedCells] = useState<Map<string, Record<string, unknown>>>(new Map());

  const filteredProducts = useMemo(() => {
    let list = mockProducts;
    if (activeFilter === "active") list = list.filter((p) => p.status === "active");
    else if (activeFilter === "draft") list = list.filter((p) => p.status === "draft");
    else if (activeFilter.startsWith("collection:")) {
      const col = activeFilter.replace("collection:", "");
      list = list.filter((p) => p.collection.includes(col));
    } else if (activeFilter === "changed") {
      list = list.filter((p) => changedCells.has(p.id));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) => p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeFilter, searchQuery, changedCells]);

  const handleCellChange = useCallback(
    (productId: string, field: string, value: unknown) => {
      setChangedCells((prev) => {
        const next = new Map(prev);
        const existing = next.get(productId) || {};
        next.set(productId, { ...existing, [field]: value });
        return next;
      });
    },
    []
  );

  const activeCount = mockProducts.filter((p) => p.status === "active").length;
  const draftCount = mockProducts.filter((p) => p.status === "draft").length;
  const stagedChanges = Array.from(changedCells.values()).reduce(
    (acc, changes) => acc + Object.keys(changes).length,
    0
  );

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <TabNav />
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
          <EditorToolbar
            productCount={filteredProducts.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          <InfoBanner />
          <ProductTable
            products={filteredProducts}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            changedCells={changedCells}
            onCellChange={handleCellChange}
          />
          <StatusBar
            selectedCount={selectedIds.size}
            stagedChanges={stagedChanges}
            onBulkEditPrices={() => {}}
            onBulkApplyTags={() => {}}
            onDiscardAll={() => setChangedCells(new Map())}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
