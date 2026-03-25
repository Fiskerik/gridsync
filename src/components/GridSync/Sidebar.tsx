import { Zap, X, Store, Check, Filter, Tag } from "lucide-react";
import { AdvancedFilters } from "@/pages/Index";
import { ShopifyStore } from "@/hooks/useSupabaseProducts";
import { Category } from "@/hooks/useCategories";

interface SidebarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  totalProducts: number;
  activeCount: number;
  draftCount: number;
  pendingEdits: number;
  collections: string[];
  advancedFilters: AdvancedFilters;
  onAdvancedFiltersChange: (filters: AdvancedFilters) => void;
  filterOptions: {
    vendors: string[];
    types: string[];
    tags: string[];
    collections: string[];
  };
  stores: ShopifyStore[];
  selectedStoreIds: Set<string>;
  onSelectedStoreIdsChange: (ids: Set<string>) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  categories?: Category[];
  getProductsByCategory?: (categoryId: string) => string[];
  desktopInline?: boolean;
}

const smartSelects = [
  { id: "smart:lowstock", label: "Low stock (< 20)", icon: "🔻" },
  { id: "smart:outofstock", label: "Out of stock", icon: "⚠️" },
  { id: "smart:noseo", label: "Missing SEO", icon: "🔍" },
  { id: "smart:onsale", label: "Has compare-at price", icon: "💰" },
];

