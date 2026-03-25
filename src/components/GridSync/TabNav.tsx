import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type TabId = "editor" | "history" | "scheduled" | "import" | "export-csv" | "review";

const tabs: { id: TabId; label: string }[] = [
  { id: "editor", label: "Bulk Editor" },
  { id: "history", label: "Change History" },
  { id: "scheduled", label: "Scheduled Jobs" },
  { id: "import", label: "Import / Export" },
  { id: "export-csv", label: "Export CSV" },
];

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  pendingChanges: number;
}

export function TabNav({ activeTab, onTabChange, pendingChanges }: TabNavProps) {
  const { user, signOut } = useAuth();

  return (
    <div className="flex items-center gap-1 border-b border-border px-4 bg-card">
      <div className="flex items-center gap-1.5 mr-4 py-2.5">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-success" />
        <span className="font-bold text-foreground text-sm tracking-tight">GridSync</span>
      </div>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.id
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          {tab.label}
        </button>
      ))}
      <button
        onClick={() => onTabChange("review")}
        className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
          activeTab === "review"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
        }`}
      >
        Review & Apply
        {pendingChanges > 0 && (
          <Badge className="bg-changed text-changed-foreground text-[10px] px-1.5 py-0 font-semibold">
            {pendingChanges}
          </Badge>
        )}
      </button>

      <div className="ml-auto flex items-center gap-3 py-2.5">
        {user && (
          <span className="text-xs text-muted-foreground truncate max-w-[160px]">{user.email}</span>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export type { TabId };
