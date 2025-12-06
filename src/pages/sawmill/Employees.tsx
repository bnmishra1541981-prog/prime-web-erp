import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Users } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface UserRole {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  department: string | null;
  phone: string | null;
}

interface SawmillEmployee {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  daily_wage: number;
  is_active: boolean;
  user_id: string | null;
  saw_mills?: { name: string } | null;
}

interface EmployeeAssignment {
  id: string;
  employee_id: string;
  saw_mill_id: string;
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
  const [employees, setEmployees] = useState<SawmillEmployee[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserRole[]>([]);
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<SawmillEmployee | null>(null);
  const [formData, setFormData] = useState({
    user_id: "",
    role: "production_team",
    daily_wage: 0,
    selected_mills: [] as string[],
  });

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) {
      fetchSawMills();
      fetchEmployees();
      fetchTeamMembers();
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

  const fetchTeamMembers = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("id, user_id, full_name, role, department, phone")
      .order("full_name");
    setTeamMembers(data || []);
  };

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sawmill_employees")
      .select("*")
      .eq("company_id", selectedCompany)
      .order("name");
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setEmployees(data || []);
    }

    // Fetch employee assignments
    const employeeIds = (data || []).map(e => e.id);
    if (employeeIds.length > 0) {
      const { data: assignData } = await supabase
        .from("sawmill_employee_assignments")
        .select("*")
        .in("employee_id", employeeIds);
      setAssignments(assignData || []);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedTeam = teamMembers.find(t => t.user_id === formData.user_id);
    if (!selectedTeam) {
      toast({ title: "Error", description: "Please select a team member", variant: "destructive" });
      return;
    }

    try {
      if (editingEmployee) {
        // Update employee
        const { error } = await supabase
          .from("sawmill_employees")
          .update({
            role: formData.role as any,
            daily_wage: formData.daily_wage,
          })
          .eq("id", editingEmployee.id);
        
        if (error) throw error;

        // Update mill assignments
        await supabase
          .from("sawmill_employee_assignments")
          .delete()
          .eq("employee_id", editingEmployee.id);

        if (formData.selected_mills.length > 0) {
          const assignInserts = formData.selected_mills.map(mill_id => ({
            employee_id: editingEmployee.id,
            saw_mill_id: mill_id,
          }));
          await supabase.from("sawmill_employee_assignments").insert(assignInserts);
        }

        toast({ title: "Success", description: "Employee updated successfully" });
      } else {
        // Check if already assigned
        const existing = employees.find(e => e.user_id === formData.user_id);
        if (existing) {
          toast({ title: "Error", description: "This team member is already assigned", variant: "destructive" });
          return;
        }

        // Create employee
        const { data: newEmployee, error } = await supabase.from("sawmill_employees").insert({
          company_id: selectedCompany,
          user_id: formData.user_id,
          name: selectedTeam.full_name,
          phone: selectedTeam.phone,
          role: formData.role as any,
          daily_wage: formData.daily_wage,
        }).select().single();

        if (error) throw error;

        // Create mill assignments
        if (formData.selected_mills.length > 0 && newEmployee) {
          const assignInserts = formData.selected_mills.map(mill_id => ({
            employee_id: newEmployee.id,
            saw_mill_id: mill_id,
          }));
          await supabase.from("sawmill_employee_assignments").insert(assignInserts);
        }

        toast({ title: "Success", description: "Team member assigned successfully" });
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
    setFormData({ user_id: "", role: "production_team", daily_wage: 0, selected_mills: [] });
  };

  const toggleActive = async (employee: SawmillEmployee) => {
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

  const openEdit = (employee: SawmillEmployee) => {
    setEditingEmployee(employee);
    const empAssignments = assignments.filter(a => a.employee_id === employee.id);
    setFormData({
      user_id: employee.user_id || "",
      role: employee.role,
      daily_wage: employee.daily_wage,
      selected_mills: empAssignments.map(a => a.saw_mill_id),
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

  const getAssignedMills = (employeeId: string) => {
    const empAssignments = assignments.filter(a => a.employee_id === employeeId);
    if (empAssignments.length === 0) return "All Mills";
    return empAssignments.map(a => sawMills.find(m => m.id === a.saw_mill_id)?.name).filter(Boolean).join(", ");
  };

  const availableTeamMembers = teamMembers.filter(
    t => !employees.some(e => e.user_id === t.user_id && e.id !== editingEmployee?.id)
  );

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
          <h1 className="text-2xl font-bold text-foreground">Team Assignment</h1>
          <p className="text-muted-foreground">Assign team members to saw mills</p>
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
                <Plus className="h-4 w-4 mr-2" /> Assign Team
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? "Edit Assignment" : "Assign Team Member"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="team_member">Team Member *</Label>
                  <Select 
                    value={formData.user_id} 
                    onValueChange={(v) => setFormData({ ...formData, user_id: v })}
                    disabled={!!editingEmployee}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Team Member" />
                    </SelectTrigger>
                    <SelectContent>
                      {(editingEmployee ? teamMembers : availableTeamMembers).map((t) => (
                        <SelectItem key={t.user_id} value={t.user_id}>
                          {t.full_name} ({t.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role">Sawmill Role</Label>
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
                    <input
                      id="daily_wage"
                      type="number"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.daily_wage}
                      onChange={(e) => setFormData({ ...formData, daily_wage: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <Label>Assign to Saw Mills</Label>
                  <p className="text-xs text-muted-foreground mb-2">Leave unchecked for all mills</p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                    {sawMills.map((mill) => (
                      <div key={mill.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={mill.id}
                          checked={formData.selected_mills.includes(mill.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, selected_mills: [...formData.selected_mills, mill.id] });
                            } else {
                              setFormData({ ...formData, selected_mills: formData.selected_mills.filter(id => id !== mill.id) });
                            }
                          }}
                        />
                        <label htmlFor={mill.id} className="text-sm cursor-pointer">{mill.name}</label>
                      </div>
                    ))}
                    {sawMills.length === 0 && (
                      <p className="text-sm text-muted-foreground">No saw mills found</p>
                    )}
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  {editingEmployee ? "Update" : "Assign"} Team Member
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
            Assigned Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No team members assigned. Assign team members from the existing production team.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned Mills</TableHead>
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
                      <TableCell className="max-w-[200px] truncate">{getAssignedMills(employee.id)}</TableCell>
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