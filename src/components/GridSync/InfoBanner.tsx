import { Info } from "lucide-react";

export function InfoBanner() {
  return (
    <div className="mx-3 md:mx-4 mt-2 md:mt-3 mb-1 flex items-start gap-2 md:gap-2.5 rounded-lg border border-border bg-changed-background px-3 md:px-3.5 py-2 md:py-2.5 text-xs md:text-sm">
      <Info className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
      <p className="text-foreground">
        <span className="hidden sm:inline">
          Editing directly in cells. Changes are staged — nothing saves until you click{" "}
          <strong className="font-semibold">Review &amp; Apply</strong>.{" "}
          <span className="text-muted-foreground">
            Blank cells are ignored (won't overwrite existing data).
          </span>
        </span>
        <span className="sm:hidden">
          Tap cells to edit. Changes are staged until you apply them.
        </span>
      </p>
    </div>
  );
}
