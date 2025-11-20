import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Download, Upload } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchStockGroups();
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    const { data, error } = await supabase.from('companies').select('*').order('name');
    if (error) {
      console.error('Error fetching companies:', error);
      toast({ title: 'Error loading companies', description: error.message, variant: 'destructive' });
      return;
    }
    setCompanies(data || []);
    if (data && data.length > 0) {
      setSelectedCompany(data[0].id);
    } else {
      toast({ title: 'No companies found', description: 'Please create a company first', variant: 'destructive' });
    }
  };

  const fetchStockGroups = async () => {
    if (!selectedCompany) {
      console.log('No company selected');
      return;
    }
    console.log('Fetching stock groups for company:', selectedCompany);
    const { data, error } = await supabase
      .from('stock_groups')
      .select('*')
      .eq('company_id', selectedCompany)
      .order('name');
    
    if (error) {
      console.error('Error fetching stock groups:', error);
      toast({ title: 'Error loading stock groups', description: error.message, variant: 'destructive' });
      return;
    }
    console.log('Fetched stock groups:', data);
    setStockGroups(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany) {
      toast({ title: 'No company selected', description: 'Please select a company first', variant: 'destructive' });
      return;
    }

    const payload = { ...formData, company_id: selectedCompany };
    console.log('Submitting stock group:', payload);

    if (editingGroup) {
      const { error } = await supabase.from('stock_groups').update(payload).eq('id', editingGroup.id);
      if (error) {
        console.error('Error updating stock group:', error);
        toast({ title: 'Error updating stock group', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Stock group updated successfully' });
        setOpen(false);
        fetchStockGroups();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('stock_groups').insert(payload);
      if (error) {
        console.error('Error creating stock group:', error);
        toast({ title: 'Error creating stock group', description: error.message, variant: 'destructive' });
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
      console.log('Deleting stock group:', id);
      const { error } = await supabase.from('stock_groups').delete().eq('id', id);
      if (error) {
        console.error('Error deleting stock group:', error);
        toast({ title: 'Error deleting stock group', description: error.message, variant: 'destructive' });
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

  const handleExportCSV = () => {
    if (stockGroups.length === 0) {
      toast({ title: 'No data to export', description: 'Please add stock groups first', variant: 'destructive' });
      return;
    }

    // Create CSV content
    const headers = ['Name', 'Parent Group ID', 'Under Group'];
    const rows = stockGroups.map(group => [
      group.name,
      group.parent_group_id || '',
      group.under_group || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stock_groups_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'Export successful', description: `Exported ${stockGroups.length} stock groups` });
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedCompany) {
      toast({ title: 'No company selected', description: 'Please select a company first', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast({ title: 'Invalid CSV', description: 'CSV file is empty or has no data rows', variant: 'destructive' });
          return;
        }

        // Skip header row
        const dataLines = lines.slice(1);
        const groupsToInsert = [];

        for (const line of dataLines) {
          // Parse CSV line (handle quoted values)
          const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
          if (!matches || matches.length < 1) continue;

          const [name, parent_group_id, under_group] = matches.map(val => 
            val.replace(/^"|"$/g, '').trim()
          );

          if (name) {
            groupsToInsert.push({
              name,
              parent_group_id: parent_group_id || null,
              under_group: under_group || null,
              company_id: selectedCompany
            });
          }
        }

        if (groupsToInsert.length === 0) {
          toast({ title: 'No valid data', description: 'No valid stock groups found in CSV', variant: 'destructive' });
          return;
        }

        console.log('Importing stock groups:', groupsToInsert);
        const { error } = await supabase.from('stock_groups').insert(groupsToInsert);

        if (error) {
          console.error('Error importing stock groups:', error);
          toast({ title: 'Import failed', description: error.message, variant: 'destructive' });
        } else {
          toast({ title: 'Import successful', description: `Imported ${groupsToInsert.length} stock groups` });
          fetchStockGroups();
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast({ title: 'Import failed', description: 'Error parsing CSV file', variant: 'destructive' });
      }
    };

    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          <Button variant="outline" onClick={handleExportCSV} disabled={stockGroups.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
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
            {stockGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No stock groups found. Click "New Stock Group" to create one.
                </TableCell>
              </TableRow>
            ) : (
              stockGroups.map((group) => (
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
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}