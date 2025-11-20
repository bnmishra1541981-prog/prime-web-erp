import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, Download, Plus, Minus, TrendingUp, TrendingDown, FileDown } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { ProfitLossPrint } from '@/components/reports/ProfitLossPrint';

interface LedgerEntry {
  ledgerName: string;
  groupName: string;
  amount: number;
}

export default function ProfitAndLoss() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [incomeData, setIncomeData] = useState<LedgerEntry[]>([]);
  const [expenseData, setExpenseData] = useState<LedgerEntry[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

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

  const fetchProfitAndLoss = async () => {
    if (!selectedCompany || !fromDate || !toDate) {
      toast({ title: 'Please select company and date range', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Fetch income ledgers
      const { data: incomeLedgers, error: incomeError } = await supabase
        .from('ledgers')
        .select('*')
        .eq('company_id', selectedCompany)
        .in('ledger_type', ['sales_accounts', 'direct_incomes', 'indirect_incomes']);

      if (incomeError) throw incomeError;

      // Fetch expense ledgers
      const { data: expenseLedgers, error: expenseError } = await supabase
        .from('ledgers')
        .select('*')
        .eq('company_id', selectedCompany)
        .in('ledger_type', ['purchase_accounts', 'direct_expenses', 'indirect_expenses']);

      if (expenseError) throw expenseError;

      // Fetch voucher entries for the period
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
        .gte('vouchers.voucher_date', fromDate)
        .lte('vouchers.voucher_date', toDate);

      if (entriesError) throw entriesError;

      const income = incomeLedgers?.map((ledger) => {
        const ledgerEntries = entries?.filter((e: any) => e.ledger_id === ledger.id) || [];
        const amount = ledgerEntries.reduce((sum, e) => sum + Number(e.credit_amount || 0) - Number(e.debit_amount || 0), 0);
        return {
          ledgerName: ledger.name,
          groupName: formatGroupName(ledger.ledger_type),
          amount,
        };
      }) || [];

      const expenses = expenseLedgers?.map((ledger) => {
        const ledgerEntries = entries?.filter((e: any) => e.ledger_id === ledger.id) || [];
        const amount = ledgerEntries.reduce((sum, e) => sum + Number(e.debit_amount || 0) - Number(e.credit_amount || 0), 0);
        return {
          ledgerName: ledger.name,
          groupName: formatGroupName(ledger.ledger_type),
          amount,
        };
      }) || [];

      setIncomeData(income);
      setExpenseData(expenses);
    } catch (error: any) {
      toast({ title: 'Error generating P&L', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatGroupName = (ledgerType: string) => {
    const mapping: Record<string, string> = {
      'sales_accounts': 'Sales Account',
      'direct_incomes': 'Direct Income',
      'indirect_incomes': 'Indirect Income',
      'purchase_accounts': 'Purchase Account',
      'direct_expenses': 'Direct Expenses',
      'indirect_expenses': 'Indirect Expenses',
    };
    return mapping[ledgerType] || ledgerType;
  };

  const groupByCategory = (data: LedgerEntry[]) => {
    const grouped = new Map<string, LedgerEntry[]>();
    data.forEach(item => {
      const existing = grouped.get(item.groupName) || [];
      existing.push(item);
      grouped.set(item.groupName, existing);
    });
    return grouped;
  };

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save('Profit-Loss-Statement.pdf');
  };

  const totalIncome = incomeData.reduce((sum, row) => sum + row.amount, 0);
  const totalExpense = expenseData.reduce((sum, row) => sum + row.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const expenseGroups = groupByCategory(expenseData);
  const incomeGroups = groupByCategory(incomeData);

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Profit & Loss Account</h1>

      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <Button onClick={fetchProfitAndLoss} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handlePrint} 
              disabled={incomeData.length === 0}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDownloadPDF} 
              disabled={incomeData.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </Card>

      {incomeData.length > 0 || expenseData.length > 0 ? (
        <>
          {/* Hidden Print Component */}
          <div className="hidden">
            {selectedCompanyData && (
              <ProfitLossPrint
                ref={printRef}
                company={{
                  name: selectedCompanyData.name,
                  address: selectedCompanyData.address,
                  gstin: selectedCompanyData.gstin,
                  pan: selectedCompanyData.pan,
                }}
                fromDate={fromDate}
                toDate={toDate}
                expenditure={expenseData}
                income={incomeData}
                totalExpenditure={totalExpense}
                totalIncome={totalIncome}
                netProfit={netProfit}
                netLoss={Math.abs(netProfit < 0 ? netProfit : 0)}
              />
            )}
          </div>

          {/* Screen Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <div className="p-4 bg-muted font-bold">EXPENSES</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.ledgerName}</TableCell>
                      <TableCell className="text-right">{row.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {netProfit > 0 && (
                    <TableRow className="font-bold bg-muted">
                      <TableCell>Net Profit</TableCell>
                      <TableCell className="text-right">{netProfit.toFixed(2)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold">
                      {(totalExpense + (netProfit > 0 ? netProfit : 0)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </Card>

            <Card>
              <div className="p-4 bg-muted font-bold">INCOME</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.ledgerName}</TableCell>
                      <TableCell className="text-right">{row.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {netProfit < 0 && (
                    <TableRow className="font-bold bg-destructive/10">
                      <TableCell>Net Loss</TableCell>
                      <TableCell className="text-right">{Math.abs(netProfit).toFixed(2)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold">
                      {(totalIncome + (netProfit < 0 ? Math.abs(netProfit) : 0)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}