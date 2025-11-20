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
import { Textarea } from '@/components/ui/textarea';

export default function Godowns() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [godowns, setGodowns] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingGodown, setEditingGodown] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchGodowns();
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('*').order('name');
    setCompanies(data || []);
    if (data && data.length > 0) setSelectedCompany(data[0].id);
  };

  const fetchGodowns = async () => {
    const { data } = await supabase
      .from('godowns')
      .select('*')
      .eq('company_id', selectedCompany)
      .order('name');
    setGodowns(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, company_id: selectedCompany };

    if (editingGodown) {
      const { error } = await supabase.from('godowns').update(payload).eq('id', editingGodown.id);
      if (error) {
        toast({ title: 'Error updating godown', variant: 'destructive' });
      } else {
        toast({ title: 'Godown updated successfully' });
        setOpen(false);
        fetchGodowns();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('godowns').insert(payload);
      if (error) {
        toast({ title: 'Error creating godown', variant: 'destructive' });
      } else {
        toast({ title: 'Godown created successfully' });
        setOpen(false);
        fetchGodowns();
        resetForm();
      }
    }
  };

  const handleEdit = (godown: any) => {
    setEditingGodown(godown);
    setFormData({
      name: godown.name,
      address: godown.address || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this godown?')) {
      const { error } = await supabase.from('godowns').delete().eq('id', id);
      if (error) {
        toast({ title: 'Error deleting godown', variant: 'destructive' });
      } else {
        toast({ title: 'Godown deleted successfully' });
        fetchGodowns();
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', address: '' });
    setEditingGodown(null);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Godowns / Warehouses</h1>
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
                New Godown
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGodown ? 'Edit' : 'New'} Godown</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Godown Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
              <TableHead>Godown Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {godowns.map((godown) => (
              <TableRow key={godown.id}>
                <TableCell className="font-medium">{godown.name}</TableCell>
                <TableCell>{godown.address || 'N/A'}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${godown.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {godown.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(godown)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(godown.id)}>
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