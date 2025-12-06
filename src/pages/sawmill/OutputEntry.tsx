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
import { Loader2, Package, Plus, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface OutputEntry {
  id: string;
  entry_date: string;
  output_type: string;
  size: string | null;
  length: number | null;
  quantity: number;
  cft: number;
  notes: string | null;
  saw_mills?: { name: string } | null;
}

const OUTPUT_TYPES = [
  { id: "main_material", label: "Main Material", color: "bg-green-500" },
  { id: "off_side", label: "Off-Side Material", color: "bg-blue-500" },
  { id: "firewood", label: "Firewood", color: "bg-orange-500" },
  { id: "sawdust", label: "Sawdust", color: "bg-yellow-500" },
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

  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    saw_mill_id: "",
    output_type: "main_material",
    size: "",
    length: "",
    quantity: "1",
    cft: "",
    notes: "",
  });

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
    
    if (!formData.output_type || !formData.cft) {
      toast({ title: "Error", description: "Please fill output type and CFT", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("sawmill_output_entries").insert({
        company_id: selectedCompany,
        saw_mill_id: formData.saw_mill_id || null,
        entry_date: formData.entry_date,
        output_type: formData.output_type,
        size: formData.size || null,
        length: formData.length ? parseFloat(formData.length) : null,
        quantity: parseFloat(formData.quantity) || 1,
        cft: parseFloat(formData.cft),
        notes: formData.notes || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Output entry added successfully" });
      
      setFormData(prev => ({
        ...prev,
        size: "",
        length: "",
        quantity: "1",
        cft: "",
        notes: "",
      }));
      
      fetchTodayData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  // Calculate output percentages
  const todayOutputCFT = entries.reduce((sum, e) => sum + e.cft, 0);
  const mainMaterialCFT = entries.filter(e => e.output_type === "main_material").reduce((sum, e) => sum + e.cft, 0);
  const offSideCFT = entries.filter(e => e.output_type === "off_side").reduce((sum, e) => sum + e.cft, 0);
  const firewoodCFT = entries.filter(e => e.output_type === "firewood").reduce((sum, e) => sum + e.cft, 0);
  const sawdustCFT = entries.filter(e => e.output_type === "sawdust").reduce((sum, e) => sum + e.cft, 0);

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
              <p className="text-xl font-bold text-orange-600">{firewoodCFT.toFixed(2)}</p>
              <Badge variant="secondary">{getPercent(firewoodCFT)}%</Badge>
            </div>
            <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
              <p className="text-xs text-muted-foreground">Sawdust</p>
              <p className="text-xl font-bold text-yellow-600">{sawdustCFT.toFixed(2)}</p>
              <Badge variant="secondary">{getPercent(sawdustCFT)}%</Badge>
            </div>
          </div>
          <div className="mt-4 p-3 bg-primary/10 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">Overall Yield</span>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="size">Size (e.g., 2x4, 4x6)</Label>
                  <Input
                    id="size"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    placeholder="Size specification"
                  />
                </div>
                <div>
                  <Label htmlFor="length">Length (feet)</Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.01"
                    value={formData.length}
                    onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="cft">CFT *</Label>
                  <Input
                    id="cft"
                    type="number"
                    step="0.01"
                    value={formData.cft}
                    onChange={(e) => setFormData({ ...formData, cft: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

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
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">CFT</TableHead>
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
                        <TableCell>{entry.size || "-"}</TableCell>
                        <TableCell className="text-right">{entry.quantity}</TableCell>
                        <TableCell className="text-right font-medium">{entry.cft.toFixed(2)}</TableCell>
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
