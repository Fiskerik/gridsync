import { useState } from "react";
import { Product } from "@/data/mockProducts";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnKey } from "@/components/GridSync/EditorToolbar";
import { Badge } from "@/components/ui/badge";

interface ProductTableProps {
  products: Product[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  changedCells: Map<string, Record<string, unknown>>;
  onCellChange: (productId: string, field: string, value: unknown) => void;
  visibleColumns: ColumnKey[];
  showBefore?: boolean;
}

function InventoryBadge({ count }: { count: number }) {
  if (count === 0)
    return <span className="text-[11px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium whitespace-nowrap">Out of stock</span>;
  if (count < 20)
    return <span className="text-[11px] px-2 py-0.5 rounded-full bg-warning/15 text-accent font-medium whitespace-nowrap">{count} in stock</span>;
  return <span className="text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success font-medium whitespace-nowrap">{count} in stock</span>;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium ${status === "active" ? "text-status-active" : status === "draft" ? "text-status-draft" : "text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function EditableCell({
  value,
  isChanged,
  onCommit,
  type = "text",
  prefix = "",
  className = "",
}: {
  value: string | number;
  isChanged: boolean;
  onCommit: (v: string) => void;
  type?: string;
  prefix?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const handleBlur = () => {
    setEditing(false);
    if (draft !== String(value)) onCommit(draft);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleBlur();
          if (e.key === "Escape") { setDraft(String(value)); setEditing(false); }
        }}
        className={`w-full px-2 py-1 text-sm bg-card border border-ring rounded text-foreground focus:outline-none ${className}`}
      />
    );
  }

  return (
    <div
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className={`cursor-text px-2 py-1 rounded text-sm transition-colors truncate ${
        isChanged ? "bg-changed-background ring-1 ring-changed" : "hover:bg-muted"
      } ${className}`}
    >
      {prefix}{value || "—"}
    </div>
  );
}

const columnConfig: Record<ColumnKey, { label: string; width?: string }> = {
  title: { label: "Title", width: "min-w-[180px] max-w-[240px]" },
  description: { label: "Description", width: "min-w-[200px] max-w-[300px]" },
  sku: { label: "SKU", width: "w-24" },
  price: { label: "Price", width: "w-24" },
  compareAtPrice: { label: "Compare at", width: "w-24" },
  inventory: { label: "Inventory", width: "w-28" },
  status: { label: "Status", width: "w-20" },
  vendor: { label: "Vendor", width: "w-24" },
  tags: { label: "Tags", width: "min-w-[140px]" },
  seoTitle: { label: "SEO Title", width: "min-w-[180px] max-w-[240px]" },
  productType: { label: "Type", width: "w-24" },
  variants: { label: "Variants", width: "w-20" },
};

export function ProductTable({
  products,
  selectedIds,
  onSelectionChange,
  changedCells,
  onCellChange,
  visibleColumns,
  showBefore = false,
}: ProductTableProps) {
  const allSelected = products.length > 0 && selectedIds.size === products.length;

  const toggleAll = () => {
    onSelectionChange(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectionChange(next);
  };

  const isChanged = (id: string, field: string) =>
    changedCells.has(id) && field in (changedCells.get(id) || {});

  const getDisplayValue = (p: Product, field: string) => {
    if (showBefore) return (p as unknown as Record<string, unknown>)[field];
    const changes = changedCells.get(p.id);
    if (changes && field in changes) return changes[field];
    return (p as unknown as Record<string, unknown>)[field];
  };

  const renderCell = (p: Product, col: ColumnKey) => {
    switch (col) {
      case "title":
        return (
          <EditableCell value={String(getDisplayValue(p, "title") || "")} isChanged={!showBefore && isChanged(p.id, "title")}
            onCommit={(v) => onCellChange(p.id, "title", v)} className="font-medium" />
        );
      case "description":
        return (
          <EditableCell value={String(getDisplayValue(p, "description") || "")} isChanged={!showBefore && isChanged(p.id, "description")}
            onCommit={(v) => onCellChange(p.id, "description", v)} />
        );
      case "sku":
        return <span className="text-muted-foreground font-mono text-xs">{p.sku}</span>;
      case "price": {
        const price = Number(getDisplayValue(p, "price") || 0);
        return (
          <EditableCell value={price.toFixed(2)} isChanged={!showBefore && isChanged(p.id, "price")}
            onCommit={(v) => onCellChange(p.id, "price", parseFloat(v))} type="number" prefix="$" />
        );
      }
      case "compareAtPrice": {
        const cap = getDisplayValue(p, "compareAtPrice") as number | null;
        return (
          <EditableCell value={cap?.toFixed(2) || ""} isChanged={!showBefore && isChanged(p.id, "compareAtPrice")}
            onCommit={(v) => onCellChange(p.id, "compareAtPrice", v ? parseFloat(v) : null)} type="number" prefix={cap ? "$" : ""} />
        );
      }
      case "inventory":
        return <InventoryBadge count={p.inventory} />;
      case "status":
        return <StatusBadge status={p.status} />;
      case "vendor":
        return <span className="text-muted-foreground text-xs truncate">{p.vendor}</span>;
      case "tags": {
        const tags = (showBefore ? p.tags : (getDisplayValue(p, "tags") as string[] || p.tags));
        return (
          <div className="flex flex-wrap gap-1">
            {(tags as string[]).slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">{t}</Badge>
            ))}
            {(tags as string[]).length > 3 && <span className="text-[10px] text-muted-foreground">+{(tags as string[]).length - 3}</span>}
          </div>
        );
      }
      case "seoTitle":
        return (
          <EditableCell value={String(getDisplayValue(p, "seoTitle") || "")} isChanged={!showBefore && isChanged(p.id, "seoTitle")}
            onCommit={(v) => onCellChange(p.id, "seoTitle", v)} />
        );
      case "productType":
        return <span className="text-xs text-muted-foreground">{p.productType}</span>;
      case "variants":
        return <span className="text-xs text-muted-foreground">{p.variants}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border bg-muted/80 backdrop-blur-sm">
            <th className="w-10 px-3 py-2">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            </th>
            {visibleColumns.map((col) => (
              <th key={col} className={`px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ${columnConfig[col]?.width || ""}`}>
                {columnConfig[col]?.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className={`border-b border-border transition-colors ${
              selectedIds.has(p.id) ? "bg-primary/5" : "hover:bg-muted/30"
            } ${changedCells.has(p.id) ? "border-l-2 border-l-changed" : ""}`}>
              <td className="px-3 py-2">
                <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleOne(p.id)} />
              </td>
              {visibleColumns.map((col) => (
                <td key={col} className={`px-3 py-2 ${columnConfig[col]?.width || ""}`}>
                  {renderCell(p, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
