import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';

export default function TrialBalance() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [trialBalanceData, setTrialBalanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name');
    
    if (error) {
      toast({ title: 'Error fetching companies', variant: 'destructive' });
    } else {
      setCompanies(data || []);
      if (data && data.length > 0) {
        setSelectedCompany(data[0].id);
      }
    }
  };

  const fetchTrialBalance = async () => {
    if (!selectedCompany || !fromDate || !toDate) {
      toast({ title: 'Please select company and date range', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Fetch all ledgers with their opening balances
      const { data: ledgers, error: ledgerError } = await supabase
        .from('ledgers')
        .select('*')
        .eq('company_id', selectedCompany);

      if (ledgerError) throw ledgerError;

      // Fetch all voucher entries for the period
      const { data: entries, error: entriesError } = await supabase
        .from('voucher_entries')
        .select(`
          *,
          ledger_id,
          vouchers!inner(
            company_id,
            voucher_date
          )
        `)
        .eq('vouchers.company_id', selectedCompany)
        .gte('vouchers.voucher_date', fromDate)
        .lte('vouchers.voucher_date', toDate);

      if (entriesError) throw entriesError;

      // Calculate trial balance
      const trialBalance = ledgers?.map((ledger) => {
        const ledgerEntries = entries?.filter((e: any) => e.ledger_id === ledger.id) || [];
        const totalDebit = ledgerEntries.reduce((sum, e) => sum + Number(e.debit_amount || 0), 0);
        const totalCredit = ledgerEntries.reduce((sum, e) => sum + Number(e.credit_amount || 0), 0);
        const openingBalance = Number(ledger.opening_balance || 0);

        return {
          name: ledger.name,
          ledgerType: ledger.ledger_type,
          openingBalance,
          debit: totalDebit,
          credit: totalCredit,
          closingBalance: openingBalance + totalDebit - totalCredit,
        };
      }) || [];

      setTrialBalanceData(trialBalance);
    } catch (error: any) {
      toast({ title: 'Error generating trial balance', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const totalDebit = trialBalanceData.reduce((sum, row) => sum + row.debit, 0);
  const totalCredit = trialBalanceData.reduce((sum, row) => sum + row.credit, 0);
  const totalClosingDebit = trialBalanceData.reduce((sum, row) => row.closingBalance > 0 ? sum + row.closingBalance : sum, 0);
  const totalClosingCredit = trialBalanceData.reduce((sum, row) => row.closingBalance < 0 ? sum + Math.abs(row.closingBalance) : sum, 0);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Trial Balance</h1>

      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Company</label>
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
            <label className="block text-sm font-medium mb-2">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={fetchTrialBalance} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
            </Button>
            <Button variant="outline" disabled={trialBalanceData.length === 0}>
              <FileDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {trialBalanceData.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ledger Name</TableHead>
                <TableHead>Group</TableHead>
                <TableHead className="text-right">Debit (₹)</TableHead>
                <TableHead className="text-right">Credit (₹)</TableHead>
                <TableHead className="text-right">Closing Balance (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trialBalanceData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.ledgerType.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-right">{row.debit.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.credit.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {row.closingBalance >= 0 ? `${row.closingBalance.toFixed(2)} Dr` : `${Math.abs(row.closingBalance).toFixed(2)} Cr`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">{totalDebit.toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold">{totalCredit.toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold">
                  {totalClosingDebit.toFixed(2)} Dr / {totalClosingCredit.toFixed(2)} Cr
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      )}
    </div>
  );
}