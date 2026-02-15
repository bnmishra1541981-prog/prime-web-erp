import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Plus, TrendingUp, Pencil, Trash2, X, Check } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

interface OutputEntry {
  id: string;
  entry_date: string;
  output_type: string;
  size: string | null;
  height: number | null;
  width: number | null;
  length: number | null;
  quantity: number;
  cft: number;
  weight: number | null;
  notes: string | null;
  saw_mills?: { name: string } | null;
}

const OUTPUT_TYPES = [
  { id: "main_material", label: "Main Material", color: "bg-green-500", useWeight: false },
  { id: "off_side", label: "Off-Side Material", color: "bg-blue-500", useWeight: false },
  { id: "firewood", label: "Firewood", color: "bg-orange-500", useWeight: true },
  { id: "sawdust", label: "Sawdust", color: "bg-yellow-500", useWeight: true },
];

const SawmillOutputEntry = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [sawMills, setSawMills] = useState<any[]>([]);
  const [entries, setEntries] = useState<OutputEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayInputCFT, setTodayInputCFT] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    saw_mill_id: "",
    output_type: "main_material",
    size: "",
    height: "",
    width: "",
    length: "",
    quantity: "1",
    weight: "", // For firewood/sawdust in kgs
    notes: "",
  });

  // Check if current output type uses weight instead of dimensions
  const currentOutputType = OUTPUT_TYPES.find(t => t.id === formData.output_type);
  const useWeight = currentOutputType?.useWeight || false;

  // Auto-calculate CFT: (Height × Width × Length × Qty) / 144
  const calculateCFT = () => {
    if (useWeight) return 0; // No CFT for weight-based products
    const height = parseFloat(formData.height) || 0;
    const width = parseFloat(formData.width) || 0;
    const length = parseFloat(formData.length) || 0;
    const quantity = parseFloat(formData.quantity) || 1;
    // Height and Width in inches, Length in feet
    return (height * width * length * quantity) / 144;
  };

  const calculatedCFT = calculateCFT();

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) {
      fetchSawMills();
      fetchTodayData();
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

  const fetchTodayData = async () => {
    const today = new Date().toISOString().split("T")[0];
    
    // Fetch today's output entries
    const { data: outputData } = await supabase
      .from("sawmill_output_entries")
      .select("*, saw_mills(name)")
      .eq("company_id", selectedCompany)
      .eq("entry_date", today)
      .order("created_at", { ascending: false });
    
    setEntries(outputData || []);

    // Fetch today's input CFT
    const { data: inputData } = await supabase
      .from("sawmill_production_entries")
      .select("cft")
      .eq("company_id", selectedCompany)
      .eq("entry_date", today);
    
    const totalInput = inputData?.reduce((sum, e) => sum + Number(e.cft), 0) || 0;
    setTodayInputCFT(totalInput);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.output_type) {
      toast({ title: "Error", description: "Please select output type", variant: "destructive" });
      return;
    }

    if (useWeight) {
      if (!formData.weight) {
        toast({ title: "Error", description: "Please enter weight", variant: "destructive" });
        return;
      }
    } else {
      if (!formData.height || !formData.width || !formData.length) {
        toast({ title: "Error", description: "Please fill height, width and length", variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("sawmill_output_entries").insert({
        company_id: selectedCompany,
        saw_mill_id: formData.saw_mill_id || null,
        entry_date: formData.entry_date,
        output_type: formData.output_type,
        size: formData.size || null,
        height: formData.height ? parseFloat(formData.height) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        length: formData.length ? parseFloat(formData.length) : null,
        quantity: parseFloat(formData.quantity) || 1,
        cft: useWeight ? 0 : calculatedCFT,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        notes: formData.notes || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Output entry added successfully" });
      
      setFormData(prev => ({
        ...prev,
        size: "",
        height: "",
        width: "",
        length: "",
        quantity: "1",
        weight: "",
        notes: "",
      }));
      
      fetchTodayData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const startEdit = (entry: OutputEntry) => {
    setEditingId(entry.id);
    setEditData({
      output_type: entry.output_type,
      size: entry.size || "",
      height: entry.height?.toString() || "",
      width: entry.width?.toString() || "",
      length: entry.length?.toString() || "",
      quantity: entry.quantity.toString(),
      weight: entry.weight?.toString() || "",
      notes: entry.notes || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (id: string) => {
    const outputType = OUTPUT_TYPES.find(t => t.id === editData.output_type);
    const isWeight = outputType?.useWeight || false;
    
    let cft = 0;
    if (!isWeight) {
      const h = parseFloat(editData.height) || 0;
      const w = parseFloat(editData.width) || 0;
      const l = parseFloat(editData.length) || 0;
      const q = parseFloat(editData.quantity) || 1;
      cft = (h * w * l * q) / 144;
    }

    const { error } = await supabase.from("sawmill_output_entries").update({
      output_type: editData.output_type,
      size: editData.size || null,
      height: editData.height ? parseFloat(editData.height) : null,
      width: editData.width ? parseFloat(editData.width) : null,
      length: editData.length ? parseFloat(editData.length) : null,
      quantity: parseFloat(editData.quantity) || 1,
      cft: isWeight ? 0 : cft,
      weight: editData.weight ? parseFloat(editData.weight) : null,
      notes: editData.notes || null,
    }).eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Entry updated" });
      setEditingId(null);
      fetchTodayData();
    }
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from("sawmill_output_entries").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Entry removed" });
      fetchTodayData();
    }
  };

  // Calculate output percentages
  const todayOutputCFT = entries.filter(e => !["firewood", "sawdust"].includes(e.output_type)).reduce((sum, e) => sum + e.cft, 0);
  const mainMaterialCFT = entries.filter(e => e.output_type === "main_material").reduce((sum, e) => sum + e.cft, 0);
  const offSideCFT = entries.filter(e => e.output_type === "off_side").reduce((sum, e) => sum + e.cft, 0);
  const firewoodKg = entries.filter(e => e.output_type === "firewood").reduce((sum, e) => sum + (e.weight || 0), 0);
  const sawdustKg = entries.filter(e => e.output_type === "sawdust").reduce((sum, e) => sum + (e.weight || 0), 0);

  const getPercent = (cft: number) => {
    if (todayInputCFT === 0) return 0;
    return ((cft / todayInputCFT) * 100).toFixed(1);
  };

  const getOutputTypeLabel = (type: string) => {
    return OUTPUT_TYPES.find(t => t.id === type)?.label || type;
  };

  const getOutputTypeColor = (type: string) => {
    return OUTPUT_TYPES.find(t => t.id === type)?.color || "bg-gray-500";
  };

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
          <h1 className="text-2xl font-bold text-foreground">Output Entry</h1>
          <p className="text-muted-foreground">Record finished goods after cutting</p>
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

      {/* Output Percentages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Today's Output Analysis - {format(new Date(), "dd MMM yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Input CFT</p>
              <p className="text-xl font-bold">{todayInputCFT.toFixed(2)}</p>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <p className="text-xs text-muted-foreground">Main Material</p>
              <p className="text-xl font-bold text-green-600">{mainMaterialCFT.toFixed(2)}</p>
              <Badge variant="secondary">{getPercent(mainMaterialCFT)}%</Badge>
            </div>
            <div className="text-center p-3 bg-blue-500/10 rounded-lg">
              <p className="text-xs text-muted-foreground">Off-Side</p>
              <p className="text-xl font-bold text-blue-600">{offSideCFT.toFixed(2)}</p>
              <Badge variant="secondary">{getPercent(offSideCFT)}%</Badge>
            </div>
            <div className="text-center p-3 bg-orange-500/10 rounded-lg">
              <p className="text-xs text-muted-foreground">Firewood</p>
              <p className="text-xl font-bold text-orange-600">{firewoodKg.toFixed(1)} kg</p>
            </div>
            <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
              <p className="text-xs text-muted-foreground">Sawdust</p>
              <p className="text-xl font-bold text-yellow-600">{sawdustKg.toFixed(1)} kg</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-primary/10 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">Overall Yield (Main + Off-Side)</span>
            <Badge className="text-lg px-4">{getPercent(todayOutputCFT)}%</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Output Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="entry_date">Date</Label>
                  <Input
                    id="entry_date"
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="saw_mill">Saw Mill</Label>
                  <Select value={formData.saw_mill_id} onValueChange={(v) => setFormData({ ...formData, saw_mill_id: v })}>
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
              </div>

              <div>
                <Label htmlFor="output_type">Output Type *</Label>
                <Select value={formData.output_type} onValueChange={(v) => setFormData({ ...formData, output_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {useWeight ? (
                /* Weight-based input for Firewood/Sawdust */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="weight">Weight (Kgs) *</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quantity">Bags/Units</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        placeholder="1"
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="text-muted-foreground">
                      {formData.weight ? `${(parseFloat(formData.weight) / 1000).toFixed(3)} Metric Tons` : "Enter weight in kgs"}
                    </p>
                  </div>
                </div>
              ) : (
                /* Dimension-based input for Main Material/Off-Side */
                <>
                  <div>
                    <Label htmlFor="size">Size Name (e.g., 2x4, 4x6)</Label>
                    <Input
                      id="size"
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      placeholder="Size specification"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="height">Height (inch) *</Label>
                      <Input
                        id="height"
                        type="number"
                        step="0.25"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="width">Width (inch) *</Label>
                      <Input
                        id="width"
                        type="number"
                        step="0.25"
                        value={formData.width}
                        onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="length">Length (feet) *</Label>
                      <Input
                        id="length"
                        type="number"
                        step="0.5"
                        value={formData.length}
                        onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Total CFT</Label>
                      <div className="h-10 px-3 py-2 bg-primary/10 rounded-md font-bold text-primary">
                        {calculatedCFT.toFixed(3)}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                    Formula: (Height × Width × Length × Qty) / 144
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Output Entry
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Today's Output Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Today's Output ({entries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No output entries for today yet</p>
            ) : (
              <div className="overflow-x-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Size/Dimensions</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">CFT/Kg</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Badge className={getOutputTypeColor(entry.output_type)}>
                            {getOutputTypeLabel(entry.output_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {editingId === entry.id ? (
                            ["firewood", "sawdust"].includes(editData.output_type) ? (
                              <Input className="w-24" type="number" step="0.1" value={editData.weight} onChange={(e) => setEditData({...editData, weight: e.target.value})} placeholder="Kg" />
                            ) : (
                              <div className="flex gap-1">
                                <Input className="w-14" type="number" step="0.25" value={editData.height} onChange={(e) => setEditData({...editData, height: e.target.value})} placeholder="H" />
                                <Input className="w-14" type="number" step="0.25" value={editData.width} onChange={(e) => setEditData({...editData, width: e.target.value})} placeholder="W" />
                                <Input className="w-14" type="number" step="0.5" value={editData.length} onChange={(e) => setEditData({...editData, length: e.target.value})} placeholder="L" />
                              </div>
                            )
                          ) : (
                            ["firewood", "sawdust"].includes(entry.output_type)
                              ? "-"
                              : entry.size || `${entry.height}×${entry.width}×${entry.length}`
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId === entry.id ? (
                            <Input className="w-16 ml-auto" type="number" value={editData.quantity} onChange={(e) => setEditData({...editData, quantity: e.target.value})} />
                          ) : entry.quantity}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {["firewood", "sawdust"].includes(entry.output_type)
                            ? `${entry.weight?.toFixed(1)} kg`
                            : `${entry.cft.toFixed(2)} CFT`}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId === entry.id ? (
                            <div className="flex gap-1 justify-end">
                              <Button size="icon" variant="ghost" onClick={() => saveEdit(entry.id)}><Check className="h-4 w-4 text-green-600" /></Button>
                              <Button size="icon" variant="ghost" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-end">
                              <Button size="icon" variant="ghost" onClick={() => startEdit(entry)}><Pencil className="h-4 w-4" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently remove this output entry.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteEntry(entry.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SawmillOutputEntry;