import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  date: string;
  voucherNumber: string;
  voucherType: string;
  debit: number;
  credit: number;
  balance: number;
  narration: string | null;
}

interface LedgerTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledgerId: string | null;
  ledgerName: string;
  companyId: string;
  fromDate?: string;
  toDate?: string;
  asOfDate?: string;
}

export function LedgerTransactionDialog({
  open,
  onOpenChange,
  ledgerId,
  ledgerName,
  companyId,
  fromDate,
  toDate,
  asOfDate,
}: LedgerTransactionDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open && ledgerId) {
      fetchTransactions();
    }
  }, [open, ledgerId, fromDate, toDate, asOfDate]);

  const fetchTransactions = async () => {
    if (!ledgerId) return;

    setLoading(true);
    try {
      // Fetch ledger details for opening balance
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('ledgers')
        .select('opening_balance')
        .eq('id', ledgerId)
        .single();

      if (ledgerError) throw ledgerError;

      const opening = Number(ledgerData?.opening_balance || 0);
      setOpeningBalance(opening);

      // Build query for voucher entries
      let query = supabase
        .from('voucher_entries')
        .select(`
          id,
          debit_amount,
          credit_amount,
          narration,
          vouchers!inner(
            voucher_number,
            voucher_date,
            voucher_type,
            company_id
          )
        `)
        .eq('ledger_id', ledgerId)
        .eq('vouchers.company_id', companyId)
        .order('vouchers(voucher_date)', { ascending: true });

      // Apply date filters
      if (fromDate && toDate) {
        query = query
          .gte('vouchers.voucher_date', fromDate)
          .lte('vouchers.voucher_date', toDate);
      } else if (asOfDate) {
        query = query.lte('vouchers.voucher_date', asOfDate);
      }

      const { data: entries, error: entriesError } = await query;

      if (entriesError) throw entriesError;

      // Calculate running balance
      let runningBalance = opening;
      const transactionList: Transaction[] = entries?.map((entry: any) => {
        const debit = Number(entry.debit_amount || 0);
        const credit = Number(entry.credit_amount || 0);
        runningBalance += debit - credit;

        return {
          id: entry.id,
          date: entry.vouchers.voucher_date,
          voucherNumber: entry.vouchers.voucher_number,
          voucherType: entry.vouchers.voucher_type,
          debit,
          credit,
          balance: runningBalance,
          narration: entry.narration,
        };
      }) || [];

      setTransactions(transactionList);
    } catch (error: any) {
      toast({
        title: 'Error fetching transactions',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatVoucherType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const closingBalance = transactions.length > 0 
    ? transactions[transactions.length - 1].balance 
    : openingBalance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {ledgerName} - Transaction Details
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {fromDate && toDate && (
              <span>Period: {format(new Date(fromDate), 'dd MMM yyyy')} to {format(new Date(toDate), 'dd MMM yyyy')}</span>
            )}
            {asOfDate && (
              <span>As of: {format(new Date(asOfDate), 'dd MMM yyyy')}</span>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <span className="text-sm text-muted-foreground">Opening Balance:</span>
                <p className="text-lg font-semibold">₹{openingBalance.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Closing Balance:</span>
                <p className="text-lg font-semibold">₹{closingBalance.toFixed(2)}</p>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found for this period
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Voucher No.</TableHead>
                    <TableHead>Voucher Type</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="font-semibold bg-muted">
                    <TableCell colSpan={4}>Opening Balance</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">₹{openingBalance.toFixed(2)}</TableCell>
                  </TableRow>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>{format(new Date(txn.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{txn.voucherNumber}</TableCell>
                      <TableCell>{formatVoucherType(txn.voucherType)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {txn.narration || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {txn.debit > 0 ? `₹${txn.debit.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {txn.credit > 0 ? `₹${txn.credit.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{txn.balance.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell colSpan={4}>Closing Balance</TableCell>
                    <TableCell className="text-right">
                      ₹{transactions.reduce((sum, t) => sum + t.debit, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{transactions.reduce((sum, t) => sum + t.credit, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">₹{closingBalance.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
