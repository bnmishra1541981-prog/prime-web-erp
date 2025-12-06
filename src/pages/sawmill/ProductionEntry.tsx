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
import { useToast } from "@/hooks/use-toast";
import { Loader2, TreeDeciduous, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";

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

  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    saw_mill_id: "",
    contractor_id: "",
    girth: "",
    length: "",
    quantity: "1",
    rate_per_cft: "",
    notes: "",
  });

  // Auto-calculate CFT: (Girth × Girth × Length) / 2304
  const calculateCFT = () => {
    const girth = parseFloat(formData.girth) || 0;
    const length = parseFloat(formData.length) || 0;
    const quantity = parseFloat(formData.quantity) || 1;
    return (girth * girth * length * quantity) / 2304;
  };

  const calculatedCFT = calculateCFT();
  const totalAmount = calculatedCFT * (parseFloat(formData.rate_per_cft) || 0);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contractor_id) {
      toast({ title: "Error", description: "Please select a contractor", variant: "destructive" });
      return;
    }
    if (!formData.girth || !formData.length || !formData.rate_per_cft) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("sawmill_production_entries").insert({
        company_id: selectedCompany,
        saw_mill_id: formData.saw_mill_id || null,
        contractor_id: formData.contractor_id,
        entry_date: formData.entry_date,
        girth: parseFloat(formData.girth),
        length: parseFloat(formData.length),
        quantity: parseFloat(formData.quantity) || 1,
        cft: calculatedCFT,
        rate_per_cft: parseFloat(formData.rate_per_cft),
        total_amount: totalAmount,
        notes: formData.notes || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({ title: "Success", description: `Production entry added. CFT: ${calculatedCFT.toFixed(2)}, Amount: ${formatCurrency(totalAmount)}` });
      
      // Reset form but keep date and mill
      setFormData(prev => ({
        ...prev,
        girth: "",
        length: "",
        quantity: "1",
        notes: "",
      }));
      
      fetchTodayEntries();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const todayTotal = entries.reduce((sum, e) => sum + e.total_amount, 0);
  const todayCFT = entries.reduce((sum, e) => sum + e.cft, 0);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Production Entry
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
                <Label htmlFor="contractor">Contractor *</Label>
                <Select value={formData.contractor_id} onValueChange={(v) => setFormData({ ...formData, contractor_id: v })}>
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="girth">Girth (inches) *</Label>
                  <Input
                    id="girth"
                    type="number"
                    step="0.01"
                    value={formData.girth}
                    onChange={(e) => setFormData({ ...formData, girth: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="length">Length (feet) *</Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.01"
                    value={formData.length}
                    onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                    placeholder="0"
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rate">Rate per CFT *</Label>
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    value={formData.rate_per_cft}
                    onChange={(e) => setFormData({ ...formData, rate_per_cft: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Calculated CFT</Label>
                  <div className="h-10 px-3 py-2 bg-muted rounded-md font-medium">
                    {calculatedCFT.toFixed(3)}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formula: (Girth² × Length × Qty) / 2304 × Rate
                </p>
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
                Add Entry
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
                      <TableHead className="text-right">Girth</TableHead>
                      <TableHead className="text-right">Length</TableHead>
                      <TableHead className="text-right">CFT</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {entry.sawmill_contractors?.name || "-"}
                        </TableCell>
                        <TableCell className="text-right">{entry.girth}"</TableCell>
                        <TableCell className="text-right">{entry.length}'</TableCell>
                        <TableCell className="text-right">{entry.cft.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(entry.total_amount)}
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

export default SawmillProductionEntry;
