import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type LedgerType = Database['public']['Enums']['ledger_type'];

interface Ledger {
  id: string;
  name: string;
  ledger_type: LedgerType;
  opening_balance: number;
  current_balance: number;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  address: string | null;
  contact_person: string | null;
  company_id: string;
}

interface Company {
  id: string;
  name: string;
}

const ledgerTypes = [
  { value: 'customer', label: 'Customer' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'bank', label: 'Bank' },
  { value: 'cash', label: 'Cash' },
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'capital', label: 'Capital' },
];

const Ledgers = () => {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLedger, setEditingLedger] = useState<Ledger | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    ledger_type: LedgerType;
    opening_balance: string;
    company_id: string;
    email: string;
    phone: string;
    gstin: string;
    address: string;
    contact_person: string;
  }>({
    name: '',
    ledger_type: 'customer' as LedgerType,
    opening_balance: '0',
    company_id: '',
    email: '',
    phone: '',
    gstin: '',
    address: '',
    contact_person: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [companiesRes, ledgersRes] = await Promise.all([
        supabase.from('companies').select('id, name').order('name'),
        supabase.from('ledgers').select('*').order('created_at', { ascending: false }),
      ]);

      if (companiesRes.error) throw companiesRes.error;
      if (ledgersRes.error) throw ledgersRes.error;

      setCompanies(companiesRes.data || []);
      setLedgers(ledgersRes.data || []);
      
      if (companiesRes.data && companiesRes.data.length > 0) {
        setFormData(prev => ({ ...prev, company_id: companiesRes.data[0].id }));
      }
    } catch (error: any) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const ledgerData = {
        ...formData,
        opening_balance: parseFloat(formData.opening_balance),
        current_balance: parseFloat(formData.opening_balance),
      };

      if (editingLedger) {
        const { error } = await supabase
          .from('ledgers')
          .update(ledgerData)
          .eq('id', editingLedger.id);

        if (error) throw error;
        toast.success('Ledger updated successfully');
      } else {
        const { error } = await supabase
          .from('ledgers')
          .insert([ledgerData]);

        if (error) throw error;
        toast.success('Ledger created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ledger?')) return;

    try {
      const { error } = await supabase
        .from('ledgers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Ledger deleted successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      ledger_type: 'customer' as LedgerType,
      opening_balance: '0',
      company_id: companies[0]?.id || '',
      email: '',
      phone: '',
      gstin: '',
      address: '',
      contact_person: '',
    });
    setEditingLedger(null);
  };

  const openEditDialog = (ledger: Ledger) => {
    setEditingLedger(ledger);
    setFormData({
      name: ledger.name,
      ledger_type: ledger.ledger_type,
      opening_balance: ledger.opening_balance.toString(),
      company_id: ledger.company_id,
      email: ledger.email || '',
      phone: ledger.phone || '',
      gstin: ledger.gstin || '',
      address: ledger.address || '',
      contact_person: ledger.contact_person || '',
    });
    setIsDialogOpen(true);
  };

  const getLedgerTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      customer: 'bg-blue-500',
      supplier: 'bg-purple-500',
      bank: 'bg-green-500',
      cash: 'bg-yellow-500',
      expense: 'bg-red-500',
      income: 'bg-emerald-500',
      asset: 'bg-cyan-500',
      liability: 'bg-orange-500',
      capital: 'bg-indigo-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ledgers</h1>
          <p className="text-sm text-muted-foreground">Manage your accounting ledgers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Ledger
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingLedger ? 'Edit Ledger' : 'Add New Ledger'}</DialogTitle>
              <DialogDescription>
                Enter the ledger details below
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_id">Company *</Label>
                  <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ledger_type">Ledger Type *</Label>
                  <Select value={formData.ledger_type} onValueChange={(value) => setFormData({ ...formData, ledger_type: value as LedgerType })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ledgerTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Ledger Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opening_balance">Opening Balance</Label>
                  <Input
                    id="opening_balance"
                    type="number"
                    step="0.01"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingLedger ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledger List</CardTitle>
          <CardDescription>All accounting ledgers in your system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : ledgers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No ledgers found. Add your first ledger to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Opening Balance</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgers.map((ledger) => (
                  <TableRow key={ledger.id}>
                    <TableCell className="font-medium">{ledger.name}</TableCell>
                    <TableCell>
                      <Badge className={getLedgerTypeBadgeColor(ledger.ledger_type)}>
                        {ledgerTypes.find(t => t.value === ledger.ledger_type)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">₹{ledger.opening_balance.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{ledger.current_balance.toFixed(2)}</TableCell>
                    <TableCell>{ledger.phone || ledger.email || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(ledger)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(ledger.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Ledgers;
