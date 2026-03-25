import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Clock, Plus, Trash2, Play, Pause, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Product } from "@/data/mockProducts";
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

interface ScheduledJobsProps {
  products: Product[];
}

export function ScheduledJobs({ products }: ScheduledJobsProps) {
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
  };

  const handleCancel = async (jobId: string) => {
    const { error } = await supabase
      .from("scheduled_jobs")
      .update({ status: "cancelled" })
      .eq("id", jobId);
    if (!error) {
      toast.success("Job cancelled.");
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

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllProducts = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p) => p.id)));
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
            <h3 className="text-sm font-semibold text-foreground">New Scheduled Job</h3>

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
                <button onClick={toggleAllProducts} className="text-xs text-primary hover:underline">
                  {selectedProducts.size === products.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="max-h-40 overflow-auto border border-input rounded-md bg-background">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 cursor-pointer text-sm">
                    <input type="checkbox" checked={selectedProducts.has(p.id)} onChange={() => toggleProduct(p.id)}
                      className="rounded border-input" />
                    <span className="text-foreground">{p.title}</span>
                    <span className="text-muted-foreground text-xs ml-auto">{p.sku}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} size="sm">Schedule Job</Button>
              <Button onClick={() => { setCreating(false); resetForm(); }} variant="outline" size="sm">Cancel</Button>
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
                  {job.status === "pending" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleCancel(job.id)}>
                      <Pause className="w-4 h-4" />
                    </Button>
                  )}
                  {(job.status === "completed" || job.status === "cancelled" || job.status === "failed") && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(job.id)}>
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
