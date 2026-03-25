import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { CalendarIcon, Clock, Plus, Trash2, Pause, Play, Pencil, CheckCircle2, AlertCircle, Loader2, Columns3, ChevronDown, ArrowUpDown, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Product } from "@/data/mockProducts";
import { Category } from "@/hooks/useCategories";
import { toast } from "sonner";

interface ScheduledJob {
  id: string;
  name: string;
  action_type: string;
  action_params: Record<string, unknown>;
  product_ids: string[];
  scheduled_at: string;
  status: string;
  executed_at: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  price_percent: "Adjust price by %",
  price_fixed: "Adjust price by fixed amount",
  price_set: "Set fixed price",
  find_replace: "Find & replace text",
  set_tags: "Update tags",
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Badge className="bg-changed-background text-accent border-0 text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case "running":
      return <Badge className="bg-primary/10 text-primary border-0 text-xs"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
    case "completed":
      return <Badge className="bg-success/10 text-success border-0 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
    case "failed":
      return <Badge className="bg-destructive/10 text-destructive border-0 text-xs"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="text-muted-foreground text-xs">Cancelled</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

type ProductPickerColumn = "image" | "title" | "sku" | "price" | "inventory" | "status" | "vendor" | "category" | "tags" | "productType";
const ALL_PICKER_COLUMNS: { key: ProductPickerColumn; label: string }[] = [
  { key: "image", label: "Image" },
  { key: "title", label: "Title" },
  { key: "sku", label: "SKU" },
  { key: "price", label: "Price" },
  { key: "inventory", label: "Inventory" },
  { key: "status", label: "Status" },
  { key: "vendor", label: "Vendor" },
  { key: "category", label: "Category" },
  { key: "tags", label: "Tags" },
  { key: "productType", label: "Type" },
];
const DEFAULT_PICKER_COLS: ProductPickerColumn[] = ["image", "title", "sku", "price", "status"];

type SortDir = "asc" | "desc" | null;

interface ScheduledJobsProps {
  products: Product[];
  categories?: Category[];
  getProductsByCategory?: (categoryId: string) => string[];
  getProductCategories?: (productId: string) => Category[];
}

export function ScheduledJobs({ products, categories = [], getProductsByCategory, getProductCategories }: ScheduledJobsProps) {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [name, setName] = useState("");
  const [actionType, setActionType] = useState("price_percent");
  const [percent, setPercent] = useState("10");
  const [fixedPrice, setFixedPrice] = useState("0");
  const [field, setField] = useState("price");
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [tags, setTags] = useState("");
  const [tagAction, setTagAction] = useState("add");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("09:00");
  const [selectionMode, setSelectionMode] = useState<"manual" | "category">("manual");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Product picker state
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerCols, setPickerCols] = useState<ProductPickerColumn[]>(DEFAULT_PICKER_COLS);
  const [sortCol, setSortCol] = useState<ProductPickerColumn | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [filterCategoryId, setFilterCategoryId] = useState("");

