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
  // Capital & Liability Groups
  { value: 'capital_account', label: 'Capital Account', category: 'Capital & Liability' },
  { value: 'reserves_and_surplus', label: 'Reserves & Surplus', category: 'Capital & Liability' },
  { value: 'secured_loans', label: 'Secured Loans', category: 'Capital & Liability' },
  { value: 'unsecured_loans', label: 'Unsecured Loans', category: 'Capital & Liability' },
  { value: 'duties_and_taxes', label: 'Duties & Taxes', category: 'Capital & Liability' },
  { value: 'sundry_creditors', label: 'Sundry Creditors', category: 'Capital & Liability' },
  { value: 'suspense_account', label: 'Suspense A/c', category: 'Capital & Liability' },
  { value: 'current_liabilities', label: 'Current Liabilities', category: 'Capital & Liability' },
  { value: 'loans_liability', label: 'Loans (Liability)', category: 'Capital & Liability' },
  { value: 'bank_od_account', label: 'Bank OD A/c', category: 'Capital & Liability' },
  { value: 'provisions', label: 'Provisions', category: 'Capital & Liability' },
  
  // Assets Groups
  { value: 'fixed_assets', label: 'Fixed Assets', category: 'Assets' },
  { value: 'investments', label: 'Investments', category: 'Assets' },
  { value: 'current_assets', label: 'Current Assets', category: 'Assets' },
  { value: 'sundry_debtors', label: 'Sundry Debtors', category: 'Assets' },
  { value: 'cash_in_hand', label: 'Cash-in-Hand', category: 'Assets' },
  { value: 'bank_accounts', label: 'Bank Accounts', category: 'Assets' },
  { value: 'stock_in_hand', label: 'Stock-in-Hand', category: 'Assets' },
  { value: 'deposits_assets', label: 'Deposits (Asset)', category: 'Assets' },
  { value: 'loans_and_advances_assets', label: 'Loans & Advances (Asset)', category: 'Assets' },
  
  // Income Groups
  { value: 'sales_accounts', label: 'Sales Accounts', category: 'Income' },
  { value: 'direct_incomes', label: 'Direct Incomes', category: 'Income' },
  { value: 'indirect_incomes', label: 'Indirect Incomes', category: 'Income' },
  
  // Expense Groups
  { value: 'purchase_accounts', label: 'Purchase Accounts', category: 'Expense' },
  { value: 'direct_expenses', label: 'Direct Expenses', category: 'Expense' },
  { value: 'indirect_expenses', label: 'Indirect Expenses', category: 'Expense' },
  
  // Non-Revenue Groups
  { value: 'branch_divisions', label: 'Branch / Divisions', category: 'Non-Revenue' },
  { value: 'misc_expenses_asset', label: 'Misc. Expenses (Asset)', category: 'Non-Revenue' },
  { value: 'profit_and_loss_account', label: 'Profit & Loss A/c', category: 'Non-Revenue' },
];

const Ledgers = () => {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingDefaults, setCreatingDefaults] = useState(false);
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
    ledger_type: 'sundry_debtors' as LedgerType,
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
      ledger_type: 'sundry_debtors' as LedgerType,
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

  const createDefaultLedgers = async () => {
    if (!formData.company_id) {
      toast.error('Please select a company first');
      return;
    }

    setCreatingDefaults(true);
    try {
      const defaultLedgers = ledgerTypes.map(type => ({
        name: type.label,
        ledger_type: type.value as LedgerType,
        opening_balance: 0,
        current_balance: 0,
        company_id: formData.company_id,
      }));

      const { error } = await supabase
        .from('ledgers')
        .insert(defaultLedgers);

      if (error) throw error;
      
      toast.success(`Created ${defaultLedgers.length} default ledger groups`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCreatingDefaults(false);
    }
  };

  const getLedgerTypeBadgeColor = (type: string) => {
    // Color based on category
    if (type.includes('capital') || type.includes('reserves') || type.includes('loans') || 
        type.includes('creditors') || type.includes('liabilities') || type.includes('provisions')) {
      return 'bg-orange-500';
    }
    if (type.includes('assets') || type.includes('debtors') || type.includes('bank') || 
        type.includes('cash') || type.includes('stock') || type.includes('investments') || 
        type.includes('deposits')) {
      return 'bg-cyan-500';
    }
    if (type.includes('sales') || type.includes('income')) {
      return 'bg-emerald-500';
    }
    if (type.includes('purchase') || type.includes('expense')) {
      return 'bg-red-500';
    }
    return 'bg-gray-500';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ledgers</h1>
          <p className="text-sm text-muted-foreground">Manage your accounting ledgers</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={createDefaultLedgers}
            disabled={creatingDefaults || !companies.length}
          >
            {creatingDefaults ? (
              <>Creating...</>
            ) : (
              <>Create Default Groups</>
            )}
          </Button>
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
                    <SelectContent className="max-h-[400px]">
                      {Object.entries(
                        ledgerTypes.reduce((acc, type) => {
                          if (!acc[type.category]) acc[type.category] = [];
                          acc[type.category].push(type);
                          return acc;
                        }, {} as Record<string, typeof ledgerTypes>)
                      ).map(([category, types]) => (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {category}
                          </div>
                          {types.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </div>
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
