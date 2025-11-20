import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VoucherListProps {
  vouchers: any[];
  loading: boolean;
  onRefresh: () => void;
}

export const VoucherList = ({ vouchers, loading }: VoucherListProps) => {
  const navigate = useNavigate();

  const canShowInvoice = (voucherType: string) => {
    return voucherType === 'sales' || voucherType === 'purchase';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Vouchers</CardTitle>
        <CardDescription>List of all voucher entries</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No vouchers found. Create your first voucher to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Narration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.map((voucher) => (
                <TableRow key={voucher.id}>
                  <TableCell className="font-medium">{voucher.voucher_number}</TableCell>
                  <TableCell>{new Date(voucher.voucher_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">₹{voucher.total_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">{voucher.narration || '-'}</TableCell>
                  <TableCell className="text-right">
                    {canShowInvoice(voucher.voucher_type) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/invoice/${voucher.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Invoice
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
