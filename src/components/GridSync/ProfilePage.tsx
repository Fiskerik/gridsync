import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlan, PLAN_LIMITS, PlanType } from "@/hooks/usePlan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User,
  Lock,
  Shield,
  FileText,
  Loader2,
  Check,
  ExternalLink,
  Store,
  Plus,
  Trash2,
  RefreshCw,
  Crown,
} from "lucide-react";
import { toast } from "sonner";

interface ShopifyStoreRow {
  id: string;
  store_name: string;
  shop_domain: string;
}

export function ProfilePage() {
  const { user } = useAuth();
  const { plan } = usePlan();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || "");
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Connected stores
  const [stores, setStores] = useState<ShopifyStoreRow[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [showAddStore, setShowAddStore] = useState(false);
  const [newShopDomain, setNewShopDomain] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ShopifyStoreRow | null>(null);
  const [deleteInput, setDeleteInput] = useState("");

  const fetchStores = useCallback(async () => {
    setStoresLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setStores([]); setStoresLoading(false); return; }
    const { data, error } = await supabase
      .from("shopify_stores")
      .select("id, store_name, shop_domain")
      .order("created_at", { ascending: false });
    if (!error && data) setStores(data);
    setStoresLoading(false);
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const handleSaveName = async () => {
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    });
    setSavingName(false);
    if (error) {
      toast.error("Failed to update name", { description: error.message });
    } else {
      toast.success("Display name updated");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!user?.email) {
      toast.error("No email on account");
      return;
    }

    setChangingPassword(true);

    // Verify current password by attempting a sign-in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) {
      setChangingPassword(false);
      toast.error("Current password is incorrect");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error("Failed to change password", { description: error.message });
    } else {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleConnectStore = async () => {
    const domain = newShopDomain.trim();
    if (!domain) { toast.error("Please enter a shop domain"); return; }
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/shopify-oauth-init`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ shop: domain }),
        }
      );
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `OAuth init failed: ${res.status}`);

      const popup = window.open(data.authUrl, "shopify-oauth", "width=600,height=700,scrollbars=yes");
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "shopify-oauth-success") {
          window.removeEventListener("message", handleMessage);
          toast.success(`Connected to ${event.data.storeName || event.data.shop}`);
          setShowAddStore(false);
          setNewShopDomain("");
          fetchStores();
        }
      };
      window.addEventListener("message", handleMessage);
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handleMessage);
          setConnecting(false);
          fetchStores();
        }
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      toast.error("Failed to connect store", { description: msg });
      setConnecting(false);
    }
  };

  const handleDisconnectStore = async () => {
    if (!deleteConfirm) return;
    const { error } = await supabase
      .from("shopify_stores")
      .delete()
      .eq("id", deleteConfirm.id);
    if (error) {
      toast.error("Failed to disconnect store");
    } else {
      toast.success("Store disconnected");
      setStores((prev) => prev.filter((s) => s.id !== deleteConfirm.id));
    }
    setDeleteConfirm(null);
    setDeleteInput("");
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Profile Info */}
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your account settings</p>
        </div>

        <div className="border border-border rounded-lg bg-card p-5 space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Email</Label>
            <p className="text-sm text-foreground mt-1">{user?.email || "—"}</p>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Subscription</Label>
            <div className="mt-1">
              <Badge variant="secondary">{PLAN_LIMITS[plan as PlanType].label}</Badge>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-xs font-medium text-muted-foreground">Display Name</Label>
            <div className="flex gap-2">
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="max-w-xs"
              />
              <Button onClick={handleSaveName} disabled={savingName} size="sm">
                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Save
              </Button>
            </div>
          </div>
        </div>

        {/* Connected Stores */}
        <div className="border border-border rounded-lg bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Store className="w-4 h-4" />
              Connected Stores
            </h3>
            <Button variant="outline" size="sm" onClick={() => setShowAddStore((v) => !v)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Store
            </Button>
          </div>

          {showAddStore && (
            <div className="border border-dashed border-border rounded-lg p-3 bg-muted/30 space-y-2">
              <p className="text-xs text-muted-foreground">
                Enter your Shopify store domain (e.g., <code className="text-foreground">my-store.myshopify.com</code>)
              </p>
              <div className="flex gap-2">
                <Input
                  value={newShopDomain}
                  onChange={(e) => setNewShopDomain(e.target.value)}
                  placeholder="my-store.myshopify.com"
                  onKeyDown={(e) => e.key === "Enter" && handleConnectStore()}
                />
                <Button size="sm" onClick={handleConnectStore} disabled={connecting || !newShopDomain.trim()}>
                  {connecting ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5 mr-1.5" />}
                  {connecting ? "Connecting..." : "Connect"}
                </Button>
              </div>
            </div>
          )}

          {storesLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Loading stores…
            </p>
          ) : stores.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No stores connected yet.
            </p>
          ) : (
            <div className="space-y-2">
              {stores.map((store) => (
                <div key={store.id} className="flex items-center gap-3 px-3 py-2.5 border border-border rounded-md bg-background">
                  <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{store.store_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{store.shop_domain}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => { setDeleteConfirm(store); setDeleteInput(""); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="border border-border rounded-lg bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Change Password
          </h3>
          <div className="space-y-3 max-w-xs">
            <div>
              <Label htmlFor="currentPassword" className="text-xs text-muted-foreground">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <div>
              <Label htmlFor="newPassword" className="text-xs text-muted-foreground">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword || !currentPassword} size="sm">
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Update Password
            </Button>
          </div>
        </div>

        <Separator />

        {/* Legal */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Legal
          </h3>

          <div className="border border-border rounded-lg bg-card divide-y divide-border">
            <Link
              to="/privacy"
              className="flex items-center justify-between px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Privacy Policy
              </span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link
              to="/terms"
              className="flex items-center justify-between px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Terms & Conditions
              </span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>

      {/* Disconnect confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) { setDeleteConfirm(null); setDeleteInput(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect store?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently disconnect <strong className="text-foreground">{deleteConfirm?.store_name}</strong> and remove all its synced products from SyncroNice.
              <span className="block mt-3">
                Type <strong className="text-foreground">{deleteConfirm?.store_name}</strong> to confirm:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            placeholder={deleteConfirm?.store_name}
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnectStore}
              disabled={deleteInput !== deleteConfirm?.store_name}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
