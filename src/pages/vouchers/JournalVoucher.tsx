import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save } from 'lucide-react';

export default function JournalVoucher() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  const [entries, setEntries] = useState<any[]>([
    { ledger_id: '', debit_amount: '', credit_amount: '', narration: '' },
    { ledger_id: '', debit_amount: '', credit_amount: '', narration: '' },
  ]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchLedgers();
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('*').order('name');
    setCompanies(data || []);
    if (data && data.length > 0) setSelectedCompany(data[0].id);
  };

  const fetchLedgers = async () => {
    const { data } = await supabase
      .from('ledgers')
      .select('*')
      .eq('company_id', selectedCompany)
      .order('name');
    setLedgers(data || []);
  };

  const handleAddEntry = () => {
    setEntries([...entries, { ledger_id: '', debit_amount: '', credit_amount: '', narration: '' }]);
  };

  const handleRemoveEntry = (index: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const handleEntryChange = (index: number, field: string, value: string) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };

  const calculateTotals = () => {
    const totalDebit = entries.reduce((sum, entry) => sum + (parseFloat(entry.debit_amount) || 0), 0);
    const totalCredit = entries.reduce((sum, entry) => sum + (parseFloat(entry.credit_amount) || 0), 0);
    return { totalDebit, totalCredit, difference: totalDebit - totalCredit };
  };

  const handleSubmit = async () => {
    const { totalDebit, totalCredit, difference } = calculateTotals();

    if (Math.abs(difference) > 0.01) {
      toast({ title: 'Journal not balanced', description: `Difference: ₹${difference.toFixed(2)}`, variant: 'destructive' });
      return;
    }

    if (!entries.every(e => e.ledger_id)) {
      toast({ title: 'Please select ledgers for all entries', variant: 'destructive' });
      return;
    }

    try {
      // Generate voucher number
      const { data: existingVouchers } = await supabase
        .from('vouchers')
        .select('voucher_number')
        .eq('company_id', selectedCompany)
        .eq('voucher_type', 'journal')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (existingVouchers && existingVouchers.length > 0) {
        const lastNumber = parseInt(existingVouchers[0].voucher_number.split('-')[1]);
        nextNumber = lastNumber + 1;
      }
      const voucherNumber = `JV-${nextNumber.toString().padStart(5, '0')}`;

      // Create voucher
      const { data: voucher, error: voucherError } = await supabase
        .from('vouchers')
        .insert({
          voucher_number: voucherNumber,
          voucher_date: voucherDate,
          voucher_type: 'journal',
          company_id: selectedCompany,
          created_by: user?.id,
          total_amount: totalDebit,
          narration,
        })
        .select()
        .single();

      if (voucherError) throw voucherError;

      // Create entries
      const entriesData = entries.map(entry => ({
        voucher_id: voucher.id,
        ledger_id: entry.ledger_id,
        debit_amount: parseFloat(entry.debit_amount) || 0,
        credit_amount: parseFloat(entry.credit_amount) || 0,
        narration: entry.narration,
      }));

      const { error: entriesError } = await supabase
        .from('voucher_entries')
        .insert(entriesData);

      if (entriesError) throw entriesError;

      toast({ title: 'Journal voucher created successfully' });
      
      // Reset form
      setNarration('');
      setEntries([
        { ledger_id: '', debit_amount: '', credit_amount: '', narration: '' },
        { ledger_id: '', debit_amount: '', credit_amount: '', narration: '' },
      ]);
    } catch (error: any) {
      toast({ title: 'Error creating journal voucher', description: error.message, variant: 'destructive' });
    }
  };

  const { totalDebit, totalCredit, difference } = calculateTotals();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Journal Voucher</h1>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Label>Company *</Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger>
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
          </div>
          <div>
            <Label>Voucher Date *</Label>
            <Input type="date" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} />
          </div>
          <div>
            <Label>Narration</Label>
            <Input value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="General narration..." />
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-12 gap-2 font-medium text-sm">
            <div className="col-span-4">Ledger</div>
            <div className="col-span-3">Debit Amount</div>
            <div className="col-span-3">Credit Amount</div>
            <div className="col-span-2">Actions</div>
          </div>

          {entries.map((entry, index) => (
            <div key={index} className="grid grid-cols-12 gap-2">
              <div className="col-span-4">
                <Select value={entry.ledger_id} onValueChange={(value) => handleEntryChange(index, 'ledger_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Ledger" />
                  </SelectTrigger>
                  <SelectContent>
                    {ledgers.map((ledger) => (
                      <SelectItem key={ledger.id} value={ledger.id}>
                        {ledger.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  step="0.01"
                  value={entry.debit_amount}
                  onChange={(e) => handleEntryChange(index, 'debit_amount', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  step="0.01"
                  value={entry.credit_amount}
                  onChange={(e) => handleEntryChange(index, 'credit_amount', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-2 flex gap-1">
                {index >= 2 && (
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveEntry(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={handleAddEntry} className="mb-4">
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>

        <div className="border-t pt-4">
          <div className="grid grid-cols-12 gap-2 font-bold text-lg">
            <div className="col-span-4">Total</div>
            <div className="col-span-3">₹{totalDebit.toFixed(2)}</div>
            <div className="col-span-3">₹{totalCredit.toFixed(2)}</div>
            <div className="col-span-2">
              <span className={Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(difference) < 0.01 ? '✓ Balanced' : `Diff: ₹${difference.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <Button onClick={handleSubmit} disabled={Math.abs(difference) > 0.01} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save Journal Voucher
          </Button>
        </div>
      </Card>
    </div>
  );
}