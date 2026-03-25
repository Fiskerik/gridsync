import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Lock, Shield, FileText, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export function ProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || "");
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

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

          <div className="border border-border rounded-lg bg-card">
            <button
              onClick={() => setShowPrivacy(!showPrivacy)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Privacy Policy
              </span>
              <span className="text-muted-foreground text-xs">{showPrivacy ? "Hide" : "Show"}</span>
            </button>
            {showPrivacy && (
              <div className="px-5 pb-4 text-xs text-muted-foreground leading-relaxed space-y-3 border-t border-border pt-3">
                <p><strong className="text-foreground">Last updated:</strong> March 25, 2026</p>
                <p>GridSync ("we", "our", "us") operates the GridSync platform. This Privacy Policy describes how we collect, use, and share your personal information when you use our service.</p>
                <p><strong className="text-foreground">Information We Collect:</strong> We collect information you provide directly, including your email address, display name, and Shopify store credentials. We also collect product data from your connected Shopify stores to enable bulk editing functionality.</p>
                <p><strong className="text-foreground">How We Use Your Information:</strong> We use your information to provide and improve our services, authenticate your identity, sync product data with Shopify, process scheduled edits, and communicate with you about your account.</p>
                <p><strong className="text-foreground">Data Storage:</strong> Your data is stored securely using Supabase infrastructure with Row Level Security (RLS) policies ensuring you can only access your own data. Shopify access tokens are encrypted at rest.</p>
                <p><strong className="text-foreground">Third-Party Services:</strong> We integrate with Shopify's API to read and write product data on your behalf. We do not sell or share your data with any other third parties.</p>
                <p><strong className="text-foreground">Data Retention:</strong> We retain your data for as long as your account is active. You can request deletion of your account and associated data at any time by contacting support.</p>
                <p><strong className="text-foreground">Contact:</strong> For privacy-related inquiries, please contact us at support@gridsync.app.</p>
              </div>
            )}
          </div>

          <div className="border border-border rounded-lg bg-card">
            <button
              onClick={() => setShowTerms(!showTerms)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Terms & Conditions
              </span>
              <span className="text-muted-foreground text-xs">{showTerms ? "Hide" : "Show"}</span>
            </button>
            {showTerms && (
              <div className="px-5 pb-4 text-xs text-muted-foreground leading-relaxed space-y-3 border-t border-border pt-3">
                <p><strong className="text-foreground">Last updated:</strong> March 25, 2026</p>
                <p>By accessing or using GridSync, you agree to be bound by these Terms & Conditions. If you do not agree, you may not use the service.</p>
                <p><strong className="text-foreground">Service Description:</strong> GridSync is a bulk product editing tool for Shopify merchants. It allows you to view, edit, and push product changes to your connected Shopify store(s).</p>
                <p><strong className="text-foreground">Account Responsibility:</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate Shopify store information.</p>
                <p><strong className="text-foreground">Acceptable Use:</strong> You agree not to use the service to violate any laws, infringe on intellectual property, or perform actions that could harm the platform or other users.</p>
                <p><strong className="text-foreground">Limitation of Liability:</strong> GridSync is provided "as is" without warranties. We are not liable for any damages arising from your use of the service, including but not limited to data loss, incorrect product updates, or Shopify API errors. You are responsible for reviewing changes before applying them.</p>
                <p><strong className="text-foreground">Modifications:</strong> We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of updated terms.</p>
                <p><strong className="text-foreground">Termination:</strong> We may suspend or terminate your access to the service at our discretion if you violate these terms.</p>
                <p><strong className="text-foreground">Contact:</strong> For questions about these terms, contact us at support@gridsync.app.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
