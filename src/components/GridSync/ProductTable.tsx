import { useState, useRef, useEffect, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Product } from "@/data/mockProducts";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnKey } from "@/components/GridSync/EditorToolbar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Category } from "@/hooks/useCategories";
import { Plus, X } from "lucide-react";

interface ProductTableProps {
  products: Product[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  changedCells: Map<string, Record<string, unknown>>;
  onCellChange: (productId: string, field: string, value: unknown) => void;
  visibleColumns: ColumnKey[];
  showBefore?: boolean;
  categories?: Category[];
  getProductCategories?: (productId: string) => Category[];
  onAssignCategory?: (productId: string, categoryId: string) => void;
  onUnassignCategory?: (productId: string, categoryId: string) => void;
  onCreateCategory?: (name: string) => Promise<Category | null>;
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

function CategoryCell({
  productId,
  productCategories,
  allCategories,
  onAssign,
  onUnassign,
  onCreate,
}: {
  productId: string;
  productCategories: Category[];
  allCategories: Category[];
  onAssign?: (productId: string, categoryId: string) => void;
  onUnassign?: (productId: string, categoryId: string) => void;
  onCreate?: (name: string) => Promise<Category | null>;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const unassigned = allCategories.filter((c) => !productCategories.some((pc) => pc.id === c.id));

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 items-center min-h-[24px]">
        {productCategories.map((cat) => (
          <span
            key={cat.id}
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white"
            style={{ backgroundColor: cat.color }}
          >
            {cat.name}
            <button
              onClick={(e) => { e.stopPropagation(); onUnassign?.(productId, cat.id); }}
              className="hover:bg-white/20 rounded-full"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className="w-5 h-5 rounded-full border border-dashed border-muted-foreground/40 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Plus className="w-3 h-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="start" side="bottom" sideOffset={4}>
            {unassigned.length > 0 && (
              <div className="max-h-32 overflow-auto">
                {unassigned.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { onAssign?.(productId, cat.id); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left rounded-sm"
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
            <div className="border-t border-border px-2 py-1.5">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newName.trim() || !onCreate) return;
                  const cat = await onCreate(newName.trim());
                  if (cat) {
                    onAssign?.(productId, cat.id);
                    setNewName("");
                  }
                }}
                className="flex gap-1"
              >
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New category..."
                  className="flex-1 px-2 py-1 text-xs bg-card border border-input rounded text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button type="submit" className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
                  Add
                </button>
              </form>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

const defaultColumnWidths: Record<ColumnKey, number> = {
  image: 56,
  title: 200,
  description: 260,
  sku: 100,
  price: 100,
  compareAtPrice: 100,
  inventory: 112,
  status: 80,
  vendor: 100,
  category: 180,
  tags: 160,
  seoTitle: 200,
  productType: 100,
  variants: 80,
  updatedAt: 140,
};

const columnLabels: Record<ColumnKey, string> = {
  image: "Image",
  title: "Title",
  description: "Description",
  sku: "SKU",
  price: "Price",
  compareAtPrice: "Compare at",
  inventory: "Inventory",
  status: "Status",
  vendor: "Vendor",
  category: "Category",
  tags: "Tags",
  seoTitle: "SEO Title",
  productType: "Type",
  variants: "Variants",
  updatedAt: "Last edited",
};

function ResizableHeader({
  col,
  width,
  onResize,
}: {
  col: ColumnKey;
  width: number;
  onResize: (col: ColumnKey, width: number) => void;
}) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;

      const onMouseMove = (ev: MouseEvent) => {
        const newWidth = Math.max(50, startWidth + ev.clientX - startX);
        onResize(col, newWidth);
      };
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [col, width, onResize]
  );

  return (
    <th
      className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider relative select-none"
      style={{ width: `${width}px`, minWidth: `${width}px` }}
    >
      {columnLabels[col]}
      <div
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors"
      />
    </th>
  );
}

export function ProductTable({
  products,
  selectedIds,
  onSelectionChange,
  changedCells,
  onCellChange,
  visibleColumns,
  showBefore = false,
  categories = [],
  getProductCategories,
  onAssignCategory,
  onUnassignCategory,
  onCreateCategory,
}: ProductTableProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => ({ ...defaultColumnWidths }));

  const handleColumnResize = useCallback((col: ColumnKey, width: number) => {
    setColumnWidths((prev) => ({ ...prev, [col]: width }));
  }, []);

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
      case "image":
        return p.imageUrl ? (
          <img src={p.imageUrl} alt={p.title} className="w-10 h-10 rounded object-cover border border-border" />
        ) : (
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-[10px]">
            No img
          </div>
        );
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
      case "category": {
        const productCats = getProductCategories?.(p.id) || [];
        return (
          <CategoryCell
            productId={p.id}
            productCategories={productCats}
            allCategories={categories}
            onAssign={onAssignCategory}
            onUnassign={onUnassignCategory}
            onCreate={onCreateCategory}
          />
        );
      }
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
      case "updatedAt": {
        if (!p.updatedAt) return <span className="text-xs text-muted-foreground">—</span>;
        const date = new Date(p.updatedAt);
        return (
          <span className="text-xs text-muted-foreground" title={format(date, "PPpp")}>
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <table className="text-sm" style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}>
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border bg-muted/80 backdrop-blur-sm">
            <th className="w-10 px-3 py-2" style={{ width: 40, minWidth: 40 }}>
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            </th>
            {visibleColumns.map((col) => (
              <ResizableHeader
                key={col}
                col={col}
                width={columnWidths[col] || defaultColumnWidths[col]}
                onResize={handleColumnResize}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className={`border-b border-border transition-colors ${
              selectedIds.has(p.id) ? "bg-primary/5" : "hover:bg-muted/30"
            } ${changedCells.has(p.id) ? "border-l-2 border-l-changed" : ""}`}>
              <td className="px-3 py-2" style={{ width: 40 }}>
                <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleOne(p.id)} />
              </td>
              {visibleColumns.map((col) => (
                <td
                  key={col}
                  className="px-3 py-2 overflow-hidden"
                  style={{ width: `${columnWidths[col] || defaultColumnWidths[col]}px`, minWidth: `${columnWidths[col] || defaultColumnWidths[col]}px` }}
                >
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
