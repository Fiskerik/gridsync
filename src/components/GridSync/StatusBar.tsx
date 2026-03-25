interface StatusBarProps {
  selectedCount: number;
  stagedChanges: number;
  onBulkEditPrices: () => void;
  onBulkApplyTags: () => void;
  onDiscardAll: () => void;
}

export function StatusBar({
  selectedCount,
  stagedChanges,
  onBulkEditPrices,
  onBulkApplyTags,
  onDiscardAll,
}: StatusBarProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-muted/40">
      <span className="text-sm text-foreground font-medium">{selectedCount} selected</span>
      <span className="text-sm text-muted-foreground">|</span>
      <span className="text-sm font-medium" style={{ color: stagedChanges > 0 ? "hsl(var(--changed))" : undefined }}>
        {stagedChanges} staged changes
      </span>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onBulkEditPrices}
          disabled={selectedCount === 0}
          className="px-3 py-1.5 text-sm border border-input rounded-md text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Bulk edit selected prices
        </button>
        <button
          onClick={onBulkApplyTags}
          disabled={selectedCount === 0}
          className="px-3 py-1.5 text-sm border border-input rounded-md text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Bulk apply tags
        </button>
        <button
          onClick={onDiscardAll}
          disabled={stagedChanges === 0}
          className="px-3 py-1.5 text-sm border border-destructive/30 rounded-md text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Discard all changes
        </button>
      </div>
    </div>
  );
}
