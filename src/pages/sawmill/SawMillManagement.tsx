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
import { Loader2, Plus, Pencil, Factory } from "lucide-react";

interface SawMill {
  id: string;
  name: string;
  location: string | null;
  is_active: boolean;
  company_id: string;
}

const SawMillManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [sawMills, setSawMills] = useState<SawMill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMill, setEditingMill] = useState<SawMill | null>(null);
  const [formData, setFormData] = useState({ name: "", location: "" });

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) fetchSawMills();
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
    setLoading(true);
    const { data, error } = await supabase
      .from("saw_mills")
      .select("*")
      .eq("company_id", selectedCompany)
      .order("name");
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSawMills(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Mill name is required", variant: "destructive" });
      return;
    }

    try {
      if (editingMill) {
        const { error } = await supabase
          .from("saw_mills")
          .update({ name: formData.name, location: formData.location || null })
          .eq("id", editingMill.id);
        
        if (error) throw error;
        toast({ title: "Success", description: "Saw mill updated successfully" });
      } else {
        const { error } = await supabase.from("saw_mills").insert({
          company_id: selectedCompany,
          name: formData.name,
          location: formData.location || null,
        });
        
        if (error) throw error;
        toast({ title: "Success", description: "Saw mill created successfully" });
      }
      
      setDialogOpen(false);
      setEditingMill(null);
      setFormData({ name: "", location: "" });
      fetchSawMills();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleActive = async (mill: SawMill) => {
    const { error } = await supabase
      .from("saw_mills")
      .update({ is_active: !mill.is_active })
      .eq("id", mill.id);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchSawMills();
    }
  };

  const openEdit = (mill: SawMill) => {
    setEditingMill(mill);
    setFormData({ name: mill.name, location: mill.location || "" });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingMill(null);
    setFormData({ name: "", location: "" });
    setDialogOpen(true);
  };

  if (loading && sawMills.length === 0) {
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
          <h1 className="text-2xl font-bold text-foreground">Saw Mills</h1>
          <p className="text-muted-foreground">Manage your saw mill locations</p>
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
                <Plus className="h-4 w-4 mr-2" /> Add Mill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingMill ? "Edit Saw Mill" : "Add Saw Mill"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Mill Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter mill name"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Enter location"
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingMill ? "Update" : "Create"} Saw Mill
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Saw Mills List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sawMills.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No saw mills found. Add your first mill.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sawMills.map((mill) => (
                    <TableRow key={mill.id}>
                      <TableCell className="font-medium">{mill.name}</TableCell>
                      <TableCell>{mill.location || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={mill.is_active ? "default" : "secondary"}>
                          {mill.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(mill)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(mill)}
                        >
                          {mill.is_active ? "Deactivate" : "Activate"}
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

export default SawMillManagement;
