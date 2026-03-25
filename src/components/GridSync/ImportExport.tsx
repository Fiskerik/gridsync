import { useState, useRef, useCallback } from "react";
import { Upload, Download, FileText, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockProducts, Product } from "@/data/mockProducts";

type ImportStatus = "idle" | "preview" | "importing" | "done" | "error";

interface ParsedRow {
  data: Record<string, string>;
  errors: string[];
}

const EXPORTABLE_FIELDS: (keyof Product)[] = [
  "id", "title", "description", "sku", "price", "compareAtPrice",
  "inventory", "status", "vendor", "productType", "tags", "seoTitle", "seoDescription",
];

function productsToCsv(products: Product[]): string {
  const header = EXPORTABLE_FIELDS.join(",");
  const rows = products.map((p) =>
    EXPORTABLE_FIELDS.map((f) => {
      const val = p[f];
      if (Array.isArray(val)) return `"${val.join("; ")}"`;
      if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n")))
        return `"${val.replace(/"/g, '""')}"`;
      return val ?? "";
    }).join(",")
  );
  return [header, ...rows].join("\n");
}

function parseCsv(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const data: Record<string, string> = {};
    const errors: string[] = [];
    headers.forEach((h, idx) => {
      data[h] = values[idx] ?? "";
    });

    if (!data.title?.trim()) errors.push("Missing title");
    if (data.price && isNaN(Number(data.price))) errors.push("Invalid price");
    if (data.inventory && isNaN(Number(data.inventory))) errors.push("Invalid inventory");

    rows.push({ data, errors });
  }

  return { headers, rows };
}

export function ImportExport() {
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: ParsedRow[] }>({ headers: [], rows: [] });
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      setParsedData(parsed);
      setImportStatus("preview");
    };
    reader.readAsText(file);
  }, []);

  const handleExport = useCallback(() => {
    const csv = productsToCsv(mockProducts);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(() => {
    setImportStatus("importing");
    setTimeout(() => setImportStatus("done"), 1500);
  }, []);

  const handleReset = useCallback(() => {
    setImportStatus("idle");
    setParsedData({ headers: [], rows: [] });
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const validRows = parsedData.rows.filter((r) => r.errors.length === 0);
  const errorRows = parsedData.rows.filter((r) => r.errors.length > 0);

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground">Import / Export</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a CSV to bulk-update products, or download your current catalog.
        </p>
      </div>

      {/* Export Section */}
      <div className="border border-border rounded-lg p-5 mb-6 bg-card">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">Export Products</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Download all {mockProducts.length} products as a CSV file. Includes title, price, inventory, SEO fields, and more.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download CSV
          </Button>
        </div>
      </div>

      {/* Import Section */}
      <div className="border border-border rounded-lg p-5 bg-card">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">Import Products</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload a CSV to create or update products. Columns are matched by header name.
            </p>
          </div>
        </div>

        {importStatus === "idle" && (
          <label className="block border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Drop a CSV file here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Supports .csv files up to 10MB</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
          </label>
        )}

        {importStatus === "preview" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{fileName}</span>
                <Badge variant="secondary" className="text-[10px]">{parsedData.rows.length} rows</Badge>
              </div>
              <button onClick={handleReset} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1 border border-border rounded-md p-3 bg-success/5">
                <div className="text-lg font-semibold text-success">{validRows.length}</div>
                <div className="text-xs text-muted-foreground">Valid rows</div>
              </div>
              <div className="flex-1 border border-border rounded-md p-3 bg-destructive/5">
                <div className="text-lg font-semibold text-destructive">{errorRows.length}</div>
                <div className="text-xs text-muted-foreground">Rows with errors</div>
              </div>
              <div className="flex-1 border border-border rounded-md p-3">
                <div className="text-lg font-semibold text-foreground">{parsedData.headers.length}</div>
                <div className="text-xs text-muted-foreground">Columns detected</div>
              </div>
            </div>

            {/* Error details */}
            {errorRows.length > 0 && (
              <div className="mb-4 border border-destructive/20 rounded-md p-3 bg-destructive/5">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-xs font-medium text-destructive">Issues found</span>
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {errorRows.slice(0, 10).map((r, i) => (
                    <div key={i} className="text-xs text-destructive/80">
                      Row {parsedData.rows.indexOf(r) + 2}: {r.errors.join(", ")}
                    </div>
                  ))}
                  {errorRows.length > 10 && (
                    <div className="text-xs text-muted-foreground">...and {errorRows.length - 10} more</div>
                  )}
                </div>
              </div>
            )}

            {/* Preview table */}
            <div className="border border-border rounded-md overflow-hidden mb-4">
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      {parsedData.headers.slice(0, 6).map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                      {parsedData.headers.length > 6 && (
                        <th className="text-left px-3 py-2 text-muted-foreground">+{parsedData.headers.length - 6} more</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className={`border-t border-border ${row.errors.length > 0 ? "bg-destructive/5" : ""}`}>
                        {parsedData.headers.slice(0, 6).map((h) => (
                          <td key={h} className="px-3 py-1.5 text-foreground whitespace-nowrap max-w-[150px] truncate">{row.data[h]}</td>
                        ))}
                        {parsedData.headers.length > 6 && <td className="px-3 py-1.5 text-muted-foreground">…</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>Cancel</Button>
              <Button size="sm" onClick={handleImport} disabled={validRows.length === 0}
                className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Import {validRows.length} rows
              </Button>
            </div>
          </div>
        )}

        {importStatus === "importing" && (
          <div className="text-center py-8">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">Importing products...</p>
            <p className="text-xs text-muted-foreground mt-1">Processing {validRows.length} rows</p>
          </div>
        )}

        {importStatus === "done" && (
          <div className="text-center py-8">
            <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Import complete!</p>
            <p className="text-xs text-muted-foreground mt-1">{validRows.length} products imported successfully.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleReset}>
              Import another file
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
