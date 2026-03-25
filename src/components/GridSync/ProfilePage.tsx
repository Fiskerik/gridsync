import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Lock, Shield, FileText, Loader2, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function ProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || "");
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPassword(true);
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

        {/* Change Password */}
        <div className="border border-border rounded-lg bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Change Password
          </h3>
          <div className="space-y-3 max-w-xs">
            <div>
              <Label htmlFor="newPassword" className="text-xs text-muted-foreground">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
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
              />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword} size="sm">
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
    </div>
  );
}
