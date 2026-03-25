import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const tabs = [
  { id: "editor", label: "Bulk Editor" },
  { id: "history", label: "Change History" },
  { id: "scheduled", label: "Scheduled Jobs" },
  { id: "import", label: "Import / Export", badge: "0 pending changes" },
  { id: "export-csv", label: "Export CSV" },
  { id: "review", label: "Review & Apply" },
];

export function TabNav() {
  const [active, setActive] = useState("editor");

  return (
    <div className="flex items-center gap-1 border-b border-border px-4">
      <div className="flex items-center gap-1 mr-4">
        <span className="inline-block w-2 h-2 rounded-full bg-success" />
        <span className="font-semibold text-foreground text-sm">GridSync</span>
      </div>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActive(tab.id)}
          className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            active === tab.id
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          {tab.label}
          {tab.badge && (
            <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0 font-normal">
              {tab.badge}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
