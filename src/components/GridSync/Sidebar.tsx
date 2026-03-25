import { collections } from "@/data/mockProducts";
import { Zap } from "lucide-react";

interface SidebarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  totalProducts: number;
  activeCount: number;
  draftCount: number;
  pendingEdits: number;
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
}: SidebarProps) {
  const counts: Record<string, number> = {
    all: totalProducts,
    active: activeCount,
    draft: draftCount,
  };

  const SidebarButton = ({ id, label, count, dot }: { id: string; label: string; count?: number; dot?: boolean }) => (
    <button
      onClick={() => onFilterChange(id)}
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

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-sidebar py-4 flex flex-col gap-5 overflow-y-auto">
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

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 mb-1.5">
          Collections
        </h3>
        {collections.map((c) => (
          <SidebarButton key={c.name} id={`collection:${c.name}`} label={c.name} count={c.count} />
        ))}
      </div>

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

      <div className="mt-auto px-4 pt-4 border-t border-border">
        <p className="text-[11px] text-muted-foreground">Last backup</p>
        <p className="text-xs text-foreground">Today, 09:14 AM</p>
        <button className="mt-2 w-full text-xs border border-border rounded-md py-1.5 text-foreground hover:bg-secondary transition-colors">
          Restore backup
        </button>
      </div>
    </aside>
  );
}