  const fetchJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scheduled_jobs")
      .select("*")
      .order("scheduled_at", { ascending: false });
    if (!error && data) setJobs(data as unknown as ScheduledJob[]);
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, []);

  // When category selection changes, auto-select the products in that category
  useEffect(() => {
    if (selectionMode === "category" && selectedCategoryId && getProductsByCategory) {
      const productIds = getProductsByCategory(selectedCategoryId);
      setSelectedProducts(new Set(productIds));
    }
  }, [selectionMode, selectedCategoryId, getProductsByCategory]);

  // Filtered & sorted products for the picker
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Search filter
    if (pickerSearch.trim()) {
      const q = pickerSearch.toLowerCase();
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.vendor.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (filterCategoryId && getProductsByCategory) {
      const catProductIds = new Set(getProductsByCategory(filterCategoryId));
      list = list.filter((p) => catProductIds.has(p.id));
    }

    // Sort
    if (sortCol && sortDir) {
      list.sort((a, b) => {
        let aVal: string | number = "";
        let bVal: string | number = "";
        switch (sortCol) {
          case "title": aVal = a.title; bVal = b.title; break;
          case "sku": aVal = a.sku; bVal = b.sku; break;
          case "price": aVal = a.price; bVal = b.price; break;
          case "inventory": aVal = a.inventory; bVal = b.inventory; break;
          case "status": aVal = a.status; bVal = b.status; break;
          case "vendor": aVal = a.vendor; bVal = b.vendor; break;
          case "productType": aVal = a.productType; bVal = b.productType; break;
          default: return 0;
        }
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        }
        return sortDir === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }

    return list;
  }, [products, pickerSearch, filterCategoryId, getProductsByCategory, sortCol, sortDir]);

  const handleCreate = async () => {
    if (!date || selectedProducts.size === 0 || !name.trim()) {
      toast.error("Please fill in name, select products, and pick a date.");
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    const scheduledAt = new Date(date);
    scheduledAt.setHours(hours, minutes, 0, 0);

    if (scheduledAt <= new Date()) {
      toast.error("Scheduled time must be in the future.");
      return;
    }

    let actionParams: Record<string, string> = {};
    if (actionType === "price_percent") actionParams = { percent, field };
    else if (actionType === "price_fixed") actionParams = { amount: fixedAmount, field };
    else if (actionType === "price_set") actionParams = { price: fixedPrice, field };
    else if (actionType === "find_replace") actionParams = { field, find: findText, replace: replaceText };
    else if (actionType === "set_tags") actionParams = { tags, action: tagAction };

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("You must be logged in to schedule jobs.");
      return;
    }

    const { error } = await supabase.from("scheduled_jobs").insert({
      user_id: userData.user.id,
      name: name.trim(),
      action_type: actionType,
      action_params: actionParams,
      product_ids: Array.from(selectedProducts),
      scheduled_at: scheduledAt.toISOString(),
    });

    if (error) {
      toast.error("Failed to create scheduled job.");
      return;
    }

    toast.success("Job scheduled successfully!");
    setCreating(false);
    resetForm();
    fetchJobs();
  };

  const resetForm = () => {
    setName("");
    setActionType("price_percent");
    setPercent("10");
    setFixedPrice("0");
    setField("price");
    setFindText("");
    setReplaceText("");
    setTags("");
    setTagAction("add");
    setSelectedProducts(new Set());
    setDate(undefined);
    setTime("09:00");
    setSelectionMode("manual");
    setSelectedCategoryId("");
    setPickerSearch("");
    setFilterCategoryId("");
  };

  const handleCancel = async (jobId: string) => {
    const { error } = await supabase
      .from("scheduled_jobs")
      .update({ status: "cancelled" })
      .eq("id", jobId);
    if (!error) {
      toast.success("Job paused.");
      fetchJobs();
    }
  };

  const handleResume = async (jobId: string) => {
    const { error } = await supabase
      .from("scheduled_jobs")
      .update({ status: "pending" })
      .eq("id", jobId);
    if (!error) {
      toast.success("Job resumed.");
      fetchJobs();
    }
  };

  const handleDelete = async (jobId: string) => {
    const { error } = await supabase
      .from("scheduled_jobs")
      .delete()
      .eq("id", jobId);
    if (!error) {
      toast.success("Job deleted.");
      fetchJobs();
    }
  };

  const [editingJob, setEditingJob] = useState<ScheduledJob | null>(null);

  const handleEditJob = (job: ScheduledJob) => {
    setEditingJob(job);
    setName(job.name);
    setActionType(job.action_type);
    const params = job.action_params as Record<string, string>;
    if (job.action_type === "price_percent") {
      setPercent(params.percent || "10");
      setField(params.field || "price");
    } else if (job.action_type === "price_set") {
      setFixedPrice(params.price || "0");
      setField(params.field || "price");
    } else if (job.action_type === "find_replace") {
      setField(params.field || "title");
      setFindText(params.find || "");
      setReplaceText(params.replace || "");
    } else if (job.action_type === "set_tags") {
      setTags(params.tags || "");
      setTagAction(params.action || "add");
    }
    setSelectedProducts(new Set(job.product_ids));
    setDate(new Date(job.scheduled_at));
    const d = new Date(job.scheduled_at);
    setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    setCreating(true);
  };

  const handleSaveEdit = async () => {
    if (!editingJob || !date || selectedProducts.size === 0 || !name.trim()) {
      toast.error("Please fill in name, select products, and pick a date.");
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    const scheduledAt = new Date(date);
    scheduledAt.setHours(hours, minutes, 0, 0);

    let actionParams: Record<string, string> = {};
    if (actionType === "price_percent") actionParams = { percent, field };
    else if (actionType === "price_set") actionParams = { price: fixedPrice, field };
    else if (actionType === "find_replace") actionParams = { field, find: findText, replace: replaceText };
    else if (actionType === "set_tags") actionParams = { tags, action: tagAction };

    const { error } = await supabase
      .from("scheduled_jobs")
      .update({
        name: name.trim(),
        action_type: actionType,
        action_params: actionParams,
        product_ids: Array.from(selectedProducts),
        scheduled_at: scheduledAt.toISOString(),
      })
      .eq("id", editingJob.id);

    if (error) {
      toast.error("Failed to update job.");
      return;
    }

    toast.success("Job updated!");
    setCreating(false);
    setEditingJob(null);
    resetForm();
    fetchJobs();
  };

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    const allFilteredIds = filteredProducts.map((p) => p.id);
    const allSelected = allFilteredIds.every((id) => selectedProducts.has(id));
    if (allSelected) {
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleSort = (col: ProductPickerColumn) => {
    if (sortCol === col) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortCol(null); setSortDir(null); }
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const togglePickerCol = (key: ProductPickerColumn) => {
    if (pickerCols.includes(key)) {
      if (pickerCols.length > 1) setPickerCols(pickerCols.filter((c) => c !== key));
    } else {
      setPickerCols([...pickerCols, key]);
    }
  };

  const renderPickerCell = (p: Product, col: ProductPickerColumn) => {
    switch (col) {
      case "image":
        return p.imageUrl ? (
          <img src={p.imageUrl} alt={p.title} className="w-8 h-8 rounded object-cover border border-border" />
        ) : (
          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground text-[9px]">—</div>
        );
      case "title":
        return <span className="text-foreground font-medium truncate block">{p.title}</span>;
      case "sku":
        return <span className="text-muted-foreground font-mono text-xs">{p.sku || "—"}</span>;
      case "price":
        return <span className="text-foreground text-xs">${p.price.toFixed(2)}</span>;
      case "inventory":
        return (
          <span className={cn("text-xs font-medium", p.inventory === 0 ? "text-destructive" : p.inventory < 20 ? "text-accent" : "text-success")}>
            {p.inventory}
          </span>
        );
      case "status":
        return (
          <span className={cn("text-xs font-medium capitalize", p.status === "active" ? "text-status-active" : p.status === "draft" ? "text-status-draft" : "text-muted-foreground")}>
            {p.status}
          </span>
        );
      case "vendor":
        return <span className="text-muted-foreground text-xs truncate block">{p.vendor || "—"}</span>;
      case "category": {
        const cats = getProductCategories?.(p.id) || [];
        if (cats.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <div className="flex flex-wrap gap-0.5">
            {cats.map((c) => (
              <span key={c.id} className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: c.color }}>
                {c.name}
              </span>
            ))}
          </div>
        );
      }
      case "tags": {
        if (!p.tags.length) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <div className="flex flex-wrap gap-0.5">
            {p.tags.slice(0, 2).map((t) => (
              <Badge key={t} variant="outline" className="text-[9px] px-1 py-0 font-normal">{t}</Badge>
            ))}
            {p.tags.length > 2 && <span className="text-[9px] text-muted-foreground">+{p.tags.length - 2}</span>}
          </div>
        );
      }
      case "productType":
        return <span className="text-muted-foreground text-xs">{p.productType || "—"}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Scheduled Jobs</h2>
            <p className="text-sm text-muted-foreground">Schedule bulk edits to run at a future date and time.</p>
          </div>
          <Button onClick={() => setCreating(!creating)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Schedule New Job
          </Button>
        </div>

        {/* Create Form */}
        {creating && (
          <div className="border border-border rounded-lg bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">{editingJob ? "Edit Scheduled Job" : "New Scheduled Job"}</h3>

            {/* Name */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Job Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Summer sale price increase"
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Action type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Action</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Action params */}
            <div className="grid grid-cols-2 gap-3">
              {actionType === "price_percent" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Percentage (%)</label>
                    <input type="number" value={percent} onChange={(e) => setPercent(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Field</label>
                    <select value={field} onChange={(e) => setField(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                      <option value="price">Price</option>
                      <option value="compareAtPrice">Compare at Price</option>
                    </select>
                  </div>
                </>
              )}
              {actionType === "price_set" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Price ($)</label>
                    <input type="number" value={fixedPrice} onChange={(e) => setFixedPrice(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Field</label>
                    <select value={field} onChange={(e) => setField(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                      <option value="price">Price</option>
                      <option value="compareAtPrice">Compare at Price</option>
                    </select>
                  </div>
                </>
              )}
              {actionType === "find_replace" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Find</label>
                    <input value={findText} onChange={(e) => setFindText(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Replace with</label>
                    <input value={replaceText} onChange={(e) => setReplaceText(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                </>
              )}
              {actionType === "set_tags" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (comma separated)</label>
                    <input value={tags} onChange={(e) => setTags(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Action</label>
                    <select value={tagAction} onChange={(e) => setTagAction(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                      <option value="add">Add tags</option>
                      <option value="remove">Remove tags</option>
                      <option value="replace">Replace all tags</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Date/Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) => d < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Time</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>

            {/* Product selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Products ({selectedProducts.size} selected)</label>
                <div className="flex items-center gap-2">
                  {categories.length > 0 && (
                    <div className="flex items-center gap-1 border border-input rounded-md overflow-hidden">
                      <button
                        onClick={() => { setSelectionMode("manual"); setSelectedCategoryId(""); }}
                        className={`px-2 py-1 text-xs transition-colors ${selectionMode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                      >
                        Manual
                      </button>
                      <button
                        onClick={() => setSelectionMode("category")}
                        className={`px-2 py-1 text-xs transition-colors ${selectionMode === "category" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                      >
                        By Category
                      </button>
                    </div>
                  )}
                  {selectionMode === "manual" && (
                    <button onClick={toggleAllFiltered} className="text-xs text-primary hover:underline">
                      {filteredProducts.every((p) => selectedProducts.has(p.id)) && filteredProducts.length > 0 ? "Deselect all" : "Select all"}
                    </button>
                  )}
                </div>
              </div>

              {selectionMode === "category" && categories.length > 0 && (
                <div className="mb-2">
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select a category...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Picker toolbar: search, filter by label, column visibility */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <div className="relative flex-1 min-w-[120px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search…"
                    className="w-full pl-7 pr-2 py-1.5 text-xs bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                {categories.length > 0 && selectionMode === "manual" && (
                  <select
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                    className="px-2 py-1.5 text-xs bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">All labels</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 px-2 py-1.5 text-xs border border-input rounded-md text-foreground hover:bg-secondary transition-colors">
                      <Columns3 className="w-3 h-3" />
                      <span className="text-muted-foreground">{pickerCols.length}</span>
                      <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {ALL_PICKER_COLUMNS.map((col) => (
                      <DropdownMenuCheckboxItem
                        key={col.key}
                        checked={pickerCols.includes(col.key)}
                        onCheckedChange={() => togglePickerCol(col.key)}
                      >
                        {col.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Product table */}
              <div className="max-h-64 overflow-auto border border-input rounded-md bg-background">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
                    <tr className="border-b border-border">
                      <th className="w-8 px-2 py-1.5">
                        <Checkbox
                          checked={filteredProducts.length > 0 && filteredProducts.every((p) => selectedProducts.has(p.id))}
                          onCheckedChange={toggleAllFiltered}
                        />
                      </th>
                      {pickerCols.map((col) => (
                        <th
                          key={col}
                          className="px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                          onClick={() => col !== "image" && col !== "category" && col !== "tags" && handleSort(col)}
                        >
                          <span className="flex items-center gap-1">
                            {ALL_PICKER_COLUMNS.find((c) => c.key === col)?.label}
                            {sortCol === col && (
                              <ArrowUpDown className="w-2.5 h-2.5 text-primary" />
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={pickerCols.length + 1} className="px-3 py-6 text-center text-muted-foreground">
                          No products match filters
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => (
                        <tr
                          key={p.id}
                          className={cn(
                            "border-b border-border/50 transition-colors cursor-pointer",
                            selectedProducts.has(p.id) ? "bg-primary/5" : "hover:bg-muted/30"
                          )}
                          onClick={() => toggleProduct(p.id)}
                        >
                          <td className="px-2 py-1.5">
                            <Checkbox
                              checked={selectedProducts.has(p.id)}
                              onCheckedChange={() => toggleProduct(p.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          {pickerCols.map((col) => (
                            <td key={col} className="px-2 py-1.5">
                              {renderPickerCell(p, col)}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Showing {filteredProducts.length} of {products.length} products
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {editingJob ? (
                <Button onClick={handleSaveEdit} size="sm">Save Changes</Button>
              ) : (
                <Button onClick={handleCreate} size="sm">Schedule Job</Button>
              )}
              <Button onClick={() => { setCreating(false); setEditingJob(null); resetForm(); }} variant="outline" size="sm">Cancel</Button>
            </div>
          </div>
        )}

        {/* Jobs list */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading scheduled jobs…
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-foreground mb-1">No scheduled jobs yet</p>
            <p className="text-xs">Click "Schedule New Job" to create one.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div key={job.id} className="border border-border rounded-lg bg-card p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground truncate">{job.name || "Untitled Job"}</span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{ACTION_LABELS[job.action_type] || job.action_type}</span>
                    <span>·</span>
                    <span>{job.product_ids.length} products</span>
                    <span>·</span>
                    <span>Scheduled for {format(new Date(job.scheduled_at), "PPP 'at' p")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {(job.status === "pending" || job.status === "cancelled") && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEditJob(job)} title="Edit job">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  {job.status === "pending" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent" onClick={() => handleCancel(job.id)} title="Pause job">
                      <Pause className="w-4 h-4" />
                    </Button>
                  )}
                  {job.status === "cancelled" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-success" onClick={() => handleResume(job.id)} title="Resume job">
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  {(job.status === "completed" || job.status === "cancelled" || job.status === "failed") && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(job.id)} title="Delete job">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
