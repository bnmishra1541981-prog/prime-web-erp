import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  useEffect(() => {
    if (selectedCompany && fromDate && toDate) {
      fetchProfitAndLoss();
    }
  }, [selectedCompany, fromDate, toDate]);

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
        
        // Set default dates - first day of current month to today
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setFromDate(firstDay.toISOString().split('T')[0]);
        setToDate(today.toISOString().split('T')[0]);
      }
    }
  };

  const fetchProfitAndLoss = async () => {
    if (!selectedCompany || !fromDate || !toDate) {
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
      'sales_accounts': 'Sales Accounts',
      'direct_incomes': 'Direct Incomes',
      'indirect_incomes': 'Indirect Incomes',
      'purchase_accounts': 'Purchase Accounts',
      'direct_expenses': 'Direct Expenses',
      'indirect_expenses': 'Indirect Expenses',
    };
    return mapping[ledgerType] || ledgerType;
  };

  const groupByCategory = (data: LedgerEntry[]): Record<string, LedgerEntry[]> => {
    const grouped: Record<string, LedgerEntry[]> = {};
    data.forEach(item => {
      if (!grouped[item.groupName]) {
        grouped[item.groupName] = [];
      }
      grouped[item.groupName].push(item);
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

  // Calculate gross profit
  const totalSales = incomeData
    .filter(i => i.groupName === "Sales Accounts")
    .reduce((sum, item) => sum + item.amount, 0);
  
  const openingStock = 0; // This should come from stock_items opening_value
  const totalPurchases = expenseData
    .filter(e => e.groupName === "Purchase Accounts")
    .reduce((sum, item) => sum + item.amount, 0);
  
  const totalDirectExpenses = expenseData
    .filter(e => e.groupName === "Direct Expenses")
    .reduce((sum, item) => sum + item.amount, 0);
  
  const grossProfit = totalSales - (openingStock + totalPurchases + totalDirectExpenses);
  
  const totalIndirectExpenses = expenseData
    .filter(e => e.groupName === "Indirect Expenses")
    .reduce((sum, item) => sum + item.amount, 0);
  
  const totalIndirectIncome = incomeData
    .filter(i => i.groupName === "Direct Incomes" || i.groupName === "Indirect Incomes")
    .reduce((sum, item) => sum + item.amount, 0);

  const netProfit = grossProfit + totalIndirectIncome - totalIndirectExpenses;

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
            <Button 
              variant="outline" 
              onClick={handlePrint} 
              disabled={incomeData.length === 0 || loading}
              className="flex-1"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDownloadPDF} 
              disabled={incomeData.length === 0 || loading}
              className="flex-1"
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
                totalExpenditure={totalDirectExpenses + totalPurchases + totalIndirectExpenses}
                totalIncome={totalSales + totalIndirectIncome}
                netProfit={netProfit > 0 ? netProfit : 0}
                netLoss={netProfit < 0 ? Math.abs(netProfit) : 0}
              />
            )}
          </div>

          {/* Display Component */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-8">
                {/* Left Side - Expenses */}
                <div>
                  <h3 className="font-bold text-lg mb-4 border-b pb-2">Expenditure</h3>
                  <Table>
                    <TableBody>
                      {/* Opening Stock */}
                      <TableRow>
                        <TableCell className="font-medium">Opening Stock</TableCell>
                        <TableCell className="text-right">{openingStock.toFixed(2)}</TableCell>
                      </TableRow>

                      {/* Purchase Accounts */}
                      {expenseGroups["Purchase Accounts"] && (
                        <>
                          <TableRow 
                            className="cursor-pointer hover:bg-accent"
                            onClick={() => toggleGroup("Purchase Accounts")}
                          >
                            <TableCell className="font-medium">
                              {expandedGroups.has("Purchase Accounts") ? "−" : "+"} Purchase Accounts
                            </TableCell>
                            <TableCell className="text-right">
                              {totalPurchases.toFixed(2)}
                            </TableCell>
                          </TableRow>
                          {expandedGroups.has("Purchase Accounts") && 
                            expenseGroups["Purchase Accounts"].map((item, idx) => (
                              <TableRow key={`purchase-${idx}`}>
                                <TableCell className="pl-8 text-sm">{item.ledgerName}</TableCell>
                                <TableCell className="text-right text-sm">{item.amount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                          }
                        </>
                      )}

                      {/* Direct Expenses */}
                      {expenseGroups["Direct Expenses"] && (
                        <>
                          <TableRow 
                            className="cursor-pointer hover:bg-accent"
                            onClick={() => toggleGroup("Direct Expenses")}
                          >
                            <TableCell className="font-medium">
                              {expandedGroups.has("Direct Expenses") ? "−" : "+"} Direct Expenses
                            </TableCell>
                            <TableCell className="text-right">
                              {totalDirectExpenses.toFixed(2)}
                            </TableCell>
                          </TableRow>
                          {expandedGroups.has("Direct Expenses") && 
                            expenseGroups["Direct Expenses"].map((item, idx) => (
                              <TableRow key={`direct-exp-${idx}`}>
                                <TableCell className="pl-8 text-sm">{item.ledgerName}</TableCell>
                                <TableCell className="text-right text-sm">{item.amount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                          }
                        </>
                      )}

                      {/* Gross Profit */}
                      {grossProfit > 0 && (
                        <TableRow className="font-bold border-t">
                          <TableCell>Gross Profit c/o</TableCell>
                          <TableCell className="text-right">{grossProfit.toFixed(2)}</TableCell>
                        </TableRow>
                      )}

                      <TableRow className="font-bold border-t border-b-2">
                        <TableCell></TableCell>
                        <TableCell className="text-right">
                          {(openingStock + totalPurchases + totalDirectExpenses + Math.max(0, grossProfit)).toFixed(2)}
                        </TableCell>
                      </TableRow>

                      {/* Indirect Expenses */}
                      {expenseGroups["Indirect Expenses"] && (
                        <>
                          <TableRow 
                            className="cursor-pointer hover:bg-accent"
                            onClick={() => toggleGroup("Indirect Expenses")}
                          >
                            <TableCell className="font-medium">
                              {expandedGroups.has("Indirect Expenses") ? "−" : "+"} Indirect Expenses
                            </TableCell>
                            <TableCell className="text-right">
                              {totalIndirectExpenses.toFixed(2)}
                            </TableCell>
                          </TableRow>
                          {expandedGroups.has("Indirect Expenses") && 
                            expenseGroups["Indirect Expenses"].map((item, idx) => (
                              <TableRow key={`indirect-exp-${idx}`}>
                                <TableCell className="pl-8 text-sm">{item.ledgerName}</TableCell>
                                <TableCell className="text-right text-sm">{item.amount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                          }
                        </>
                      )}

                      {/* Net Profit */}
                      {netProfit > 0 && (
                        <TableRow className="font-bold border-t">
                          <TableCell>Net Profit</TableCell>
                          <TableCell className="text-right">{netProfit.toFixed(2)}</TableCell>
                        </TableRow>
                      )}

                      <TableRow className="font-bold border-t-2">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">
                          {(totalIndirectExpenses + Math.max(0, netProfit) + (grossProfit < 0 ? Math.abs(grossProfit) : 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Right Side - Income */}
                <div>
                  <h3 className="font-bold text-lg mb-4 border-b pb-2">Income</h3>
                  <Table>
                    <TableBody>
                      {/* Sales Accounts */}
                      {incomeGroups["Sales Accounts"] && (
                        <>
                          <TableRow 
                            className="cursor-pointer hover:bg-accent"
                            onClick={() => toggleGroup("Sales Accounts")}
                          >
                            <TableCell className="font-medium">
                              {expandedGroups.has("Sales Accounts") ? "−" : "+"} Sales Accounts
                            </TableCell>
                            <TableCell className="text-right">
                              {totalSales.toFixed(2)}
                            </TableCell>
                          </TableRow>
                          {expandedGroups.has("Sales Accounts") && 
                            incomeGroups["Sales Accounts"].map((item, idx) => (
                              <TableRow key={`sales-${idx}`}>
                                <TableCell className="pl-8 text-sm">{item.ledgerName}</TableCell>
                                <TableCell className="text-right text-sm">{item.amount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                          }
                        </>
                      )}

                      {/* Gross Loss */}
                      {grossProfit < 0 && (
                        <TableRow className="font-bold border-t">
                          <TableCell>Gross Loss b/d</TableCell>
                          <TableCell className="text-right">{Math.abs(grossProfit).toFixed(2)}</TableCell>
                        </TableRow>
                      )}

                      <TableRow className="font-bold border-t border-b-2">
                        <TableCell></TableCell>
                        <TableCell className="text-right">
                          {(totalSales + (grossProfit < 0 ? Math.abs(grossProfit) : 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>

                      {/* Gross Profit brought down */}
                      {grossProfit > 0 && (
                        <TableRow className="font-bold">
                          <TableCell>Gross Profit b/d</TableCell>
                          <TableCell className="text-right">{grossProfit.toFixed(2)}</TableCell>
                        </TableRow>
                      )}

                      {/* Indirect Income */}
                      {(incomeGroups["Direct Incomes"] || incomeGroups["Indirect Incomes"]) && (
                        <>
                          <TableRow 
                            className="cursor-pointer hover:bg-accent"
                            onClick={() => toggleGroup("Indirect Incomes")}
                          >
                            <TableCell className="font-medium">
                              {expandedGroups.has("Indirect Incomes") ? "−" : "+"} Indirect Incomes
                            </TableCell>
                            <TableCell className="text-right">
                              {totalIndirectIncome.toFixed(2)}
                            </TableCell>
                          </TableRow>
                          {expandedGroups.has("Indirect Incomes") && 
                            [...(incomeGroups["Direct Incomes"] || []), ...(incomeGroups["Indirect Incomes"] || [])].map((item, idx) => (
                              <TableRow key={`indirect-inc-${idx}`}>
                                <TableCell className="pl-8 text-sm">{item.ledgerName}</TableCell>
                                <TableCell className="text-right text-sm">{item.amount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                          }
                        </>
                      )}

                      {/* Net Loss */}
                      {netProfit < 0 && (
                        <TableRow className="font-bold border-t">
                          <TableCell>Net Loss</TableCell>
                          <TableCell className="text-right">{Math.abs(netProfit).toFixed(2)}</TableCell>
                        </TableRow>
                      )}

                      <TableRow className="font-bold border-t-2">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">
                          {(Math.max(0, grossProfit) + totalIndirectIncome + Math.max(0, -netProfit)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Card className="p-6 text-center text-muted-foreground">
            No data available for the selected period
          </Card>
        )
      )}
    </div>
  );
}