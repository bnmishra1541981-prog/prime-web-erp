import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Users, Download } from 'lucide-react';

const LedgerReport = () => {
  const [companies, setCompanies] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedLedger, setSelectedLedger] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchLedgers();
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
      if (data && data.length > 0) {
        setSelectedCompany(data[0].id);
      }
    } catch (error: any) {
      toast.error('Failed to fetch companies');
    }
  };

  const fetchLedgers = async () => {
    try {
      const { data, error } = await supabase
        .from('ledgers')
        .select('id, name, opening_balance')
        .eq('company_id', selectedCompany)
        .order('name');

      if (error) throw error;
      setLedgers(data || []);
      if (data && data.length > 0) {
        setSelectedLedger(data[0].id);
      }
    } catch (error: any) {
      toast.error('Failed to fetch ledgers');
    }
  };

  const fetchLedgerReport = async () => {
    if (!selectedLedger) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('voucher_entries')
        .select(`
          *,
          voucher:vouchers (
            id,
            voucher_number,
            voucher_date,
            voucher_type,
            narration
          )
        `)
        .eq('ledger_id', selectedLedger)
        .gte('voucher.voucher_date', startDate)
        .lte('voucher.voucher_date', endDate)
        .order('voucher.voucher_date', { ascending: true });

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch ledger report');
    } finally {
      setLoading(false);
    }
  };

  const selectedLedgerData = ledgers.find((l: any) => l.id === selectedLedger);
  let runningBalance = selectedLedgerData?.opening_balance || 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ledger Report</h1>
        <p className="text-sm text-muted-foreground">Detailed ledger transaction history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Options</CardTitle>
          <CardDescription>Select company, ledger and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ledger</Label>
              <Select value={selectedLedger} onValueChange={setSelectedLedger}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ledgers.map((ledger: any) => (
                    <SelectItem key={ledger.id} value={ledger.id}>
                      {ledger.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={fetchLedgerReport} className="w-full">
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Ledger Statement</CardTitle>
              <CardDescription>
                {selectedLedgerData?.name} - From {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              {selectedLedgerData && (
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <span className="font-semibold">Opening Balance: </span>
                  <span>₹{selectedLedgerData.opening_balance.toFixed(2)}</span>
                </div>
              )}
              
              {entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions found for the selected period.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Voucher No.</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Narration</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry: any) => {
                      runningBalance += (entry.debit_amount || 0) - (entry.credit_amount || 0);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {new Date(entry.voucher.voucher_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{entry.voucher.voucher_number}</TableCell>
                          <TableCell className="capitalize">{entry.voucher.voucher_type}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {entry.narration || entry.voucher.narration || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.debit_amount > 0 ? `₹${entry.debit_amount.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.credit_amount > 0 ? `₹${entry.credit_amount.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{runningBalance.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={6} className="text-right">Closing Balance</TableCell>
                      <TableCell className="text-right">₹{runningBalance.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LedgerReport;
