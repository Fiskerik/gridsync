import { Search, Columns3, ChevronDown, Eye, EyeOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ColumnKey = "title" | "sku" | "price" | "compareAtPrice" | "inventory" | "status" | "vendor" | "tags" | "seoTitle" | "description" | "productType" | "variants";

export const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "sku", label: "SKU" },
  { key: "price", label: "Price" },
  { key: "compareAtPrice", label: "Compare at" },
  { key: "inventory", label: "Inventory" },
  { key: "status", label: "Status" },
  { key: "vendor", label: "Vendor" },
  { key: "tags", label: "Tags" },
  { key: "seoTitle", label: "SEO Title" },
  { key: "productType", label: "Type" },
  { key: "variants", label: "Variants" },
];

export const DEFAULT_VISIBLE: ColumnKey[] = ["title", "sku", "price", "compareAtPrice", "inventory", "status", "vendor"];

interface EditorToolbarProps {
  productCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  visibleColumns: ColumnKey[];
  onColumnsChange: (cols: ColumnKey[]) => void;
  showBefore: boolean;
  onShowBeforeChange: (v: boolean) => void;
  hasChanges: boolean;
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
}: EditorToolbarProps) {
  const toggleColumn = (key: ColumnKey) => {
    if (visibleColumns.includes(key)) {
      if (visibleColumns.length > 1) onColumnsChange(visibleColumns.filter((c) => c !== key));
    } else {
      onColumnsChange([...visibleColumns, key]);
    }
  };

  return (
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
  );
}
