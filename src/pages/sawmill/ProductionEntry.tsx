import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TreeDeciduous, Plus, Trash2, Edit2, Save, X, Copy, Search, ScanLine } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import QrScanner from "@/components/sawmill/QrScanner";

interface ProductionEntry {
  id: string;
  entry_date: string;
  girth: number;
  length: number;
  quantity: number;
  cft: number;
  rate_per_cft: number;
  total_amount: number;
  notes: string | null;
  sawmill_contractors?: { name: string } | null;
  saw_mills?: { name: string } | null;
}

interface FormRow {
  id: string;
  tag_number: string;
  log_id: string | null;
  girth: string;
  length: string;
  quantity: string;
  rate_per_cft: string;
  notes: string;
  cft: number;
  total_amount: number;
  grade: string;
}

const createEmptyRow = (): FormRow => ({
  id: crypto.randomUUID(),
  tag_number: "",
  log_id: null,
  girth: "",
  length: "",
  quantity: "1",
  rate_per_cft: "",
  notes: "",
  cft: 0,
  total_amount: 0,
  grade: "",
});

// CFT calculation: girth (cm) × girth (cm) × length (meters) × 2.2072 / 10000
const calculateRowCFT = (girthCm: string, lengthMeters: string, quantity: string): number => {
  const girth = parseFloat(girthCm) || 0;
  const len = parseFloat(lengthMeters) || 0;
  const qty = parseFloat(quantity) || 1;
  return (girth * girth * len * 2.2072 * qty) / 10000;
};

