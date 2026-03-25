import { Button as PolarisButton, InlineStack, Text, Badge as PolarisBadge } from "@shopify/polaris";
import { Layers } from "lucide-react";

interface StatusBarProps {
  selectedCount: number;
  stagedChanges: number;
  onBulkActions: () => void;
  onReviewApply: () => void;
  onDiscardAll: () => void;
}

export function StatusBar({
  selectedCount,
  stagedChanges,
  onBulkActions,
  onReviewApply,
  onDiscardAll,
}: StatusBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-4 px-3 md:px-4 py-2 md:py-2.5 border-t border-border bg-muted/40">
      <InlineStack gap="200" blockAlign="center">
        <Text as="span" variant="bodySm" fontWeight="semibold">{selectedCount} sel.</Text>
        <span className="text-muted-foreground hidden md:inline">|</span>
        <span className={`text-xs md:text-sm font-medium ${stagedChanges > 0 ? "text-accent" : "text-muted-foreground"}`}>
          {stagedChanges} staged
        </span>
      </InlineStack>

      <div className="ml-auto flex items-center gap-1.5 md:gap-2">
        <PolarisButton
          onClick={onBulkActions}
          disabled={selectedCount === 0}
          variant="secondary"
          size="micro"
          icon={<Layers className="w-3.5 h-3.5" />}
        >
          <span className="hidden sm:inline">Bulk actions</span>
          <span className="sm:hidden">Bulk</span>
        </PolarisButton>
        <PolarisButton
          onClick={onDiscardAll}
          disabled={stagedChanges === 0}
          variant="secondary"
          size="micro"
          tone="critical"
        >
          <span className="hidden sm:inline">Discard all</span>
          <span className="sm:hidden">Discard</span>
        </PolarisButton>
        <PolarisButton
          onClick={onReviewApply}
          disabled={stagedChanges === 0}
          variant="primary"
          size="micro"
        >
          <span className="hidden sm:inline">Review & Apply</span>
          <span className="sm:hidden">Apply</span>
        </PolarisButton>
      </div>
    </div>
  );
}
