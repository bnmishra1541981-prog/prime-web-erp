import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, Download, Plus, Minus, FileDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BalanceSheetPrint } from '@/components/reports/BalanceSheetPrint';
import { LedgerTransactionDialog } from '@/components/reports/LedgerTransactionDialog';
import { formatCurrency, getCurrencySymbol } from '@/lib/currency';
import { GstinCompanySelect } from '@/components/GstinCompanySelect';

interface LedgerEntry {
  ledgerName: string;
  groupName: string;
  amount: number;
  ledgerId?: string;
}

export default function BalanceSheet() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [companyCurrency, setCompanyCurrency] = useState<string>('INR');
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState('');
  const [liabilitiesData, setLiabilitiesData] = useState<LedgerEntry[]>([]);
  const [assetsData, setAssetsData] = useState<LedgerEntry[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedLedger, setSelectedLedger] = useState<{ id: string; name: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany && asOfDate) {
      fetchBalanceSheet();
    }
  }, [selectedCompany, asOfDate]);

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, currency')
      .order('name');
    
    if (error) {
      toast({ title: 'Error fetching companies', variant: 'destructive' });
    } else {
      setCompanies(data || []);
      if (data && data.length > 0) {
        setSelectedCompany(data[0].id);
        setCompanyCurrency(data[0].currency || 'INR');
      }
      // Set default date to current date
      if (!asOfDate) {
        setAsOfDate(new Date().toISOString().split('T')[0]);
      }
    }
  };

  const fetchBalanceSheet = async () => {
    if (!selectedCompany || !asOfDate) {
      return;
    }

    setLoading(true);
    try {
      // Fetch liability companies
      const { data: liabilityCompanies, error: liabilityCompError } = await supabase
        .from('companies')
        .select('*')
        .neq('id', selectedCompany)
        .in('ledger_type', [
          'capital_account', 'reserves_and_surplus', 'secured_loans', 'unsecured_loans', 
          'sundry_creditors', 'duties_and_taxes', 'suspense_account', 'current_liabilities',
          'loans_liability', 'bank_od_account', 'provisions'
        ]);

      if (liabilityCompError) throw liabilityCompError;

      // Fetch liability ledgers
      const { data: liabilityLedgers, error: liabilityError } = await supabase
        .from('ledgers')
        .select('*')
        .eq('company_id', selectedCompany)
        .in('ledger_type', [
          'capital_account', 'reserves_and_surplus', 'secured_loans', 'unsecured_loans', 
          'sundry_creditors', 'duties_and_taxes', 'suspense_account', 'current_liabilities',
          'loans_liability', 'bank_od_account', 'provisions'
        ]);

      if (liabilityError) throw liabilityError;

      // Fetch asset companies
      const { data: assetCompanies, error: assetCompError } = await supabase
        .from('companies')
        .select('*')
        .neq('id', selectedCompany)
        .in('ledger_type', [
          'fixed_assets', 'investments', 'current_assets', 'sundry_debtors', 
          'cash_in_hand', 'bank_accounts', 'stock_in_hand', 'deposits_assets', 
          'loans_and_advances_assets'
        ]);

      if (assetCompError) throw assetCompError;

      // Fetch asset ledgers
      const { data: assetLedgers, error: assetError } = await supabase
        .from('ledgers')
        .select('*')
        .eq('company_id', selectedCompany)
        .in('ledger_type', [
          'fixed_assets', 'investments', 'current_assets', 'sundry_debtors', 
          'cash_in_hand', 'bank_accounts', 'stock_in_hand', 'deposits_assets', 
          'loans_and_advances_assets'
        ]);

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

      const liabilityCompanyEntries = liabilityCompanies?.map((company) => ({
        ledgerName: company.name,
        groupName: formatGroupName(company.ledger_type),
        amount: 0, // Companies don't have balances directly
        ledgerId: undefined,
      })) || [];

      const liabilities = [
        ...liabilityCompanyEntries,
        ...(liabilityLedgers?.map((ledger) => {
          const ledgerEntries = entries?.filter((e: any) => e.ledger_id === ledger.id) || [];
          const balance = Number(ledger.opening_balance || 0) + 
            ledgerEntries.reduce((sum, e) => sum + Number(e.credit_amount || 0) - Number(e.debit_amount || 0), 0);
          return {
            ledgerName: ledger.name,
            groupName: formatGroupName(ledger.ledger_type),
            amount: balance,
            ledgerId: ledger.id,
          };
        }) || [])
      ];

      const assetCompanyEntries = assetCompanies?.map((company) => ({
        ledgerName: company.name,
        groupName: formatGroupName(company.ledger_type),
        amount: 0, // Companies don't have balances directly
        ledgerId: undefined,
      })) || [];

      const assets = [
        ...assetCompanyEntries,
        ...(assetLedgers?.map((ledger) => {
          const ledgerEntries = entries?.filter((e: any) => e.ledger_id === ledger.id) || [];
          const balance = Number(ledger.opening_balance || 0) + 
            ledgerEntries.reduce((sum, e) => sum + Number(e.debit_amount || 0) - Number(e.credit_amount || 0), 0);
          return {
            ledgerName: ledger.name,
            groupName: formatGroupName(ledger.ledger_type),
            amount: balance,
            ledgerId: ledger.id,
          };
        }) || [])
      ];

      setLiabilitiesData(liabilities);
      setAssetsData(assets);
    } catch (error: any) {
      toast({ title: 'Error generating balance sheet', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatGroupName = (ledgerType: string) => {
    const mapping: Record<string, string> = {
      // Capital & Liability
      'capital_account': 'Capital Account',
      'reserves_and_surplus': 'Reserves & Surplus',
      'secured_loans': 'Secured Loans',
      'unsecured_loans': 'Unsecured Loans',
      'sundry_creditors': 'Sundry Creditors',
      'duties_and_taxes': 'Duties & Taxes',
      'suspense_account': 'Suspense A/c',
      'current_liabilities': 'Current Liabilities',
      'loans_liability': 'Loans (Liability)',
      'bank_od_account': 'Bank OD A/c',
      'provisions': 'Provisions',
      // Assets
      'fixed_assets': 'Fixed Assets',
      'investments': 'Investments',
      'current_assets': 'Current Assets',
      'sundry_debtors': 'Sundry Debtors',
      'cash_in_hand': 'Cash-in-Hand',
      'bank_accounts': 'Bank Accounts',
      'stock_in_hand': 'Stock-in-Hand',
      'deposits_assets': 'Deposits (Asset)',
      'loans_and_advances_assets': 'Loans & Advances (Asset)',
    };
    return mapping[ledgerType] || ledgerType;
  };

  // Define the exact order for liability groups (matching Tally format)
  const liabilityGroupOrder = [
    'Capital Account',
    'Loans (Liability)',
    'Secured Loans',
    'Unsecured Loans',
    'Current Liabilities',
    'Sundry Creditors',
    'Duties & Taxes',
    'Bank OD A/c',
    'Provisions',
    'Reserves & Surplus',
    'Suspense A/c',
  ];

  // Define the exact order for asset groups (matching Tally format)
  const assetGroupOrder = [
    'Fixed Assets',
    'Investments',
    'Current Assets',
    'Sundry Debtors',
    'Cash-in-Hand',
    'Bank Accounts',
    'Stock-in-Hand',
    'Deposits (Asset)',
    'Loans & Advances (Asset)',
  ];

  const sortGroupsByOrder = (groups: Record<string, LedgerEntry[]>, order: string[]): [string, LedgerEntry[]][] => {
    const entries = Object.entries(groups);
    return entries.sort(([a], [b]) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
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

  const handleLedgerClick = (ledgerId: string, ledgerName: string) => {
    setSelectedLedger({ id: ledgerId, name: ledgerName });
    setDialogOpen(true);
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
    pdf.save('Balance-Sheet.pdf');
  };

  const totalLiabilities = liabilitiesData.reduce((sum, row) => sum + row.amount, 0);
  const totalAssets = assetsData.reduce((sum, row) => sum + row.amount, 0);
  const difference = totalAssets - totalLiabilities;

  const liabilityGroups = groupByCategory(liabilitiesData);
  const assetGroups = groupByCategory(assetsData);

  const sortedLiabilityGroups = sortGroupsByOrder(liabilityGroups, liabilityGroupOrder);
  const sortedAssetGroups = sortGroupsByOrder(assetGroups, assetGroupOrder);

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Balance Sheet</h1>

      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GstinCompanySelect
            value={selectedCompany}
            onValueChange={(value) => {
              setSelectedCompany(value);
              const company = companies.find(c => c.id === value);
              if (company) setCompanyCurrency(company.currency || 'INR');
            }}
            label="Company"
          />

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
            <Button 
              variant="outline" 
              onClick={handlePrint} 
              disabled={liabilitiesData.length === 0 || loading}
              className="flex-1"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDownloadPDF} 
              disabled={liabilitiesData.length === 0 || loading}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </Card>

      {liabilitiesData.length > 0 || assetsData.length > 0 ? (
        <>
          {/* Hidden Print Component */}
          <div className="hidden">
            {selectedCompanyData && (
              <BalanceSheetPrint
                ref={printRef}
                company={{
                  name: selectedCompanyData.name,
                  address: selectedCompanyData.address,
                  gstin: selectedCompanyData.gstin,
                  pan: selectedCompanyData.pan,
                }}
                asOfDate={asOfDate}
                liabilities={liabilitiesData}
                assets={assetsData}
                totalLiabilities={totalLiabilities}
                totalAssets={totalAssets}
                difference={difference}
              />
            )}
          </div>

          {/* Screen Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <div className="p-4 bg-muted font-bold">LIABILITIES</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right">Amount ({getCurrencySymbol(companyCurrency)})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLiabilityGroups.map(([groupName, items]) => {
                    const groupTotal = items.reduce((sum, item) => sum + item.amount, 0);
                    const isExpanded = expandedGroups.has(groupName);
                    const isCapitalAccount = groupName === 'Capital Account';
                    
                    return (
                      <>
                        <TableRow 
                          key={groupName} 
                          className={`font-semibold cursor-pointer hover:bg-muted/50 ${isCapitalAccount ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}`}
                          onClick={() => toggleGroup(groupName)}
                        >
                          <TableCell className="flex items-center gap-2">
                            {isExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            {groupName}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(groupTotal, companyCurrency)}</TableCell>
                        </TableRow>
                        {isExpanded && items.map((item, idx) => (
                          <TableRow 
                            key={`${groupName}-${idx}`} 
                            className="bg-muted/20 cursor-pointer hover:bg-muted/40"
                            onClick={() => item.ledgerId && handleLedgerClick(item.ledgerId, item.ledgerName)}
                          >
                            <TableCell className="pl-12 italic">{item.ledgerName}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.amount, companyCurrency)}</TableCell>
                          </TableRow>
                        ))}
                      </>
                    );
                  })}
                  <TableRow className="font-bold bg-primary/10">
                    <TableCell colSpan={2} className="text-left">Profit & Loss A/c</TableCell>
                  </TableRow>
                  {difference < 0 && (
                    <>
                      <TableRow className="bg-muted/20">
                        <TableCell className="pl-12 italic">Current Period (Profit)</TableCell>
                        <TableCell className="text-right">{formatCurrency(Math.abs(difference), companyCurrency)}</TableCell>
                      </TableRow>
                    </>
                  )}
                  {difference > 0 && (
                    <>
                      <TableRow className="bg-muted/20">
                        <TableCell className="pl-12 italic">Current Period (Loss)</TableCell>
                        <TableCell className="text-right">({formatCurrency(difference, companyCurrency)})</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-bold">Gross Total</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(totalLiabilities + (difference < 0 ? Math.abs(difference) : 0), companyCurrency)}
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
                    <TableHead className="text-right">Amount ({getCurrencySymbol(companyCurrency)})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAssetGroups.map(([groupName, items]) => {
                    const groupTotal = items.reduce((sum, item) => sum + item.amount, 0);
                    const isExpanded = expandedGroups.has(groupName);
                    
                    return (
                      <>
                        <TableRow 
                          key={groupName} 
                          className="font-semibold cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleGroup(groupName)}
                        >
                          <TableCell className="flex items-center gap-2">
                            {isExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            {groupName}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(groupTotal, companyCurrency)}</TableCell>
                        </TableRow>
                        {isExpanded && items.map((item, idx) => (
                          <TableRow 
                            key={`${groupName}-${idx}`} 
                            className="bg-muted/20 cursor-pointer hover:bg-muted/40"
                            onClick={() => item.ledgerId && handleLedgerClick(item.ledgerId, item.ledgerName)}
                          >
                            <TableCell className="pl-12 italic">{item.ledgerName}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.amount, companyCurrency)}</TableCell>
                          </TableRow>
                        ))}
                      </>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-bold">Gross Total</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(totalAssets + (difference > 0 ? difference : 0), companyCurrency)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </Card>
          </div>
        </>
      ) : null}

      <LedgerTransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ledgerId={selectedLedger?.id || null}
        ledgerName={selectedLedger?.name || ''}
        companyId={selectedCompany}
        asOfDate={asOfDate}
      />
    </div>
  );
}