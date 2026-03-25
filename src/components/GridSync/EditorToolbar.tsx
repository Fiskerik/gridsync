import { Search, SlidersHorizontal, Columns3 } from "lucide-react";

interface EditorToolbarProps {
  productCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function EditorToolbar({ productCount, searchQuery, onSearchChange }: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-card border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-input rounded-md text-foreground hover:bg-secondary transition-colors">
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Filter
      </button>
      <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-input rounded-md text-foreground hover:bg-secondary transition-colors">
        <Columns3 className="w-3.5 h-3.5" />
        Columns
        <span className="text-muted-foreground">7 visible</span>
      </button>
      <span className="ml-auto text-xs text-muted-foreground">
        Showing {productCount} products
      </span>
    </div>
  );
}
