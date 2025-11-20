import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CostCenters() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchCostCenters();
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('*').order('name');
    setCompanies(data || []);
    if (data && data.length > 0) setSelectedCompany(data[0].id);
  };

  const fetchCostCenters = async () => {
    const { data } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('company_id', selectedCompany)
      .order('name');
    setCostCenters(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, company_id: selectedCompany };

    if (editingCenter) {
      const { error } = await supabase.from('cost_centers').update(payload).eq('id', editingCenter.id);
      if (error) {
        toast({ title: 'Error updating cost center', variant: 'destructive' });
      } else {
        toast({ title: 'Cost center updated successfully' });
        setOpen(false);
        fetchCostCenters();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('cost_centers').insert(payload);
      if (error) {
        toast({ title: 'Error creating cost center', variant: 'destructive' });
      } else {
        toast({ title: 'Cost center created successfully' });
        setOpen(false);
        fetchCostCenters();
        resetForm();
      }
    }
  };

  const handleEdit = (center: any) => {
    setEditingCenter(center);
    setFormData({
      name: center.name,
      category: center.category || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this cost center?')) {
      const { error } = await supabase.from('cost_centers').delete().eq('id', id);
      if (error) {
        toast({ title: 'Error deleting cost center', variant: 'destructive' });
      } else {
        toast({ title: 'Cost center deleted successfully' });
        fetchCostCenters();
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', category: '' });
    setEditingCenter(null);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Cost Centers</h1>
        <div className="flex gap-4">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select Company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Cost Center
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCenter ? 'Edit' : 'New'} Cost Center</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Cost Center Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Marketing Department"
                    required
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Department, Project, Branch"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Save</Button>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cost Center Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costCenters.map((center) => (
              <TableRow key={center.id}>
                <TableCell className="font-medium">{center.name}</TableCell>
                <TableCell>{center.category || 'N/A'}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${center.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {center.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(center)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(center.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}