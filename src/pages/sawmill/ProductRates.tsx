import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit2, Trash2, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

const PRODUCT_TYPES = ["Main Size", "Off Size", "Saw Dust", "Fire Wood"];

const ProductRates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ product_type: "", rate_per_unit: "", unit: "CFT" });

  useEffect(() => { if (user) fetchCompanies(); }, [user]);
  useEffect(() => { if (selectedCompany) fetchRates(); }, [selectedCompany]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    if (data?.length) { setCompanies(data); setSelectedCompany(data[0].id); }
    setLoading(false);
  };

  const fetchRates = async () => {
    const { data } = await supabase.from("product_rates").select("*").eq("company_id", selectedCompany).order("product_type");
    setRates(data || []);
  };

  const handleSubmit = async () => {
    if (!form.product_type || !form.rate_per_unit) {
      toast({ title: "Error", description: "Fill all fields", variant: "destructive" }); return;
    }
    const payload = { company_id: selectedCompany, product_type: form.product_type, rate_per_unit: parseFloat(form.rate_per_unit), unit: form.unit };
    
    let error;
    if (editingId) {
      ({ error } = await supabase.from("product_rates").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("product_rates").insert(payload));
    }
    
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: "Success", description: editingId ? "Rate updated" : "Rate added" });
      setDialogOpen(false); setEditingId(null); setForm({ product_type: "", rate_per_unit: "", unit: "CFT" });
      fetchRates();
    }
  };

  const handleEdit = (rate: any) => {
    setForm({ product_type: rate.product_type, rate_per_unit: String(rate.rate_per_unit), unit: rate.unit });
    setEditingId(rate.id); setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rate?")) return;
    await supabase.from("product_rates").delete().eq("id", id);
    toast({ title: "Deleted" }); fetchRates();
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Product Rates</h1>
          <p className="text-muted-foreground">Manage selling rates for each product type</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Company" /></SelectTrigger>
            <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setEditingId(null); setForm({ product_type: "", rate_per_unit: "", unit: "CFT" }); } }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add Rate</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? "Edit Rate" : "Add Product Rate"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Product Type *</Label>
                  <Select value={form.product_type} onValueChange={v => setForm({ ...form, product_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                    <SelectContent>{PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rate per Unit *</Label>
                  <Input type="number" value={form.rate_per_unit} onChange={e => setForm({ ...form, rate_per_unit: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CFT">CFT</SelectItem>
                      <SelectItem value="Kg">Kg</SelectItem>
                      <SelectItem value="Piece">Piece</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSubmit} className="w-full">{editingId ? "Update" : "Add"} Rate</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Current Rates</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Type</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No rates configured</TableCell></TableRow>
              ) : rates.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.product_type}</TableCell>
                  <TableCell>{formatCurrency(r.rate_per_unit)}</TableCell>
                  <TableCell>{r.unit}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(r)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductRates;
