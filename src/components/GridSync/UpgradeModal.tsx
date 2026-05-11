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
import { Badge } from "@/components/ui/badge";
import { PlanType, PLAN_LIMITS } from "@/hooks/usePlan";
import { Crown, Zap, Rocket } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature: string;
  requiredPlan: PlanType;
  canUseTrial: boolean;
  onStartTrial: (plan: PlanType) => Promise<boolean>;
}

const planIcons: Record<PlanType, React.ReactNode> = {
  free: null,
  starter: <Zap className="h-5 w-5 text-yellow-500" />,
  growth: <Rocket className="h-5 w-5 text-purple-500" />,
};

export function UpgradeModal({ open, onClose, feature, requiredPlan, canUseTrial, onStartTrial }: UpgradeModalProps) {
  const planInfo = PLAN_LIMITS[requiredPlan];

  const handleTrial = async () => {
    const ok = await onStartTrial(requiredPlan);
    if (ok) onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Upgrade Required
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              <strong>{feature}</strong> requires the{" "}
              <Badge variant="secondary" className="mx-1">
                {planIcons[requiredPlan]} {planInfo.label}
              </Badge>{" "}
              plan or higher.
            </p>
            {requiredPlan === "starter" && (
              <ul className="text-sm space-y-1 pl-4 list-disc text-muted-foreground">
                <li>Up to 500 products</li>
                <li>Full editor with CSV diff preview</li>
                <li>Change history with rollback (30 days)</li>
                <li>Connect up to 3 Shopify stores</li>
              </ul>
            )}
            {requiredPlan === "growth" && (
              <ul className="text-sm space-y-1 pl-4 list-disc text-muted-foreground">
                <li>Unlimited products</li>
                <li>Scheduled jobs & bulk price rules</li>
                <li>Google Sheets sync</li>
                <li>Unlimited connected Shopify stores</li>
                <li>Change history with rollback (180 days)</li>
              </ul>
            )}
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Billing is handled securely through Shopify — the charge appears on your regular Shopify invoice.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {canUseTrial ? (
            <AlertDialogAction onClick={handleTrial}>
              Start 14-day Free Trial
            </AlertDialogAction>
          ) : (
            <AlertDialogAction disabled className="opacity-60">
              Trial already used — Contact us to upgrade
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