const SawmillProductionEntry = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [sawMills, setSawMills] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [sawMillId, setSawMillId] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [rows, setRows] = useState<FormRow[]>([createEmptyRow()]);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  // QR Scanner
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [qrTargetRowId, setQrTargetRowId] = useState<string | null>(null);
  
  // Edit mode for existing entries
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<FormRow | null>(null);

  // Keyboard shortcuts: Enter to add row, Ctrl+D to duplicate
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle if focus is within the form
    if (!formRef.current?.contains(document.activeElement)) return;
    
    // Enter key to add new row (but not when in a textarea or submitting)
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement?.tagName !== 'TEXTAREA' && activeElement?.tagName !== 'BUTTON') {
        e.preventDefault();
        addRow();
      }
    }
    
    // Ctrl+D to duplicate focused row
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      if (focusedRowId) {
        copyRow(focusedRowId);
      } else if (rows.length > 0) {
        copyRow(rows[rows.length - 1].id);
      }
    }
  }, [focusedRowId, rows]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Calculate totals for all rows
  const totalCFT = rows.reduce((sum, row) => sum + row.cft, 0);
  const totalAmount = rows.reduce((sum, row) => sum + row.total_amount, 0);

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) {
      fetchSawMills();
      fetchContractors();
      fetchTodayEntries();
    }
  }, [selectedCompany]);

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

  const fetchContractors = async () => {
    const { data } = await supabase
      .from("sawmill_contractors")
      .select("id, name")
      .eq("company_id", selectedCompany)
      .eq("is_active", true)
      .order("name");
    setContractors(data || []);
  };

  const fetchTodayEntries = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("sawmill_production_entries")
      .select("*, sawmill_contractors(name), saw_mills(name)")
      .eq("company_id", selectedCompany)
      .eq("entry_date", today)
      .order("created_at", { ascending: false });
    
    if (!error) {
      setEntries(data || []);
    }
  };

  // Tag number lookup for a row
  const lookupTag = async (rowId: string, tagNumber: string) => {
    if (!tagNumber || !selectedCompany) return;
    
    const { data, error } = await supabase
      .from("sawmill_logs")
      .select("*")
      .eq("company_id", selectedCompany)
      .eq("tag_number", tagNumber)
      .eq("status", "available")
      .maybeSingle();
    
    if (error || !data) {
      toast({ title: "Not Found", description: `No available log found with tag "${tagNumber}"`, variant: "destructive" });
      return;
    }

    const girthCm = data.girth_cm;
    const cft = calculateRowCFT(girthCm.toString(), data.length_meter.toString(), "1");

    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id !== rowId) return row;
        const rate = parseFloat(row.rate_per_cft) || 0;
        return {
          ...row,
          tag_number: tagNumber,
          log_id: data.id,
          girth: girthCm.toString(),
          length: data.length_meter.toString(),
          quantity: "1",
          grade: data.grade || "",
          cft: cft,
          total_amount: cft * rate,
        };
      })
    );
  };

  const updateRow = (rowId: string, field: keyof FormRow, value: string) => {
    setRows(prevRows => 
      prevRows.map(row => {
        if (row.id !== rowId) return row;
        
        const updatedRow = { ...row, [field]: value };

        // Clear log link if user manually changes girth/length
        if ((field === 'girth' || field === 'length') && row.log_id) {
          updatedRow.log_id = null;
          updatedRow.tag_number = "";
        }
        
        // Recalculate CFT and total when relevant fields change
        if (field === 'girth' || field === 'length' || field === 'quantity' || field === 'rate_per_cft') {
          const cft = calculateRowCFT(
            field === 'girth' ? value : updatedRow.girth,
            field === 'length' ? value : updatedRow.length,
            field === 'quantity' ? value : updatedRow.quantity
          );
          const rate = parseFloat(field === 'rate_per_cft' ? value : updatedRow.rate_per_cft) || 0;
          updatedRow.cft = cft;
          updatedRow.total_amount = cft * rate;
        }
        
        return updatedRow;
      })
    );
  };

  const addRow = () => {
    // Copy rate from last row if available
    const lastRow = rows[rows.length - 1];
    const newRow = createEmptyRow();
    if (lastRow?.rate_per_cft) {
      newRow.rate_per_cft = lastRow.rate_per_cft;
    }
    setRows([...rows, newRow]);
  };

  const copyRow = (rowId: string) => {
    const rowToCopy = rows.find(row => row.id === rowId);
    if (!rowToCopy) return;
    
    const newRow: FormRow = {
      ...rowToCopy,
      id: crypto.randomUUID(),
    };
    const rowIndex = rows.findIndex(row => row.id === rowId);
    const newRows = [...rows];
    newRows.splice(rowIndex + 1, 0, newRow);
    setRows(newRows);
  };

  const removeRow = (rowId: string) => {
    if (rows.length === 1) {
      toast({ title: "Error", description: "At least one row is required", variant: "destructive" });
      return;
    }
    setRows(rows.filter(row => row.id !== rowId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contractorId) {
      toast({ title: "Error", description: "Please select a contractor", variant: "destructive" });
      return;
    }

    // Validate all rows have required fields
    const validRows = rows.filter(row => row.girth && row.length && row.rate_per_cft);
    if (validRows.length === 0) {
      toast({ title: "Error", description: "Please fill at least one complete row", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const entriesToInsert = validRows.map(row => ({
        company_id: selectedCompany,
        saw_mill_id: sawMillId || null,
        contractor_id: contractorId,
        entry_date: entryDate,
        girth: parseFloat(row.girth),
        length: parseFloat(row.length),
        quantity: parseFloat(row.quantity) || 1,
        cft: row.cft,
        rate_per_cft: parseFloat(row.rate_per_cft),
        total_amount: row.total_amount,
        notes: row.notes || null,
        log_id: row.log_id || null,
        created_by: user?.id,
      }));

      // Update log status to 'in_process' for linked logs
      const logIds = validRows.filter(r => r.log_id).map(r => r.log_id!);
      if (logIds.length > 0) {
        await supabase
          .from("sawmill_logs")
          .update({ status: "in_process" })
          .in("id", logIds);
      }

      const { error } = await supabase.from("sawmill_production_entries").insert(entriesToInsert);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `${validRows.length} entries added. Total CFT: ${totalCFT.toFixed(2)}, Amount: ${formatCurrency(totalAmount)}` 
      });
      
      // Reset rows
      setRows([createEmptyRow()]);
      fetchTodayEntries();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  // Edit existing entry
  const startEditEntry = (entry: ProductionEntry) => {
    setEditingEntryId(entry.id);
    const cft = calculateRowCFT(entry.girth.toString(), entry.length.toString(), entry.quantity.toString());
    setEditRow({
      id: entry.id,
      tag_number: "",
      log_id: null,
      girth: entry.girth.toString(),
      length: entry.length.toString(),
      quantity: entry.quantity.toString(),
      rate_per_cft: entry.rate_per_cft.toString(),
      notes: entry.notes || "",
      cft: cft,
      total_amount: cft * entry.rate_per_cft,
      grade: "",
    });
  };

  const updateEditRow = (field: keyof FormRow, value: string) => {
    if (!editRow) return;
    
    const updatedRow = { ...editRow, [field]: value };
    
    if (field === 'girth' || field === 'length' || field === 'quantity' || field === 'rate_per_cft') {
      const cft = calculateRowCFT(
        field === 'girth' ? value : updatedRow.girth,
        field === 'length' ? value : updatedRow.length,
        field === 'quantity' ? value : updatedRow.quantity
      );
      const rate = parseFloat(field === 'rate_per_cft' ? value : updatedRow.rate_per_cft) || 0;
      updatedRow.cft = cft;
      updatedRow.total_amount = cft * rate;
    }
    
    setEditRow(updatedRow);
  };

  const saveEditEntry = async () => {
    if (!editRow || !editingEntryId) return;
    
    try {
      const { error } = await supabase
        .from("sawmill_production_entries")
        .update({
          girth: parseFloat(editRow.girth),
          length: parseFloat(editRow.length),
          quantity: parseFloat(editRow.quantity) || 1,
          cft: editRow.cft,
          rate_per_cft: parseFloat(editRow.rate_per_cft),
          total_amount: editRow.total_amount,
          notes: editRow.notes || null,
        })
        .eq("id", editingEntryId);

      if (error) throw error;

      toast({ title: "Success", description: "Entry updated successfully" });
      setEditingEntryId(null);
      setEditRow(null);
      fetchTodayEntries();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const cancelEdit = () => {
    setEditingEntryId(null);
    setEditRow(null);
  };

  const todayTotal = entries.reduce((sum, e) => sum + e.total_amount, 0);
  const todayCFT = entries.reduce((sum, e) => sum + e.cft, 0);

  // No conversion needed now - girth stored as inches, length as meters

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Production Entry</h1>
          <p className="text-muted-foreground">Record round log cutting production</p>
        </div>
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
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Today's Date</p>
            <p className="text-xl font-bold">{format(new Date(), "dd MMM yyyy")}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Today's CFT</p>
            <p className="text-xl font-bold">{todayCFT.toFixed(2)} CFT</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Today's Amount</p>
            <p className="text-xl font-bold">{formatCurrency(todayTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Entry Form with Multiple Rows */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Production Entries
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Shortcuts: <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> add row, <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+D</kbd> duplicate row
          </p>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="entry_date">Date</Label>
                <Input
                  id="entry_date"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="saw_mill">Saw Mill</Label>
                <Select value={sawMillId} onValueChange={setSawMillId}>
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
              <div>
                <Label htmlFor="contractor">Contractor *</Label>
                <Select value={contractorId} onValueChange={setContractorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Contractor" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractors.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Multi-Row Entry Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[60px]">S.No</TableHead>
                      <TableHead>Tag No.</TableHead>
                      <TableHead>Girth (cm) *</TableHead>
                      <TableHead>Length (mtr) *</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Rate/CFT *</TableHead>
                      <TableHead>CFT</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow key={row.id} className={focusedRowId === row.id ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 items-center">
                            <Input
                              value={row.tag_number}
                              onChange={(e) => updateRow(row.id, 'tag_number', e.target.value)}
                              onFocus={() => setFocusedRowId(row.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  lookupTag(row.id, row.tag_number);
                                }
                              }}
                              placeholder="Tag"
                              className="w-20"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => lookupTag(row.id, row.tag_number)}
                              title="Lookup tag"
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => {
                                setQrTargetRowId(row.id);
                                setQrScannerOpen(true);
                              }}
                              title="Scan QR"
                            >
                              <ScanLine className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={row.girth}
                            onChange={(e) => updateRow(row.id, 'girth', e.target.value)}
                            onFocus={() => setFocusedRowId(row.id)}
                            placeholder="0"
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.length}
                            onChange={(e) => updateRow(row.id, 'length', e.target.value)}
                            onFocus={() => setFocusedRowId(row.id)}
                            placeholder="0"
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.grade}
                            onChange={(e) => updateRow(row.id, 'grade', e.target.value)}
                            onFocus={() => setFocusedRowId(row.id)}
                            placeholder="Grade"
                            className="w-16"
                            readOnly={!!row.log_id}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={row.quantity}
                            onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                            onFocus={() => setFocusedRowId(row.id)}
                            placeholder="1"
                            className="w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.rate_per_cft}
                            onChange={(e) => updateRow(row.id, 'rate_per_cft', e.target.value)}
                            onFocus={() => setFocusedRowId(row.id)}
                            placeholder="0"
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="font-medium text-primary">
                          {row.cft.toFixed(3)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(row.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.notes}
                            onChange={(e) => updateRow(row.id, 'notes', e.target.value)}
                            onFocus={() => setFocusedRowId(row.id)}
                            placeholder="Notes"
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => copyRow(row.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            title="Copy row"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRow(row.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Delete row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Add Row Button */}
            <Button type="button" variant="outline" onClick={addRow} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>

            {/* Totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-primary/10 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Rows</p>
                <p className="text-xl font-bold">{rows.filter(r => r.girth && r.length).length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total CFT</p>
                <p className="text-xl font-bold text-primary">{totalCFT.toFixed(3)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save All Entries ({rows.filter(r => r.girth && r.length && r.rate_per_cft).length})
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Today's Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TreeDeciduous className="h-5 w-5" />
            Today's Entries ({entries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No entries for today yet</p>
          ) : (
            <div className="overflow-x-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contractor</TableHead>
                    <TableHead className="text-right">Girth (cm)</TableHead>
                    <TableHead className="text-right">Length</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">CFT</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      {editingEntryId === entry.id && editRow ? (
                        <>
                          <TableCell className="font-medium">
                            {entry.sawmill_contractors?.name || "-"}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.1"
                              value={editRow.girth}
                              onChange={(e) => updateEditRow('girth', e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={editRow.length}
                              onChange={(e) => updateEditRow('length', e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editRow.quantity}
                              onChange={(e) => updateEditRow('quantity', e.target.value)}
                              className="w-16"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium text-primary">
                            {editRow.cft.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(editRow.total_amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={saveEditEntry}
                                className="h-8 w-8 text-green-600"
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={cancelEdit}
                                className="h-8 w-8"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-medium">
                            {entry.sawmill_contractors?.name || "-"}
                          </TableCell>
                          <TableCell className="text-right">{entry.girth}" </TableCell>
                          <TableCell className="text-right">{entry.length} mtr</TableCell>
                          <TableCell className="text-right">{entry.quantity}</TableCell>
                          <TableCell className="text-right">{entry.cft.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(entry.total_amount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditEntry(entry)}
                              className="h-8 w-8"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* QR Scanner */}
      <QrScanner
        open={qrScannerOpen}
        onClose={() => { setQrScannerOpen(false); setQrTargetRowId(null); }}
        onScan={(data) => {
          try {
            const parsed = JSON.parse(data);
            const tag = parsed.tag || data;
            const targetRow = qrTargetRowId || rows[rows.length - 1]?.id;
            if (targetRow) {
              lookupTag(targetRow, tag);
            }
          } catch {
            // If not JSON, treat as tag number directly
            const targetRow = qrTargetRowId || rows[rows.length - 1]?.id;
            if (targetRow) {
              lookupTag(targetRow, data);
            }
          }
        }}
      />
    </div>
  );
};

export default SawmillProductionEntry;
