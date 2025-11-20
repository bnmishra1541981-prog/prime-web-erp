import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FileText, Download } from 'lucide-react';

const DayBook = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

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

  const fetchDayBook = async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select(`
          *,
          voucher_entries (
            id,
            debit_amount,
            credit_amount,
            narration,
            ledger:ledgers (id, name)
          )
        `)
        .eq('company_id', selectedCompany)
        .gte('voucher_date', startDate)
        .lte('voucher_date', endDate)
        .order('voucher_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setVouchers(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch day book');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany) {
      fetchDayBook();
    }
  }, [selectedCompany]);

  const totalDebit = vouchers.reduce((sum: number, v: any) => 
    sum + v.voucher_entries.reduce((s: number, e: any) => s + (e.debit_amount || 0), 0), 0);
  const totalCredit = vouchers.reduce((sum: number, v: any) => 
    sum + v.voucher_entries.reduce((s: number, e: any) => s + (e.credit_amount || 0), 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Day Book</h1>
        <p className="text-sm text-muted-foreground">Daily transaction summary</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Options</CardTitle>
          <CardDescription>Select date range and company</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
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
              <Button onClick={fetchDayBook} className="w-full">
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
              <CardTitle>Day Book Report</CardTitle>
              <CardDescription>
                From {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
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
          ) : vouchers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions found for the selected period.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Voucher No.</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vouchers.map((voucher: any) => (
                    <>
                      {voucher.voucher_entries.map((entry: any, idx: number) => (
                        <TableRow key={`${voucher.id}-${idx}`}>
                          {idx === 0 && (
                            <>
                              <TableCell rowSpan={voucher.voucher_entries.length}>
                                {new Date(voucher.voucher_date).toLocaleDateString()}
                              </TableCell>
                              <TableCell rowSpan={voucher.voucher_entries.length}>
                                {voucher.voucher_number}
                              </TableCell>
                              <TableCell rowSpan={voucher.voucher_entries.length} className="capitalize">
                                {voucher.voucher_type}
                              </TableCell>
                            </>
                          )}
                          <TableCell>{entry.ledger?.name}</TableCell>
                          <TableCell className="text-right">
                            {entry.debit_amount > 0 ? `₹${entry.debit_amount.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.credit_amount > 0 ? `₹${entry.credit_amount.toFixed(2)}` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                  <TableRow className="font-bold bg-muted">
                    <TableCell colSpan={4} className="text-right">Total</TableCell>
                    <TableCell className="text-right">₹{totalDebit.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{totalCredit.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DayBook;
