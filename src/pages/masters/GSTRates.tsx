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

export default function GSTRates() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [gstRates, setGstRates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    cgst_rate: '',
    sgst_rate: '',
    igst_rate: '',
    cess_rate: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchGSTRates();
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('*').order('name');
    setCompanies(data || []);
    if (data && data.length > 0) setSelectedCompany(data[0].id);
  };

  const fetchGSTRates = async () => {
    const { data } = await supabase
      .from('gst_rates')
      .select('*')
      .eq('company_id', selectedCompany)
      .order('name');
    setGstRates(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      company_id: selectedCompany,
      cgst_rate: parseFloat(formData.cgst_rate) || 0,
      sgst_rate: parseFloat(formData.sgst_rate) || 0,
      igst_rate: parseFloat(formData.igst_rate) || 0,
      cess_rate: parseFloat(formData.cess_rate) || 0,
    };

    if (editingRate) {
      const { error } = await supabase.from('gst_rates').update(payload).eq('id', editingRate.id);
      if (error) {
        toast({ title: 'Error updating GST rate', variant: 'destructive' });
      } else {
        toast({ title: 'GST rate updated successfully' });
        setOpen(false);
        fetchGSTRates();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('gst_rates').insert(payload);
      if (error) {
        toast({ title: 'Error creating GST rate', variant: 'destructive' });
      } else {
        toast({ title: 'GST rate created successfully' });
        setOpen(false);
        fetchGSTRates();
        resetForm();
      }
    }
  };

  const handleEdit = (rate: any) => {
    setEditingRate(rate);
    setFormData({
      name: rate.name,
      cgst_rate: rate.cgst_rate?.toString() || '',
      sgst_rate: rate.sgst_rate?.toString() || '',
      igst_rate: rate.igst_rate?.toString() || '',
      cess_rate: rate.cess_rate?.toString() || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this GST rate?')) {
      const { error } = await supabase.from('gst_rates').delete().eq('id', id);
      if (error) {
        toast({ title: 'Error deleting GST rate', variant: 'destructive' });
      } else {
        toast({ title: 'GST rate deleted successfully' });
        fetchGSTRates();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cgst_rate: '',
      sgst_rate: '',
      igst_rate: '',
      cess_rate: '',
    });
    setEditingRate(null);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">GST Rates</h1>
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
                New GST Rate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRate ? 'Edit' : 'New'} GST Rate</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Rate Name * (e.g., GST 18%)</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="GST 18%"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>CGST Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cgst_rate}
                      onChange={(e) => setFormData({ ...formData, cgst_rate: e.target.value })}
                      placeholder="9.00"
                    />
                  </div>
                  <div>
                    <Label>SGST Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.sgst_rate}
                      onChange={(e) => setFormData({ ...formData, sgst_rate: e.target.value })}
                      placeholder="9.00"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>IGST Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.igst_rate}
                      onChange={(e) => setFormData({ ...formData, igst_rate: e.target.value })}
                      placeholder="18.00"
                    />
                  </div>
                  <div>
                    <Label>Cess Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cess_rate}
                      onChange={(e) => setFormData({ ...formData, cess_rate: e.target.value })}
                      placeholder="0.00"
                    />
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
              <TableHead>Rate Name</TableHead>
              <TableHead className="text-right">CGST (%)</TableHead>
              <TableHead className="text-right">SGST (%)</TableHead>
              <TableHead className="text-right">IGST (%)</TableHead>
              <TableHead className="text-right">Cess (%)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gstRates.map((rate) => (
              <TableRow key={rate.id}>
                <TableCell className="font-medium">{rate.name}</TableCell>
                <TableCell className="text-right">{rate.cgst_rate}%</TableCell>
                <TableCell className="text-right">{rate.sgst_rate}%</TableCell>
                <TableCell className="text-right">{rate.igst_rate}%</TableCell>
                <TableCell className="text-right">{rate.cess_rate}%</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${rate.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {rate.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(rate)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(rate.id)}>
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