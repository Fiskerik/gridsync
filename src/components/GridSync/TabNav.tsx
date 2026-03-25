import { Badge } from "@/components/ui/badge";
import { LogOut, Menu, X, UserCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";

type TabId = "editor" | "history" | "scheduled" | "import" | "export-csv" | "review" | "profile";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleTabChange = (tab: TabId) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  // Close menu on outside click
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileMenuOpen]);

  const activeLabel = [...tabs, { id: "review" as TabId, label: "Review & Apply" }].find(
    (t) => t.id === activeTab
  )?.label;

  return (
    <div ref={menuRef} className="relative">
      <div className="flex items-center gap-1 border-b border-border px-3 md:px-4 bg-card">
        {/* Mobile: hamburger + active tab label */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-1.5 mr-2 md:mr-4 py-2.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-success" />
          <span className="font-bold text-foreground text-sm tracking-tight">GridSync</span>
        </div>

        {/* Mobile: show current tab name */}
        <span className="md:hidden text-sm font-medium text-foreground truncate">
          {activeLabel}
        </span>

        {/* Desktop tabs */}
        <div className="hidden md:flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
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
            onClick={() => handleTabChange("review")}
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
        </div>

        <div className="ml-auto flex items-center gap-2 md:gap-3 py-2.5 shrink-0">
          {user && (
            <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[120px] md:max-w-[160px]">
              {user.email}
            </span>
          )}
          <button
            onClick={signOut}
            className="hidden md:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card px-3 py-2 space-y-1 absolute z-50 left-0 right-0 shadow-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                activeTab === tab.id
                  ? "bg-primary/10 text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => handleTabChange("review")}
            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
              activeTab === "review"
                ? "bg-primary/10 text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Review & Apply
            {pendingChanges > 0 && (
              <Badge className="bg-changed text-changed-foreground text-[10px] px-1.5 py-0 font-semibold">
                {pendingChanges}
              </Badge>
            )}
          </button>
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => { setMobileMenuOpen(false); signOut(); }}
              className="w-full text-left px-3 py-2 text-sm rounded-md text-muted-foreground hover:bg-muted flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export type { TabId };
