import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Users, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface Contractor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  saw_mill_id: string | null;
  saw_mills?: { name: string } | null;
}

const Contractors = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [sawMills, setSawMills] = useState<any[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    opening_balance: 0,
    saw_mill_id: "",
  });

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) {
      fetchSawMills();
      fetchContractors();
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
    setLoading(true);
    const { data, error } = await supabase
      .from("sawmill_contractors")
      .select("*, saw_mills(name)")
      .eq("company_id", selectedCompany)
      .order("name");
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setContractors(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Contractor name is required", variant: "destructive" });
      return;
    }

    try {
      const payload = {
        company_id: selectedCompany,
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        saw_mill_id: formData.saw_mill_id || null,
        opening_balance: formData.opening_balance,
        current_balance: editingContractor ? editingContractor.current_balance : formData.opening_balance,
      };

      if (editingContractor) {
        const { error } = await supabase
          .from("sawmill_contractors")
          .update(payload)
          .eq("id", editingContractor.id);
        
        if (error) throw error;
        toast({ title: "Success", description: "Contractor updated successfully" });
      } else {
        const { error } = await supabase.from("sawmill_contractors").insert(payload);
        if (error) throw error;
        toast({ title: "Success", description: "Contractor created successfully" });
      }
      
      setDialogOpen(false);
      setEditingContractor(null);
      resetForm();
      fetchContractors();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", phone: "", email: "", address: "", opening_balance: 0, saw_mill_id: "" });
  };

  const toggleActive = async (contractor: Contractor) => {
    const { error } = await supabase
      .from("sawmill_contractors")
      .update({ is_active: !contractor.is_active })
      .eq("id", contractor.id);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchContractors();
    }
  };

  const openEdit = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setFormData({
      name: contractor.name,
      phone: contractor.phone || "",
      email: contractor.email || "",
      address: contractor.address || "",
      opening_balance: contractor.opening_balance,
      saw_mill_id: contractor.saw_mill_id || "",
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingContractor(null);
    resetForm();
    setDialogOpen(true);
  };

  if (loading && contractors.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalBalance = contractors.reduce((sum, c) => sum + c.current_balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contractors</h1>
          <p className="text-muted-foreground">Manage contractors and their balances</p>
        </div>
        <div className="flex gap-2">
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Add Contractor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingContractor ? "Edit Contractor" : "Add Contractor"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contractor name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Email"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="saw_mill">Saw Mill</Label>
                    <Select value={formData.saw_mill_id || "all"} onValueChange={(v) => setFormData({ ...formData, saw_mill_id: v === "all" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Mill" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Mills</SelectItem>
                        {sawMills.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="opening_balance">Opening Balance</Label>
                    <Input
                      id="opening_balance"
                      type="number"
                      value={formData.opening_balance}
                      onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {editingContractor ? "Update" : "Create"} Contractor
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Payable Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {contractors.filter(c => c.is_active).length} Active Contractors
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contractors List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contractors.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No contractors found. Add your first contractor.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Saw Mill</TableHead>
                    <TableHead className="text-right">Opening Bal.</TableHead>
                    <TableHead className="text-right">Current Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractors.map((contractor) => (
                    <TableRow key={contractor.id}>
                      <TableCell className="font-medium">{contractor.name}</TableCell>
                      <TableCell>{contractor.phone || "-"}</TableCell>
                      <TableCell>{contractor.saw_mills?.name || "All Mills"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(contractor.opening_balance)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={contractor.current_balance > 0 ? "destructive" : "secondary"}>
                          {formatCurrency(contractor.current_balance)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={contractor.is_active ? "default" : "secondary"}>
                          {contractor.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(contractor)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(contractor)}
                        >
                          {contractor.is_active ? "Deactivate" : "Activate"}
                        </Button>
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
  );
};

export default Contractors;
