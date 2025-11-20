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
import { Save } from 'lucide-react';

export default function ContraVoucher() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [cashBankLedgers, setCashBankLedgers] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromLedger, setFromLedger] = useState('');
  const [toLedger, setToLedger] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchCashBankLedgers();
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('*').order('name');
    setCompanies(data || []);
    if (data && data.length > 0) setSelectedCompany(data[0].id);
  };

  const fetchCashBankLedgers = async () => {
    const { data } = await supabase
      .from('ledgers')
      .select('*')
      .eq('company_id', selectedCompany)
      .in('ledger_type', ['cash_in_hand', 'bank_accounts'])
      .order('name');
    setCashBankLedgers(data || []);
  };

  const handleSubmit = async () => {
    if (!fromLedger || !toLedger || !amount || parseFloat(amount) <= 0) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    if (fromLedger === toLedger) {
      toast({ title: 'From and To ledgers cannot be same', variant: 'destructive' });
      return;
    }

    try {
      // Generate voucher number
      const { data: existingVouchers } = await supabase
        .from('vouchers')
        .select('voucher_number')
        .eq('company_id', selectedCompany)
        .eq('voucher_type', 'contra')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (existingVouchers && existingVouchers.length > 0) {
        const lastNumber = parseInt(existingVouchers[0].voucher_number.split('-')[1]);
        nextNumber = lastNumber + 1;
      }
      const voucherNumber = `CNT-${nextNumber.toString().padStart(5, '0')}`;

      const amountValue = parseFloat(amount);

      // Create voucher
      const { data: voucher, error: voucherError } = await supabase
        .from('vouchers')
        .insert({
          voucher_number: voucherNumber,
          voucher_date: voucherDate,
          voucher_type: 'contra',
          company_id: selectedCompany,
          created_by: user?.id,
          total_amount: amountValue,
          narration,
        })
        .select()
        .single();

      if (voucherError) throw voucherError;

      // Create entries (Debit To Ledger, Credit From Ledger)
      const entries = [
        {
          voucher_id: voucher.id,
          ledger_id: toLedger,
          debit_amount: amountValue,
          credit_amount: 0,
          narration,
        },
        {
          voucher_id: voucher.id,
          ledger_id: fromLedger,
          debit_amount: 0,
          credit_amount: amountValue,
          narration,
        },
      ];

      const { error: entriesError } = await supabase.from('voucher_entries').insert(entries);
      if (entriesError) throw entriesError;

      toast({ title: 'Contra voucher created successfully' });
      
      // Reset form
      setFromLedger('');
      setToLedger('');
      setAmount('');
      setNarration('');
    } catch (error: any) {
      toast({ title: 'Error creating contra voucher', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Contra Voucher</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Transfer between cash and bank accounts
      </p>

      <Card className="p-6 max-w-2xl">
        <div className="space-y-4">
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
            <Label>From (Credit) *</Label>
            <Select value={fromLedger} onValueChange={setFromLedger}>
              <SelectTrigger>
                <SelectValue placeholder="Select Cash/Bank Account" />
              </SelectTrigger>
              <SelectContent>
                {cashBankLedgers.map((ledger) => (
                  <SelectItem key={ledger.id} value={ledger.id}>
                    {ledger.name} ({ledger.ledger_type === 'cash_in_hand' ? 'Cash' : 'Bank'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>To (Debit) *</Label>
            <Select value={toLedger} onValueChange={setToLedger}>
              <SelectTrigger>
                <SelectValue placeholder="Select Cash/Bank Account" />
              </SelectTrigger>
              <SelectContent>
                {cashBankLedgers.map((ledger) => (
                  <SelectItem key={ledger.id} value={ledger.id}>
                    {ledger.name} ({ledger.ledger_type === 'cash_in_hand' ? 'Cash' : 'Bank'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Amount *</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Narration</Label>
            <Textarea
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="Transfer details..."
            />
          </div>

          <Button onClick={handleSubmit} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Contra Voucher
          </Button>
        </div>
      </Card>
    </div>
  );
}