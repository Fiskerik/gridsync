import { InlineStack, Text } from "@shopify/polaris";

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
        <button
          onClick={onBulkActions}
          disabled={selectedCount === 0}
          className="Polaris-Button Polaris-Button--sizeSlim flex items-center gap-1 px-2 md:px-3 py-1.5 text-xs md:text-sm border border-input rounded-md text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="hidden sm:inline">Bulk actions</span>
          <span className="sm:hidden">Bulk</span>
        </button>
        <button
          onClick={onDiscardAll}
          disabled={stagedChanges === 0}
          className="px-2 md:px-3 py-1.5 text-xs md:text-sm border border-destructive/30 rounded-md text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="hidden sm:inline">Discard all</span>
          <span className="sm:hidden">Discard</span>
        </button>
        <button
          onClick={onReviewApply}
          disabled={stagedChanges === 0}
          className="px-2 md:px-3 py-1.5 text-xs md:text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
        >
          <span className="hidden sm:inline">Review & Apply</span>
          <span className="sm:hidden">Apply</span>
        </button>
      </div>
    </div>
  );
}
