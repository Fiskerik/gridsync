import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApplyProgressProps {
  open: boolean;
  totalChanges: number;
  onComplete: () => void;
}

export function ApplyProgress({ open, totalChanges, onComplete }: ApplyProgressProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"validating" | "applying" | "done">("validating");

  useEffect(() => {
    if (!open) { setProgress(0); setPhase("validating"); return; }

    const t1 = setTimeout(() => { setPhase("applying"); setProgress(10); }, 600);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setPhase("done");
          return 100;
        }
        return Math.min(p + Math.random() * 15 + 5, 100);
      });
    }, 300);

    return () => { clearTimeout(t1); clearInterval(interval); };
  }, [open, onComplete]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" />
      <div className="relative bg-card rounded-xl border border-border shadow-2xl p-8 w-full max-w-sm text-center">
        {phase === "done" ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground">Changes applied!</h3>
            <p className="text-sm text-muted-foreground mt-1">{totalChanges} fields updated successfully. A snapshot has been saved.</p>
            <Button onClick={onComplete} className="mt-4">
              OK
            </Button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <h3 className="text-lg font-semibold text-foreground">
              {phase === "validating" ? "Validating changes..." : "Applying changes..."}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {phase === "validating" ? "Running safety checks" : `${Math.round(progress)}% complete`}
            </p>
            {phase === "applying" && (
              <div className="mt-4 w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
