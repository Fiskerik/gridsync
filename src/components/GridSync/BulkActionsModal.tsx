import { useState } from "react";
import { X, ArrowUpDown, Replace, DollarSign, Tag, Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Category } from "@/hooks/useCategories";

type BulkAction = "price_percent" | "price_set" | "find_replace" | "set_tags" | "set_category";

interface BulkActionsModalProps {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  onApplyAction: (action: BulkAction | string, params: Record<string, string>) => void;
  categories?: Category[];
}

const actions: { id: BulkAction; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "price_percent", label: "Adjust prices by %", icon: <ArrowUpDown className="w-4 h-4" />, description: "Increase or decrease prices by a percentage" },
  { id: "price_set", label: "Set price", icon: <DollarSign className="w-4 h-4" />, description: "Set a fixed price for all selected products" },
  { id: "find_replace", label: "Find & Replace", icon: <Replace className="w-4 h-4" />, description: "Find and replace text in titles or descriptions" },
  { id: "set_tags", label: "Add / Remove tags", icon: <Tag className="w-4 h-4" />, description: "Add or remove tags from selected products" },
  { id: "set_category", label: "Assign / Remove category", icon: <Layers className="w-4 h-4" />, description: "Assign or remove a category label from selected products" },
];

export function BulkActionsModal({ open, onClose, selectedCount, onApplyAction, categories = [] }: BulkActionsModalProps) {
  const [selectedAction, setSelectedAction] = useState<BulkAction | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});

  const handleApply = () => {
    if (selectedAction) {
      onApplyAction(selectedAction, params);
      setSelectedAction(null);
      setParams({});
      onClose();
    }
  };

  const renderForm = () => {
    switch (selectedAction) {
      case "price_percent":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Adjustment (%)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input type="number" placeholder="e.g. 10 or -15" value={params.percent || ""}
                  onChange={(e) => setParams({ ...params, percent: e.target.value })} />
                <span className="text-sm text-muted-foreground whitespace-nowrap">% change</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Positive = increase, negative = decrease</p>
            </div>
            <div>
              <Label className="text-sm">Apply to</Label>
              <Select value={params.field || "price"} onValueChange={(v) => setParams({ ...params, field: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="compareAtPrice">Compare-at price</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "price_set":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-sm">New price ($)</Label>
              <Input type="number" placeholder="0.00" className="mt-1" value={params.price || ""}
                onChange={(e) => setParams({ ...params, price: e.target.value })} />
            </div>
            <div>
              <Label className="text-sm">Apply to</Label>
              <Select value={params.field || "price"} onValueChange={(v) => setParams({ ...params, field: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="compareAtPrice">Compare-at price</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "find_replace":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Find</Label>
              <Input placeholder="Text to find..." className="mt-1" value={params.find || ""}
                onChange={(e) => setParams({ ...params, find: e.target.value })} />
            </div>
            <div>
              <Label className="text-sm">Replace with</Label>
              <Input placeholder="Replacement text..." className="mt-1" value={params.replace || ""}
                onChange={(e) => setParams({ ...params, replace: e.target.value })} />
            </div>
            <div>
              <Label className="text-sm">In field</Label>
              <Select value={params.field || "title"} onValueChange={(v) => setParams({ ...params, field: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="description">Description</SelectItem>
                  <SelectItem value="seoTitle">SEO Title</SelectItem>
                  <SelectItem value="seoDescription">SEO Description</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "set_tags":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Tags (comma-separated)</Label>
              <Input placeholder="e.g. sale, featured, summer" className="mt-1" value={params.tags || ""}
                onChange={(e) => setParams({ ...params, tags: e.target.value })} />
            </div>
            <div>
              <Label className="text-sm">Action</Label>
              <Select value={params.action || "add"} onValueChange={(v) => setParams({ ...params, action: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add tags</SelectItem>
                  <SelectItem value="remove">Remove tags</SelectItem>
                  <SelectItem value="replace">Replace all tags</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "set_category":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Category</Label>
              {categories.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-1">No categories created yet. Create one from the Category column in the product grid.</p>
              ) : (
                <Select value={params.categoryId || ""} onValueChange={(v) => setParams({ ...params, categoryId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-sm">Action</Label>
              <Select value={params.action || "add"} onValueChange={(v) => setParams({ ...params, action: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Assign category</SelectItem>
                  <SelectItem value="remove">Remove category</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Bulk Actions — {selectedCount} products selected
          </DialogTitle>
        </DialogHeader>

        {!selectedAction ? (
          <div className="grid gap-2 py-2">
            {actions.map((a) => (
              <button key={a.id} onClick={() => { setSelectedAction(a.id); setParams({}); }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg border border-border hover:bg-muted transition-colors text-left">
                <div className="p-2 rounded-md bg-primary/10 text-primary">{a.icon}</div>
                <div>
                  <p className="text-sm font-medium text-foreground">{a.label}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-2">
            <button onClick={() => setSelectedAction(null)} className="text-xs text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1">
              ← Back to actions
            </button>
            {renderForm()}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {selectedAction && (
            <Button onClick={handleApply} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Apply to {selectedCount} products
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
