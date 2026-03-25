import { useState, useCallback } from "react";
import { Download, FileSpreadsheet, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Product } from "@/data/mockProducts";

interface FieldOption {
  key: keyof Product;
  label: string;
  default: boolean;
}

const FIELD_OPTIONS: FieldOption[] = [
  { key: "id", label: "Product ID", default: true },
  { key: "title", label: "Title", default: true },
  { key: "description", label: "Description", default: true },
  { key: "sku", label: "SKU", default: true },
  { key: "price", label: "Price", default: true },
  { key: "compareAtPrice", label: "Compare-at Price", default: true },
  { key: "inventory", label: "Inventory", default: true },
  { key: "status", label: "Status", default: true },
  { key: "vendor", label: "Vendor", default: false },
  { key: "productType", label: "Product Type", default: false },
  { key: "tags", label: "Tags", default: true },
  { key: "seoTitle", label: "SEO Title", default: false },
  { key: "seoDescription", label: "SEO Description", default: false },
  { key: "variants", label: "Variants", default: false },
  { key: "createdAt", label: "Created At", default: false },
  { key: "updatedAt", label: "Updated At", default: false },
];

interface ExportCsvProps {
  products: Product[];
}

export function ExportCsv({ products }: ExportCsvProps) {
  const [selectedFields, setSelectedFields] = useState<Set<keyof Product>>(
    new Set(FIELD_OPTIONS.filter((f) => f.default).map((f) => f.key))
  );
  const [exported, setExported] = useState(false);

  const toggleField = useCallback((key: keyof Product) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleExport = useCallback(() => {
    const fields = FIELD_OPTIONS.filter((f) => selectedFields.has(f.key));
    const header = fields.map((f) => f.label).join(",");
    const rows = products.map((p) =>
      fields.map((f) => {
        const val = p[f.key];
        if (Array.isArray(val)) return `"${val.join("\t")}"`;
        if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n")))
          return `"${val.replace(/"/g, '""')}"`;
        return val ?? "";
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }, [selectedFields, products]);

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Export CSV</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose which fields to include and download your product catalog.
        </p>
      </div>

      <div className="border border-border rounded-lg p-5 bg-card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Select Fields</h3>
            <p className="text-xs text-muted-foreground">
              {selectedFields.size} of {FIELD_OPTIONS.length} fields selected
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {FIELD_OPTIONS.map((f) => (
            <label
              key={f.key}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={selectedFields.has(f.key)}
                onCheckedChange={() => toggleField(f.key)}
              />
              <Label className="cursor-pointer text-sm">{f.label}</Label>
            </label>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-lg p-5 bg-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Ready to export {products.length} products
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedFields.size} fields × {products.length} products
            </p>
          </div>
          <Button
            onClick={handleExport}
            disabled={selectedFields.size === 0 || products.length === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {exported ? (
              <><Check className="w-4 h-4 mr-1.5" /> Downloaded!</>
            ) : (
              <><Download className="w-4 h-4 mr-1.5" /> Export CSV</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
