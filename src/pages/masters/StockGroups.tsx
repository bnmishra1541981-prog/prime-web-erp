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

export default function StockGroups() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [stockGroups, setStockGroups] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    parent_group_id: '',
    under_group: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchStockGroups();
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('*').order('name');
    setCompanies(data || []);
    if (data && data.length > 0) setSelectedCompany(data[0].id);
  };

  const fetchStockGroups = async () => {
    const { data } = await supabase
      .from('stock_groups')
      .select('*')
      .eq('company_id', selectedCompany)
      .order('name');
    setStockGroups(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, company_id: selectedCompany };

    if (editingGroup) {
      const { error } = await supabase.from('stock_groups').update(payload).eq('id', editingGroup.id);
      if (error) {
        toast({ title: 'Error updating stock group', variant: 'destructive' });
      } else {
        toast({ title: 'Stock group updated successfully' });
        setOpen(false);
        fetchStockGroups();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('stock_groups').insert(payload);
      if (error) {
        toast({ title: 'Error creating stock group', variant: 'destructive' });
      } else {
        toast({ title: 'Stock group created successfully' });
        setOpen(false);
        fetchStockGroups();
        resetForm();
      }
    }
  };

  const handleEdit = (group: any) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      parent_group_id: group.parent_group_id || '',
      under_group: group.under_group || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this stock group?')) {
      const { error } = await supabase.from('stock_groups').delete().eq('id', id);
      if (error) {
        toast({ title: 'Error deleting stock group', variant: 'destructive' });
      } else {
        toast({ title: 'Stock group deleted successfully' });
        fetchStockGroups();
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', parent_group_id: '', under_group: '' });
    setEditingGroup(null);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Stock Groups</h1>
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
                New Stock Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGroup ? 'Edit' : 'New'} Stock Group</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Group Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Under Group</Label>
                  <Select
                    value={formData.parent_group_id}
                    onValueChange={(value) => setFormData({ ...formData, parent_group_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Parent Group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Primary</SelectItem>
                      {stockGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <TableHead>Group Name</TableHead>
              <TableHead>Under Group</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockGroups.map((group) => (
              <TableRow key={group.id}>
                <TableCell className="font-medium">{group.name}</TableCell>
                <TableCell>
                  {group.parent_group_id
                    ? stockGroups.find((g) => g.id === group.parent_group_id)?.name || 'N/A'
                    : 'Primary'}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(group)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(group.id)}>
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