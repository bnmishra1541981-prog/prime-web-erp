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
import { Loader2, Plus, Pencil, Users } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface Employee {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  daily_wage: number;
  is_active: boolean;
  saw_mill_id: string | null;
  saw_mills?: { name: string } | null;
}

const ROLES = [
  { id: "admin", label: "Admin" },
  { id: "production_team", label: "Production Team" },
  { id: "accounts_team", label: "Accounts Team" },
  { id: "viewer", label: "Viewer" },
];

const Employees = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [sawMills, setSawMills] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    role: "production_team",
    daily_wage: 0,
    saw_mill_id: "",
  });

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) {
      fetchSawMills();
      fetchEmployees();
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

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sawmill_employees")
      .select("*, saw_mills(name)")
      .eq("company_id", selectedCompany)
      .order("name");
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Employee name is required", variant: "destructive" });
      return;
    }

    try {
      const payload = {
        company_id: selectedCompany,
        name: formData.name,
        phone: formData.phone || null,
        role: formData.role as any,
        daily_wage: formData.daily_wage,
        saw_mill_id: formData.saw_mill_id || null,
      };

      if (editingEmployee) {
        const { error } = await supabase
          .from("sawmill_employees")
          .update(payload)
          .eq("id", editingEmployee.id);
        
        if (error) throw error;
        toast({ title: "Success", description: "Employee updated successfully" });
      } else {
        const { error } = await supabase.from("sawmill_employees").insert(payload);
        if (error) throw error;
        toast({ title: "Success", description: "Employee created successfully" });
      }
      
      setDialogOpen(false);
      setEditingEmployee(null);
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", phone: "", role: "production_team", daily_wage: 0, saw_mill_id: "" });
  };

  const toggleActive = async (employee: Employee) => {
    const { error } = await supabase
      .from("sawmill_employees")
      .update({ is_active: !employee.is_active })
      .eq("id", employee.id);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchEmployees();
    }
  };

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      phone: employee.phone || "",
      role: employee.role,
      daily_wage: employee.daily_wage,
      saw_mill_id: employee.saw_mill_id || "",
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingEmployee(null);
    resetForm();
    setDialogOpen(true);
  };

  const getRoleLabel = (role: string) => {
    return ROLES.find(r => r.id === role)?.label || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "default";
      case "production_team": return "secondary";
      case "accounts_team": return "outline";
      default: return "secondary";
    }
  };

  if (loading && employees.length === 0) {
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
          <h1 className="text-2xl font-bold text-foreground">Employees</h1>
          <p className="text-muted-foreground">Manage sawmill employees and their roles</p>
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
                <Plus className="h-4 w-4 mr-2" /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Employee name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="daily_wage">Daily Wage</Label>
                    <Input
                      id="daily_wage"
                      type="number"
                      value={formData.daily_wage}
                      onChange={(e) => setFormData({ ...formData, daily_wage: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>
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
                <Button type="submit" className="w-full">
                  {editingEmployee ? "Update" : "Create"} Employee
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employees List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No employees found. Add your first employee.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Saw Mill</TableHead>
                    <TableHead className="text-right">Daily Wage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(employee.role) as any}>
                          {getRoleLabel(employee.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>{employee.saw_mills?.name || "All Mills"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(employee.daily_wage)}</TableCell>
                      <TableCell>
                        <Badge variant={employee.is_active ? "default" : "secondary"}>
                          {employee.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(employee)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(employee)}
                        >
                          {employee.is_active ? "Deactivate" : "Activate"}
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

export default Employees;
