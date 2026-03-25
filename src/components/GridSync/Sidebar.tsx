import { useState } from "react";
import { collections } from "@/data/mockProducts";

interface SidebarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  totalProducts: number;
  activeCount: number;
  draftCount: number;
  pendingEdits: number;
}

const productFilters = [
  { id: "all", label: "All Products" },
  { id: "active", label: "Active" },
  { id: "draft", label: "Draft" },
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

  return (
    <aside className="w-52 shrink-0 border-r border-border bg-sidebar py-4 flex flex-col gap-6">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 mb-2">
          Products
        </h3>
        {productFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={`w-full flex items-center justify-between px-4 py-1.5 text-sm transition-colors ${
              activeFilter === f.id
                ? "bg-sidebar-accent text-foreground font-semibold"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <span>{f.label}</span>
            <span className="text-muted-foreground text-xs">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 mb-2">
          Collections
        </h3>
        {collections.map((c) => (
          <button
            key={c.name}
            onClick={() => onFilterChange(`collection:${c.name}`)}
            className={`w-full flex items-center justify-between px-4 py-1.5 text-sm transition-colors ${
              activeFilter === `collection:${c.name}`
                ? "bg-sidebar-accent text-foreground font-semibold"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <span>{c.name}</span>
            <span className="text-muted-foreground text-xs">{c.count}</span>
          </button>
        ))}
      </div>

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 mb-2">
          Changed
        </h3>
        <button
          onClick={() => onFilterChange("changed")}
          className={`w-full flex items-center justify-between px-4 py-1.5 text-sm transition-colors ${
            activeFilter === "changed"
              ? "bg-sidebar-accent text-foreground font-semibold"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-changed" />
            Pending edits
          </span>
          <span className="text-muted-foreground text-xs">{pendingEdits}</span>
        </button>
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
