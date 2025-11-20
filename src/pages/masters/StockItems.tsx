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

export default function StockItems() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [stockGroups, setStockGroups] = useState<any[]>([]);
  const [godowns, setGodowns] = useState<any[]>([]);
  const [gstRates, setGstRates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'Nos',
    stock_group_id: '',
    opening_balance: '',
    opening_rate: '',
    reorder_level: '',
    hsn_code: '',
    gst_rate_id: '',
    godown_id: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchStockItems();
      fetchStockGroups();
      fetchGodowns();
      fetchGSTRates();
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('*').order('name');
    setCompanies(data || []);
    if (data && data.length > 0) setSelectedCompany(data[0].id);
  };

  const fetchStockItems = async () => {
    const { data } = await supabase
      .from('stock_items')
      .select('*, stock_groups(name), godowns(name), gst_rates(name)')
      .eq('company_id', selectedCompany)
      .order('name');
    setStockItems(data || []);
  };

  const fetchStockGroups = async () => {
    const { data } = await supabase.from('stock_groups').select('*').eq('company_id', selectedCompany);
    setStockGroups(data || []);
  };

  const fetchGodowns = async () => {
    const { data } = await supabase.from('godowns').select('*').eq('company_id', selectedCompany);
    setGodowns(data || []);
  };

  const fetchGSTRates = async () => {
    const { data } = await supabase.from('gst_rates').select('*').eq('company_id', selectedCompany);
    setGstRates(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const openingBalance = parseFloat(formData.opening_balance) || 0;
    const openingRate = parseFloat(formData.opening_rate) || 0;
    
    const payload = {
      ...formData,
      company_id: selectedCompany,
      opening_balance: openingBalance,
      opening_rate: openingRate,
      opening_value: openingBalance * openingRate,
      current_balance: openingBalance,
      current_value: openingBalance * openingRate,
      reorder_level: parseFloat(formData.reorder_level) || 0,
      stock_group_id: formData.stock_group_id || null,
      gst_rate_id: formData.gst_rate_id || null,
      godown_id: formData.godown_id || null,
    };

    if (editingItem) {
      const { error } = await supabase.from('stock_items').update(payload).eq('id', editingItem.id);
      if (error) {
        toast({ title: 'Error updating stock item', variant: 'destructive' });
      } else {
        toast({ title: 'Stock item updated successfully' });
        setOpen(false);
        fetchStockItems();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('stock_items').insert(payload);
      if (error) {
        toast({ title: 'Error creating stock item', variant: 'destructive' });
      } else {
        toast({ title: 'Stock item created successfully' });
        setOpen(false);
        fetchStockItems();
        resetForm();
      }
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      unit: item.unit,
      stock_group_id: item.stock_group_id || '',
      opening_balance: item.opening_balance?.toString() || '',
      opening_rate: item.opening_rate?.toString() || '',
      reorder_level: item.reorder_level?.toString() || '',
      hsn_code: item.hsn_code || '',
      gst_rate_id: item.gst_rate_id || '',
      godown_id: item.godown_id || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this stock item?')) {
      const { error } = await supabase.from('stock_items').delete().eq('id', id);
      if (error) {
        toast({ title: 'Error deleting stock item', variant: 'destructive' });
      } else {
        toast({ title: 'Stock item deleted successfully' });
        fetchStockItems();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      unit: 'Nos',
      stock_group_id: '',
      opening_balance: '',
      opening_rate: '',
      reorder_level: '',
      hsn_code: '',
      gst_rate_id: '',
      godown_id: '',
    });
    setEditingItem(null);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Stock Items</h1>
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
                New Stock Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit' : 'New'} Stock Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Item Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Stock Group</Label>
                    <Select
                      value={formData.stock_group_id}
                      onValueChange={(value) => setFormData({ ...formData, stock_group_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Group" />
                      </SelectTrigger>
                      <SelectContent>
                        {stockGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Godown</Label>
                    <Select
                      value={formData.godown_id}
                      onValueChange={(value) => setFormData({ ...formData, godown_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Godown" />
                      </SelectTrigger>
                      <SelectContent>
                        {godowns.map((godown) => (
                          <SelectItem key={godown.id} value={godown.id}>
                            {godown.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Opening Balance</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.opening_balance}
                      onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Opening Rate</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.opening_rate}
                      onChange={(e) => setFormData({ ...formData, opening_rate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Reorder Level</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.reorder_level}
                      onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>HSN Code</Label>
                    <Input
                      value={formData.hsn_code}
                      onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>GST Rate</Label>
                    <Select
                      value={formData.gst_rate_id}
                      onValueChange={(value) => setFormData({ ...formData, gst_rate_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select GST Rate" />
                      </SelectTrigger>
                      <SelectContent>
                        {gstRates.map((rate) => (
                          <SelectItem key={rate.id} value={rate.id}>
                            {rate.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
              <TableHead>Item Name</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Value (₹)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.stock_groups?.name || 'N/A'}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell className="text-right">{item.current_balance}</TableCell>
                <TableCell className="text-right">{item.current_value?.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
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