export function Sidebar({
  activeFilter,
  onFilterChange,
  totalProducts,
  activeCount,
  draftCount,
  pendingEdits,
  collections,
  advancedFilters,
  onAdvancedFiltersChange,
  filterOptions,
  stores,
  selectedStoreIds,
  onSelectedStoreIdsChange,
  mobileOpen = false,
  onMobileClose,
  categories = [],
  getProductsByCategory,
  desktopInline = false,
}: SidebarProps) {
  const counts: Record<string, number> = {
    all: totalProducts,
    active: activeCount,
    draft: draftCount,
  };

  const activeAdvancedCount = Object.values(advancedFilters).filter(Boolean).length;

  const clearAdvanced = () => {
    onAdvancedFiltersChange({
      vendor: "",
      productType: "",
      tag: "",
      priceMin: "",
      priceMax: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  const handleFilterChange = (id: string) => {
    onFilterChange(id);
    onMobileClose?.();
  };

  const SidebarButton = ({ id, label, count, dot }: { id: string; label: string; count?: number; dot?: boolean }) => (
    <button
      onClick={() => handleFilterChange(id)}
      className={`w-full flex items-center justify-between px-4 py-1.5 text-sm transition-colors ${
        activeFilter === id
          ? "bg-sidebar-accent text-foreground font-semibold"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
      }`}
    >
      <span className="flex items-center gap-1.5">
        {dot && <span className="w-1.5 h-1.5 rounded-full bg-changed" />}
        {label}
      </span>
      {count !== undefined && <span className="text-muted-foreground text-xs">{count}</span>}
    </button>
  );

  const sidebarContent = (
    <>
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 mb-1.5">
          Products
        </h3>
        {[
          { id: "all", label: "All Products" },
          { id: "active", label: "Active" },
          { id: "draft", label: "Draft" },
        ].map((f) => (
          <SidebarButton key={f.id} id={f.id} label={f.label} count={counts[f.id]} />
        ))}
      </div>

      {collections.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 mb-1.5">
            Collections
          </h3>
          {collections.map((c) => (
            <SidebarButton key={c} id={`collection:${c}`} label={c} />
          ))}
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 mb-1.5 flex items-center gap-1">
            <Tag className="w-3 h-3" />
            Categories
          </h3>
          {categories.map((cat) => {
            const count = getProductsByCategory?.(cat.id)?.length || 0;
            return (
              <button
                key={cat.id}
                onClick={() => handleFilterChange(`category:${cat.id}`)}
                className={`w-full flex items-center justify-between px-4 py-1.5 text-sm transition-colors ${
                  activeFilter === `category:${cat.id}`
                    ? "bg-sidebar-accent text-foreground font-semibold"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="truncate">{cat.name}</span>
                </span>
                <span className="text-muted-foreground text-xs">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 mb-1.5 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Smart Select
        </h3>
        {smartSelects.map((s) => (
          <SidebarButton key={s.id} id={s.id} label={`${s.icon} ${s.label}`} />
        ))}
      </div>

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 mb-1.5">
          Changed
        </h3>
        <SidebarButton id="changed" label="Pending edits" count={pendingEdits} dot />
      </div>

      {/* Advanced Filters */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between px-4 mb-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            Advanced Filters
            {activeAdvancedCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {activeAdvancedCount}
              </span>
            )}
          </h3>
          {activeAdvancedCount > 0 && (
            <button onClick={clearAdvanced} className="text-muted-foreground hover:text-foreground" title="Clear filters">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="px-4 space-y-2.5">
          {filterOptions.vendors.length > 0 && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Vendor</label>
              <select
                value={advancedFilters.vendor}
                onChange={(e) => onAdvancedFiltersChange({ ...advancedFilters, vendor: e.target.value })}
                className="w-full mt-0.5 text-xs bg-card border border-input rounded px-2 py-1 text-foreground"
              >
                <option value="">All vendors</option>
                {filterOptions.vendors.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          )}

          {filterOptions.types.length > 0 && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Product Type</label>
              <select
                value={advancedFilters.productType}
                onChange={(e) => onAdvancedFiltersChange({ ...advancedFilters, productType: e.target.value })}
                className="w-full mt-0.5 text-xs bg-card border border-input rounded px-2 py-1 text-foreground"
              >
                <option value="">All types</option>
                {filterOptions.types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          {filterOptions.tags.length > 0 && (
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Tag</label>
              <select
                value={advancedFilters.tag}
                onChange={(e) => onAdvancedFiltersChange({ ...advancedFilters, tag: e.target.value })}
                className="w-full mt-0.5 text-xs bg-card border border-input rounded px-2 py-1 text-foreground"
              >
                <option value="">All tags</option>
                {filterOptions.tags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Price Range</label>
            <div className="flex gap-1.5 mt-0.5">
              <input
                type="number"
                placeholder="Min"
                value={advancedFilters.priceMin}
                onChange={(e) => onAdvancedFiltersChange({ ...advancedFilters, priceMin: e.target.value })}
                className="w-full text-xs bg-card border border-input rounded px-2 py-1 text-foreground placeholder:text-muted-foreground"
              />
              <input
                type="number"
                placeholder="Max"
                value={advancedFilters.priceMax}
                onChange={(e) => onAdvancedFiltersChange({ ...advancedFilters, priceMax: e.target.value })}
                className="w-full text-xs bg-card border border-input rounded px-2 py-1 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Created Date</label>
            <div className="flex gap-1.5 mt-0.5">
              <input
                type="date"
                value={advancedFilters.dateFrom}
                onChange={(e) => onAdvancedFiltersChange({ ...advancedFilters, dateFrom: e.target.value })}
                className="w-full text-xs bg-card border border-input rounded px-1.5 py-1 text-foreground"
              />
              <input
                type="date"
                value={advancedFilters.dateTo}
                onChange={(e) => onAdvancedFiltersChange({ ...advancedFilters, dateTo: e.target.value })}
                className="w-full text-xs bg-card border border-input rounded px-1.5 py-1 text-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Store Selector */}
      <div className="mt-auto px-4 pt-4 border-t border-border">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <Store className="w-3 h-3" />
          Stores
        </h3>
        {stores.length === 0 ? (
          <p className="text-xs text-muted-foreground">No stores connected</p>
        ) : (
          <div className="space-y-1">
            {stores.map((store) => {
              const isSelected = selectedStoreIds.has(store.id);
              return (
                <button
                  key={store.id}
                  onClick={() => {
                    const next = new Set(selectedStoreIds);
                    if (isSelected) {
                      next.delete(store.id);
                    } else {
                      next.add(store.id);
                    }
                    onSelectedStoreIdsChange(next);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-muted/50 transition-colors"
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-input"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-foreground truncate">{store.store_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{store.shop_domain}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  // Desktop inline mode - render content directly without wrappers
  if (desktopInline) {
    return <>{sidebarContent}</>;
  }

  return (
    <>
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onMobileClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar py-4 flex flex-col gap-4 overflow-y-auto shadow-xl border-r border-border">
            <div className="flex items-center justify-between px-4 pb-2 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </h2>
              <button onClick={onMobileClose} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
