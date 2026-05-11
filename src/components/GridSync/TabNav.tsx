import { InlineStack, Icon } from "@shopify/polaris";
import { ExitIcon, PersonIcon } from "@shopify/polaris-icons";
import { useAuth } from "@/hooks/useAuth";
import { usePlan, PLAN_LIMITS, PlanType } from "@/hooks/usePlan";
import { useState, useEffect, useRef } from "react";
import { Menu, X, Crown } from "lucide-react";
import syncroniceLogo from "@/assets/syncronice-logo.jpg";

type TabId = "editor" | "history" | "scheduled" | "import" | "export-csv" | "review" | "profile";

const tabDefs: { id: TabId; label: string }[] = [
  { id: "editor", label: "Bulk Editor" },
  { id: "history", label: "Change History" },
  { id: "scheduled", label: "Scheduled Jobs" },
  { id: "import", label: "Import / Export" },
  { id: "export-csv", label: "Export CSV" },
  { id: "review", label: "Review & Apply" },
];

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  pendingChanges: number;
  onUpgradeClick?: (targetPlan: PlanType) => void;
}

export function TabNav({ activeTab, onTabChange, pendingChanges, onUpgradeClick }: TabNavProps) {
  const { user, signOut } = useAuth();
  const { plan } = usePlan();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const planLabel = PLAN_LIMITS[plan as PlanType]?.label.split(" — ")[0] ?? "Free";
  const nextPlan: PlanType | null =
    plan === "free" ? "starter" : plan === "starter" ? "growth" : null;

  const handleTabChange = (tab: TabId) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

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

  const activeLabel = tabDefs.find((t) => t.id === activeTab)?.label || "Profile";
  const selectedTabIndex = tabDefs.findIndex((t) => t.id === activeTab);

  return (
    <div ref={menuRef} className="relative">
      <div className="flex items-center gap-1 border-b border-border px-3 md:px-4 bg-card">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-1.5 mr-2 md:mr-4 py-2.5">
          <img src={syncroniceLogo} alt="SyncroNice" className="w-6 h-6 rounded" />
          <span className="font-bold text-foreground text-sm tracking-tight">SyncroNice</span>
        </div>

        {/* Mobile: show current tab name */}
        <span className="md:hidden text-sm font-medium text-foreground truncate">
          {activeLabel}
        </span>

        {/* Desktop: Polaris-style Tabs */}
        <div className="hidden md:flex items-center gap-0">
          {tabDefs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <InlineStack gap="100" blockAlign="center">
                <span>{tab.label}</span>
                {tab.id === "review" && pendingChanges > 0 && (
                  <span className="bg-changed text-xs text-changed-foreground px-1.5 py-0 rounded-full font-semibold">
                    {pendingChanges}
                  </span>
                )}
              </InlineStack>
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 md:gap-3 py-2.5 shrink-0">
          {user && (
            <button
              onClick={() => handleTabChange("profile")}
              className={`hidden sm:flex items-center gap-1.5 text-xs transition-colors ${
                activeTab === "profile" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Profile settings"
            >
              <Icon source={PersonIcon} />
              <span className="truncate max-w-[120px] md:max-w-[160px]">{user.user_metadata?.display_name || user.email}</span>
            </button>
          )}
          {user && (
            <span
              className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded"
              title={`Current plan: ${planLabel}`}
            >
              {planLabel}
            </span>
          )}
          {user && nextPlan && onUpgradeClick && (
            <button
              onClick={() => onUpgradeClick(nextPlan)}
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90 transition-colors"
              title={`Upgrade to ${PLAN_LIMITS[nextPlan].label}`}
            >
              <Crown className="w-3 h-3" />
              Upgrade
            </button>
          )}
          <button
            onClick={signOut}
            className="hidden md:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <Icon source={ExitIcon} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card px-3 py-2 space-y-1 absolute z-50 left-0 right-0 shadow-lg">
          {tabDefs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-primary/10 text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
              {tab.id === "review" && pendingChanges > 0 && (
                <span className="bg-changed text-changed-foreground text-[10px] px-1.5 py-0 rounded-full font-semibold">
                  {pendingChanges}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => handleTabChange("profile")}
            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
              activeTab === "profile"
                ? "bg-primary/10 text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon source={PersonIcon} />
            Profile
          </button>
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => { setMobileMenuOpen(false); signOut(); }}
              className="w-full text-left px-3 py-2 text-sm rounded-md text-muted-foreground hover:bg-muted flex items-center gap-2"
            >
              <Icon source={ExitIcon} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export type { TabId };
