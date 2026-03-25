import { useState, useCallback } from "react";
import { Product } from "@/data/mockProducts";
import { Checkbox } from "@/components/ui/checkbox";

interface ProductTableProps {
  products: Product[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  changedCells: Map<string, Record<string, unknown>>;
  onCellChange: (productId: string, field: string, value: unknown) => void;
}

function InventoryBadge({ count }: { count: number }) {
  if (count === 0)
    return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Out of stock</span>;
  if (count < 20)
    return <span className="text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning-foreground font-medium">{count} in stock</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">{count} in stock</span>;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium ${status === "active" ? "text-status-active" : "text-status-draft"}`}>
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
}: {
  value: string | number;
  isChanged: boolean;
  onCommit: (v: string) => void;
  type?: string;
  prefix?: string;
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
        onKeyDown={(e) => e.key === "Enter" && handleBlur()}
        className="w-full px-2 py-1 text-sm bg-card border border-ring rounded text-foreground focus:outline-none"
      />
    );
  }

  return (
    <div
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className={`cursor-text px-2 py-1 rounded text-sm transition-colors ${
        isChanged ? "bg-changed-background ring-1 ring-changed" : "hover:bg-muted"
      }`}
    >
      {prefix}{value || "—"}
    </div>
  );
}

const columns = ["", "Title", "SKU", "Price", "Compare at", "Inventory", "Status", "Vendor"];

export function ProductTable({
  products,
  selectedIds,
  onSelectionChange,
  changedCells,
  onCellChange,
}: ProductTableProps) {
  const allSelected = products.length > 0 && selectedIds.size === products.length;

  const toggleAll = useCallback(() => {
    onSelectionChange(
      allSelected ? new Set() : new Set(products.map((p) => p.id))
    );
  }, [allSelected, products, onSelectionChange]);

  const toggleOne = useCallback(
    (id: string) => {
      const next = new Set(selectedIds);
      next.has(id) ? next.delete(id) : next.add(id);
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange]
  );

  const isChanged = (id: string, field: string) =>
    changedCells.has(id) && field in (changedCells.get(id) || {});

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="w-10 px-3 py-2">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            </th>
            {columns.slice(1).map((col) => (
              <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
              <td className="px-3 py-2">
                <Checkbox
                  checked={selectedIds.has(p.id)}
                  onCheckedChange={() => toggleOne(p.id)}
                />
              </td>
              <td className="px-3 py-2 font-medium text-foreground max-w-[200px] truncate">
                {p.title}
              </td>
              <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                {p.sku}
              </td>
              <td className="px-3 py-2">
                <EditableCell
                  value={p.price.toFixed(2)}
                  isChanged={isChanged(p.id, "price")}
                  onCommit={(v) => onCellChange(p.id, "price", parseFloat(v))}
                  type="number"
                  prefix="$"
                />
              </td>
              <td className="px-3 py-2">
                <EditableCell
                  value={p.compareAtPrice?.toFixed(2) || ""}
                  isChanged={isChanged(p.id, "compareAtPrice")}
                  onCommit={(v) => onCellChange(p.id, "compareAtPrice", v ? parseFloat(v) : null)}
                  type="number"
                  prefix={p.compareAtPrice ? "$" : ""}
                />
              </td>
              <td className="px-3 py-2">
                <InventoryBadge count={p.inventory} />
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={p.status} />
              </td>
              <td className="px-3 py-2 text-muted-foreground truncate max-w-[80px]">
                {p.vendor.substring(0, 2).toUpperCase()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
