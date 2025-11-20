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

export default function BalanceSheet() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState('');
  const [liabilitiesData, setLiabilitiesData] = useState<any[]>([]);
  const [assetsData, setAssetsData] = useState<any[]>([]);
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

  const fetchBalanceSheet = async () => {
    if (!selectedCompany || !asOfDate) {
      toast({ title: 'Please select company and date', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Fetch liability ledgers
      const { data: liabilityLedgers, error: liabilityError } = await supabase
        .from('ledgers')
        .select('*')
        .eq('company_id', selectedCompany)
        .in('ledger_type', ['capital_account', 'reserves_and_surplus', 'secured_loans', 'unsecured_loans', 'sundry_creditors', 'duties_and_taxes']);

      if (liabilityError) throw liabilityError;

      // Fetch asset ledgers
      const { data: assetLedgers, error: assetError } = await supabase
        .from('ledgers')
        .select('*')
        .eq('company_id', selectedCompany)
        .in('ledger_type', ['fixed_assets', 'investments', 'current_assets', 'sundry_debtors', 'cash_in_hand', 'bank_accounts', 'stock_in_hand', 'deposits_assets', 'loans_and_advances_assets']);

      if (assetError) throw assetError;

      // Fetch voucher entries up to the date
      const { data: entries, error: entriesError } = await supabase
        .from('voucher_entries')
        .select(`
          *,
          vouchers!inner(
            company_id,
            voucher_date
          )
        `)
        .eq('vouchers.company_id', selectedCompany)
        .lte('vouchers.voucher_date', asOfDate);

      if (entriesError) throw entriesError;

      // Calculate liabilities
      const liabilities = liabilityLedgers?.map((ledger) => {
        const ledgerEntries = entries?.filter((e: any) => e.ledger_id === ledger.id) || [];
        const balance = Number(ledger.opening_balance || 0) + 
          ledgerEntries.reduce((sum, e) => sum + Number(e.credit_amount || 0) - Number(e.debit_amount || 0), 0);
        return {
          name: ledger.name,
          group: ledger.ledger_type,
          amount: balance,
        };
      }) || [];

      // Calculate assets
      const assets = assetLedgers?.map((ledger) => {
        const ledgerEntries = entries?.filter((e: any) => e.ledger_id === ledger.id) || [];
        const balance = Number(ledger.opening_balance || 0) + 
          ledgerEntries.reduce((sum, e) => sum + Number(e.debit_amount || 0) - Number(e.credit_amount || 0), 0);
        return {
          name: ledger.name,
          group: ledger.ledger_type,
          amount: balance,
        };
      }) || [];

      setLiabilitiesData(liabilities);
      setAssetsData(assets);
    } catch (error: any) {
      toast({ title: 'Error generating balance sheet', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const totalLiabilities = liabilitiesData.reduce((sum, row) => sum + row.amount, 0);
  const totalAssets = assetsData.reduce((sum, row) => sum + row.amount, 0);
  const difference = totalAssets - totalLiabilities;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Balance Sheet</h1>

      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <label className="block text-sm font-medium mb-2">As on Date</label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={fetchBalanceSheet} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
            </Button>
            <Button variant="outline" disabled={liabilitiesData.length === 0}>
              <FileDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {liabilitiesData.length > 0 || assetsData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="p-4 bg-muted font-bold">LIABILITIES</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Particulars</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liabilitiesData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">{row.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {difference < 0 && (
                  <TableRow className="font-bold bg-destructive/10">
                    <TableCell>Profit for the Year</TableCell>
                    <TableCell className="text-right">{Math.abs(difference).toFixed(2)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">
                    {(totalLiabilities + (difference < 0 ? Math.abs(difference) : 0)).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </Card>

          <Card>
            <div className="p-4 bg-muted font-bold">ASSETS</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Particulars</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetsData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">{row.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {difference > 0 && (
                  <TableRow className="font-bold bg-destructive/10">
                    <TableCell>Loss for the Year</TableCell>
                    <TableCell className="text-right">{difference.toFixed(2)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">
                    {(totalAssets + (difference > 0 ? difference : 0)).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </Card>
        </div>
      ) : null}
    </div>
  );
}