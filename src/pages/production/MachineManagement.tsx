import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Wrench, Edit, Trash2, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { z } from 'zod';

const machineSchema = z.object({
  name: z.string().trim().min(1, 'Machine name is required').max(100),
  machine_code: z.string().trim().min(1, 'Machine code is required').max(50),
  department: z.string().trim().max(100).optional(),
  capacity: z.number().positive('Capacity must be positive').optional(),
  maintenance_schedule: z.string().max(500).optional(),
  next_maintenance_date: z.string().optional(),
});

interface Machine {
  id: string;
  name: string;
  machine_code: string;
  department: string | null;
  capacity: number | null;
  maintenance_schedule: string | null;
  next_maintenance_date: string | null;
  is_active: boolean;
  created_at: string;
  total_production?: number;
}

const MachineManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: '',
    machine_code: '',
    department: '',
    capacity: '',
    maintenance_schedule: '',
    next_maintenance_date: '',
    is_active: true
  });

  useEffect(() => {
    if (user) {
      checkUserRole();
      fetchMachines();
    }
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user role:', error);
      return;
    }

    setUserRole(data?.role || null);
    
    if (data?.role !== 'owner' && data?.role !== 'supervisor') {
      toast.error('Only owners and supervisors can manage machines');
      navigate('/production/orders');
    }
  };

  const fetchMachines = async () => {
    try {
      setLoading(true);
      
      // Fetch machines
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .select('*')
        .order('created_at', { ascending: false });

      if (machineError) throw machineError;

      // Fetch production data for each machine
      const { data: productionData, error: prodError } = await supabase
        .from('production_entries')
        .select('machine_id, produced_quantity');

      if (prodError) throw prodError;

      // Calculate total production per machine
      const productionByMachine: Record<string, number> = {};
      productionData?.forEach(entry => {
        if (entry.machine_id) {
          productionByMachine[entry.machine_id] = 
            (productionByMachine[entry.machine_id] || 0) + Number(entry.produced_quantity);
        }
      });

      // Combine data
      const machinesWithProduction = machineData?.map(machine => ({
        ...machine,
        total_production: productionByMachine[machine.id] || 0
      })) || [];

      setMachines(machinesWithProduction);
    } catch (error: any) {
      console.error('Error fetching machines:', error);
      toast.error('Failed to load machines');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    try {
      machineSchema.parse({
        name: formData.name,
        machine_code: formData.machine_code,
        department: formData.department || undefined,
        capacity: formData.capacity ? Number(formData.capacity) : undefined,
        maintenance_schedule: formData.maintenance_schedule || undefined,
        next_maintenance_date: formData.next_maintenance_date || undefined,
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setSubmitting(true);

    try {
      const machineData = {
        name: formData.name.trim(),
        machine_code: formData.machine_code.trim(),
        department: formData.department.trim() || null,
        capacity: formData.capacity ? Number(formData.capacity) : null,
        maintenance_schedule: formData.maintenance_schedule.trim() || null,
        next_maintenance_date: formData.next_maintenance_date || null,
        is_active: formData.is_active
      };

      if (editingMachine) {
        // Update existing machine
        const { error } = await supabase
          .from('machines')
          .update(machineData)
          .eq('id', editingMachine.id);

        if (error) throw error;
        toast.success('Machine updated successfully');
      } else {
        // Create new machine
        const { error } = await supabase
          .from('machines')
          .insert(machineData);

        if (error) throw error;
        toast.success('Machine created successfully');
      }

      resetForm();
      setIsDialogOpen(false);
      fetchMachines();
    } catch (error: any) {
      console.error('Error saving machine:', error);
      
      // Check for unique constraint violation
      if (error.code === '23505') {
        toast.error('Machine code already exists. Please use a unique code.');
      } else {
        toast.error(error.message || 'Failed to save machine');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setFormData({
      name: machine.name,
      machine_code: machine.machine_code,
      department: machine.department || '',
      capacity: machine.capacity?.toString() || '',
      maintenance_schedule: machine.maintenance_schedule || '',
      next_maintenance_date: machine.next_maintenance_date || '',
      is_active: machine.is_active
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleDelete = async (machineId: string, machineName: string) => {
    if (!confirm(`Are you sure you want to delete machine "${machineName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('machines')
        .delete()
        .eq('id', machineId);

      if (error) throw error;

      toast.success('Machine deleted successfully');
      fetchMachines();
    } catch (error: any) {
      console.error('Error deleting machine:', error);
      toast.error('Failed to delete machine');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      machine_code: '',
      department: '',
      capacity: '',
      maintenance_schedule: '',
      next_maintenance_date: '',
      is_active: true
    });
    setEditingMachine(null);
    setErrors({});
  };

  const isMaintenanceDue = (date: string | null) => {
    if (!date) return false;
    const maintenanceDate = new Date(date);
    const today = new Date();
    const daysUntil = Math.ceil((maintenanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && daysUntil >= 0;
  };

  const isMaintenanceOverdue = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading machines...</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'owner' && userRole !== 'supervisor') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Machine Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage production machines and maintenance schedules
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Machine
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMachine ? 'Edit Machine' : 'Add New Machine'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Machine Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., CNC Machine 1"
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-xs text-red-500">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="machine_code">Machine Code *</Label>
                    <Input
                      id="machine_code"
                      value={formData.machine_code}
                      onChange={(e) => setFormData({ ...formData, machine_code: e.target.value })}
                      placeholder="e.g., CNC-001"
                      className={errors.machine_code ? 'border-red-500' : ''}
                    />
                    {errors.machine_code && (
                      <p className="text-xs text-red-500">{errors.machine_code}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="e.g., Manufacturing"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity (units/day)</Label>
                    <Input
                      id="capacity"
                      type="number"
                      step="0.01"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      placeholder="e.g., 1000"
                      className={errors.capacity ? 'border-red-500' : ''}
                    />
                    {errors.capacity && (
                      <p className="text-xs text-red-500">{errors.capacity}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="next_maintenance_date">Next Maintenance Date</Label>
                    <Input
                      id="next_maintenance_date"
                      type="date"
                      value={formData.next_maintenance_date}
                      onChange={(e) => setFormData({ ...formData, next_maintenance_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="is_active">Status</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <Label htmlFor="is_active" className="cursor-pointer">
                        {formData.is_active ? 'Active' : 'Inactive'}
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenance_schedule">Maintenance Schedule</Label>
                  <Textarea
                    id="maintenance_schedule"
                    value={formData.maintenance_schedule}
                    onChange={(e) => setFormData({ ...formData, maintenance_schedule: e.target.value })}
                    placeholder="e.g., Weekly oil check, Monthly calibration..."
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe regular maintenance tasks and intervals
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Saving...' : editingMachine ? 'Update Machine' : 'Add Machine'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{machines.length}</p>
                <p className="text-sm text-muted-foreground">Total Machines</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {machines.filter(m => m.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {machines.filter(m => isMaintenanceDue(m.next_maintenance_date)).length}
                </p>
                <p className="text-sm text-muted-foreground">Due Soon</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  {machines.filter(m => isMaintenanceOverdue(m.next_maintenance_date)).length}
                </p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Machines List */}
        {machines.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wrench className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No machines yet</p>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Add your first production machine to get started
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Machine
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machines.map((machine) => (
              <Card key={machine.id} className={!machine.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-1 truncate">{machine.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{machine.machine_code}</p>
                    </div>
                    <Badge variant={machine.is_active ? 'default' : 'secondary'}>
                      {machine.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {machine.department && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Department: </span>
                      <span className="font-medium">{machine.department}</span>
                    </div>
                  )}

                  {machine.capacity && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Capacity: </span>
                      <span className="font-medium">{machine.capacity} units/day</span>
                    </div>
                  )}

                  <div className="text-sm">
                    <span className="text-muted-foreground">Total Production: </span>
                    <span className="font-semibold text-blue-600">
                      {machine.total_production || 0} units
                    </span>
                  </div>

                  {machine.next_maintenance_date && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Next Maintenance:</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {isMaintenanceOverdue(machine.next_maintenance_date) ? (
                          <>
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium text-red-600">
                              {format(new Date(machine.next_maintenance_date), 'dd MMM yyyy')} (Overdue)
                            </span>
                          </>
                        ) : isMaintenanceDue(machine.next_maintenance_date) ? (
                          <>
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium text-orange-600">
                              {format(new Date(machine.next_maintenance_date), 'dd MMM yyyy')} (Due Soon)
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm">
                              {format(new Date(machine.next_maintenance_date), 'dd MMM yyyy')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {machine.maintenance_schedule && (
                    <div className="text-xs bg-muted p-2 rounded">
                      <p className="font-medium mb-1">Maintenance Schedule:</p>
                      <p className="text-muted-foreground">{machine.maintenance_schedule}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(machine)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(machine.id, machine.name)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MachineManagement;
