import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Plus, QrCode, Search, TreeDeciduous, Edit2, Trash2, Copy, ScanLine, Camera, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import QrScanner from "@/components/sawmill/QrScanner";

interface SawmillLog {
  id: string;
  tag_number: string;
  girth_cm: number;
  girth_inch: number;
  length_meter: number;
  grade: string;
  cft: number;
  status: string;
  qr_data: string | null;
  notes: string | null;
  saw_mill_id: string | null;
  created_at: string;
}

interface LogFormData {
  tag_number: string;
  girth_cm: string;
  length_meter: string;
  grade: string;
  notes: string;
  saw_mill_id: string;
}

const emptyForm: LogFormData = {
  tag_number: "",
  girth_cm: "",
  length_meter: "",
  grade: "A",
  notes: "",
  saw_mill_id: "",
};

const grades = ["A", "B", "C", "D", "Rejected"];

const LogManagement = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [sawMills, setSawMills] = useState<any[]>([]);
  const [logs, setLogs] = useState<SawmillLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LogFormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTag, setSearchTag] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMill, setFilterMill] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lookupTag, setLookupTag] = useState("");
  const [lookupResult, setLookupResult] = useState<SawmillLog | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [qrScanMode, setQrScanMode] = useState<"lookup" | "add">("lookup");
  const [stats, setStats] = useState({ total_count: 0, total_cft: 0, available_count: 0, available_cft: 0, in_process_count: 0, in_process_cft: 0, processed_count: 0, processed_cft: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") setSortDirection("desc");
      else { setSortColumn(null); setSortDirection("asc"); }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLogs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLogs.map(l => l.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    // Delete in batches of 100
    let failed = 0;
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error } = await supabase.from("sawmill_logs").delete().in("id", batch);
      if (error) failed += batch.length;
    }
    setBulkDeleting(false);
    setBulkDeleteOpen(false);
    setSelectedIds(new Set());
    if (failed > 0) {
      toast.error(`${failed} logs could not be deleted (may be linked to production)`);
    } else {
      toast.success(`${ids.length} logs deleted successfully`);
    }
    fetchLogs();
    fetchStats();
  };

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) {
      fetchSawMills();
      fetchLogs();
      fetchStats();
    }
  }, [selectedCompany, filterMill]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    if (data && data.length > 0) {
      setCompanies(data);
      setSelectedCompany(data[0].id);
    }
    setLoading(false);
  };

  const fetchSawMills = async () => {
    const { data } = await supabase
      .from("saw_mills")
      .select("id, name")
      .eq("company_id", selectedCompany)
      .eq("is_active", true)
      .order("name");
    setSawMills(data || []);
  };

  const fetchStats = async () => {
    const { data, error } = await supabase.rpc("get_sawmill_logs_stats", {
      p_company_id: selectedCompany,
      p_mill_id: filterMill !== "all" ? filterMill : null,
    });
    if (!error && data) {
      setStats(data as any);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("sawmill_logs")
      .select("*")
      .eq("company_id", selectedCompany)
      .order("created_at", { ascending: false })
      .range(0, 4999);

    if (filterMill !== "all") {
      query = query.eq("saw_mill_id", filterMill);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Failed to fetch logs");
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const calculateCFT = (girthCm: number, lengthM: number) => {
    const girthInch = girthCm / 2.54;
    return (girthInch * girthInch * lengthM * 2.2072) / 10000;
  };

  const handleSubmit = async () => {
    if (!form.tag_number || !form.girth_cm || !form.length_meter) {
      toast.error("Tag Number, Girth, and Length are required");
      return;
    }

    setSaving(true);
    const girthCm = parseFloat(form.girth_cm);
    const lengthM = parseFloat(form.length_meter);
    const girthInch = girthCm / 2.54;
    const cft = calculateCFT(girthCm, lengthM);
    const qrData = JSON.stringify({
      tag: form.tag_number,
      girth_cm: girthCm,
      length_m: lengthM,
      grade: form.grade,
      cft: cft.toFixed(3),
    });

    const payload = {
      company_id: selectedCompany,
      saw_mill_id: form.saw_mill_id || null,
      tag_number: form.tag_number,
      girth_cm: girthCm,
      girth_inch: girthInch,
      length_meter: lengthM,
      cft: cft,
      grade: form.grade,
      notes: form.notes || null,
      qr_data: qrData,
      created_by: user!.id,
    };

    let error;
    if (editingId) {
      const { error: updateErr } = await supabase
        .from("sawmill_logs")
        .update(payload)
        .eq("id", editingId);
      error = updateErr;
    } else {
      const { error: insertErr } = await supabase
        .from("sawmill_logs")
        .insert(payload);
      error = insertErr;
    }

    if (error) {
      if (error.message.includes("unique")) {
        toast.error("Tag number already exists!");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success(editingId ? "Log updated" : "Log added successfully");
      setForm(emptyForm);
      setEditingId(null);
      setDialogOpen(false);
      fetchLogs();
      fetchStats();
    }
    setSaving(false);
  };

  const handleEdit = (log: SawmillLog) => {
    setForm({
      tag_number: log.tag_number,
      girth_cm: String(log.girth_cm),
      length_meter: String(log.length_meter),
      grade: log.grade || "A",
      notes: log.notes || "",
      saw_mill_id: log.saw_mill_id || "",
    });
    setEditingId(log.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this log?")) return;
    const { error } = await supabase.from("sawmill_logs").delete().eq("id", id);
    if (error) {
      toast.error("Cannot delete: log may be linked to production");
    } else {
      toast.success("Log deleted");
      fetchLogs();
      fetchStats();
    }
  };

  const handleTagLookup = async () => {
    if (!lookupTag.trim()) return;
    setLookupLoading(true);
    const { data, error } = await supabase
      .from("sawmill_logs")
      .select("*")
      .eq("company_id", selectedCompany)
      .eq("tag_number", lookupTag.trim())
      .maybeSingle();

    if (error || !data) {
      setLookupResult(null);
      toast.error("Log not found for tag: " + lookupTag);
    } else {
      setLookupResult(data);
    }
    setLookupLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Available</Badge>;
      case "in_process":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Process</Badge>;
      case "processed":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Processed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Stats from RPC (accurate, no row limit)
  const totalLogsCount = stats.total_count;
  const totalCFT = Number(stats.total_cft);
  const availableCount = stats.available_count;
  const inProcessCount = stats.in_process_count;
  const processedCount = stats.processed_count;

  // Filtered logs for table display
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = searchTag ? log.tag_number.toLowerCase().includes(searchTag.toLowerCase()) : true;
    const matchesStatus = filterStatus !== "all" ? log.status === filterStatus : true;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (!sortColumn) return 0;
    let valA: any, valB: any;
    switch (sortColumn) {
      case "girth_cm": valA = a.girth_cm; valB = b.girth_cm; break;
      case "girth_inch": valA = Number(a.girth_inch); valB = Number(b.girth_inch); break;
      case "length_meter": valA = a.length_meter; valB = b.length_meter; break;
      case "grade": valA = a.grade || ""; valB = b.grade || ""; break;
      case "cft": valA = Number(a.cft); valB = Number(b.cft); break;
      case "status": valA = a.status; valB = b.status; break;
      default: return 0;
    }
    if (typeof valA === "string") {
      const cmp = valA.localeCompare(valB);
      return sortDirection === "asc" ? cmp : -cmp;
    }
    return sortDirection === "asc" ? valA - valB : valB - valA;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Log Inventory & Tracking</h1>
          <p className="text-muted-foreground">Manage logs with tag numbers & QR tracking</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Add Log</Button>
            </DialogTrigger>
            <Button variant="outline" onClick={() => { setQrScanMode("add"); setQrScannerOpen(true); }}>
              <Camera className="h-4 w-4 mr-1" /> Scan QR to Add
            </Button>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Log" : "Add New Log"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Tag Number *</Label>
                    <Input
                      ref={tagInputRef}
                      value={form.tag_number}
                      onChange={(e) => setForm({ ...form, tag_number: e.target.value })}
                      placeholder="e.g., LOG-001"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label>Girth (cm) *</Label>
                    <Input
                      type="number"
                      value={form.girth_cm}
                      onChange={(e) => setForm({ ...form, girth_cm: e.target.value })}
                      placeholder="Enter girth in cm"
                    />
                    {form.girth_cm && (
                      <p className="text-xs text-muted-foreground mt-1">
                        = {(parseFloat(form.girth_cm) / 2.54).toFixed(2)} inches
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Length (meters) *</Label>
                    <Input
                      type="number"
                      value={form.length_meter}
                      onChange={(e) => setForm({ ...form, length_meter: e.target.value })}
                      placeholder="Enter length in meters"
                    />
                  </div>
                  <div>
                    <Label>Grade</Label>
                    <Select value={form.grade} onValueChange={(v) => setForm({ ...form, grade: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Saw Mill</Label>
                    <Select value={form.saw_mill_id} onValueChange={(v) => setForm({ ...form, saw_mill_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Mill" />
                      </SelectTrigger>
                      <SelectContent>
                        {sawMills.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Input
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>
                {form.girth_cm && form.length_meter && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-medium">
                      Calculated CFT: <span className="text-primary text-lg">
                        {calculateCFT(parseFloat(form.girth_cm), parseFloat(form.length_meter)).toFixed(3)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Formula: (Girth² × Length × 2.2072) / 10000
                    </p>
                  </div>
                )}
                <Button onClick={handleSubmit} disabled={saving} className="w-full">
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {editingId ? "Update Log" : "Add Log"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLogsCount}</div>
            <p className="text-xs text-muted-foreground">{totalCFT.toFixed(3)} Total CFT</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableCount}</div>
            <p className="text-xs text-muted-foreground">{(stats.available_cft || 0).toFixed(3)} CFT</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">In Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProcessCount}</div>
            <p className="text-xs text-muted-foreground">{(stats.in_process_cft || 0).toFixed(3)} CFT</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{processedCount}</div>
            <p className="text-xs text-muted-foreground">{(stats.processed_cft || 0).toFixed(3)} CFT</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Lookup & Filters */}
      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Log Inventory</TabsTrigger>
          <TabsTrigger value="lookup">Tag Lookup / QR Scan</TabsTrigger>
        </TabsList>

        <TabsContent value="lookup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanLine className="h-5 w-5" /> Tag Number / QR Lookup
              </CardTitle>
              <CardDescription>
                Enter tag number manually or scan QR code to auto-populate log details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={lookupTag}
                  onChange={(e) => setLookupTag(e.target.value)}
                  placeholder="Enter Tag Number (e.g., LOG-001)"
                  onKeyDown={(e) => e.key === "Enter" && handleTagLookup()}
                  className="flex-1"
                />
                <Button onClick={handleTagLookup} disabled={lookupLoading}>
                  {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setQrScanMode("lookup"); setQrScannerOpen(true); }}
                >
                  <Camera className="h-4 w-4 mr-1" /> Scan QR
                </Button>
              </div>

              {lookupResult && (
                <Card className="border-primary">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Tag Number</Label>
                        <p className="font-bold text-lg">{lookupResult.tag_number}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Girth</Label>
                        <p className="font-medium">{lookupResult.girth_cm} cm ({lookupResult.girth_inch?.toFixed(2)}")</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Length</Label>
                        <p className="font-medium">{lookupResult.length_meter} m</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">CFT</Label>
                        <p className="font-bold text-primary text-lg">{Number(lookupResult.cft).toFixed(3)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Grade</Label>
                        <p className="font-medium">{lookupResult.grade}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Status</Label>
                        <div className="mt-1">{getStatusBadge(lookupResult.status)}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">QR Data</Label>
                        <p className="text-xs font-mono truncate">{lookupResult.qr_data ? "✅ Generated" : "❌ Not set"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Added On</Label>
                        <p className="text-sm">{new Date(lookupResult.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {lookupResult.notes && (
                      <p className="text-sm text-muted-foreground mt-2">Notes: {lookupResult.notes}</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTag}
                onChange={(e) => setSearchTag(e.target.value)}
                placeholder="Search by tag number..."
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="in_process">In Process</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMill} onValueChange={setFilterMill}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Mills" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Mills</SelectItem>
                {sawMills.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <span className="text-sm font-medium">{selectedIds.size} log(s) selected</span>
              <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear Selection
              </Button>
            </div>
          )}

          {/* Log Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TreeDeciduous className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No logs found. Add your first log to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={selectedIds.size === filteredLogs.length && filteredLogs.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Tag #</TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("girth_cm")}>
                        <span className="flex items-center">Girth (cm)<SortIcon column="girth_cm" /></span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("girth_inch")}>
                        <span className="flex items-center">Girth (inch)<SortIcon column="girth_inch" /></span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("length_meter")}>
                        <span className="flex items-center">Length (m)<SortIcon column="length_meter" /></span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("grade")}>
                        <span className="flex items-center">Grade<SortIcon column="grade" /></span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("cft")}>
                        <span className="flex items-center">CFT<SortIcon column="cft" /></span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                        <span className="flex items-center">Status<SortIcon column="status" /></span>
                      </TableHead>
                      <TableHead>QR</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} data-state={selectedIds.has(log.id) ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(log.id)}
                            onCheckedChange={() => toggleSelect(log.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-bold">{log.tag_number}</TableCell>
                        <TableCell>{log.girth_cm}</TableCell>
                        <TableCell>{Number(log.girth_inch).toFixed(2)}</TableCell>
                        <TableCell>{log.length_meter}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.grade}</Badge>
                        </TableCell>
                        <TableCell className="font-bold">{Number(log.cft).toFixed(3)}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>
                          {log.qr_data ? (
                            <QrCode className="h-4 w-4 text-green-600" />
                          ) : (
                            <QrCode className="h-4 w-4 text-muted-foreground opacity-30" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(log)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(log.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} logs?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} selected log(s). Logs linked to production entries cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkDeleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete {selectedIds.size} Logs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Scanner */}
      <QrScanner
        open={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        onScan={(data) => {
          try {
            const parsed = JSON.parse(data);
            const tag = parsed.tag || data;
            if (qrScanMode === "lookup") {
              setLookupTag(tag);
              setLookupLoading(true);
              supabase
                .from("sawmill_logs")
                .select("*")
                .eq("company_id", selectedCompany)
                .eq("tag_number", tag)
                .maybeSingle()
                .then(({ data: logData, error }) => {
                  if (error || !logData) {
                    setLookupResult(null);
                    toast.error("Log not found for tag: " + tag);
                  } else {
                    setLookupResult(logData);
                  }
                  setLookupLoading(false);
                });
            } else {
              setForm({
                ...form,
                tag_number: tag,
                girth_cm: parsed.girth_cm?.toString() || "",
                length_meter: parsed.length_m?.toString() || "",
                grade: parsed.grade || "A",
                notes: "",
                saw_mill_id: form.saw_mill_id,
              });
              setDialogOpen(true);
            }
          } catch {
            if (qrScanMode === "lookup") {
              setLookupTag(data);
              handleTagLookup();
            }
          }
        }}
      />
    </div>
  );
};

export default LogManagement;
