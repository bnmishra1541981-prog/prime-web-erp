import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { InvoiceTemplate } from '@/components/invoices/InvoiceTemplate';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [voucher, setVoucher] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchVoucherDetails();
    }
  }, [id]);

  const fetchVoucherDetails = async () => {
    try {
      const { data: voucherData, error: voucherError } = await supabase
        .from('vouchers')
        .select(`
          *,
          company:companies(*),
          party:ledgers!party_ledger_id(*),
          voucher_entries(
            *,
            ledger:ledgers(*),
            stock_item:stock_items(*)
          )
        `)
        .eq('id', id)
        .single();

      if (voucherError) throw voucherError;
      setVoucher(voucherData);
    } catch (error: any) {
      toast.error('Failed to load invoice details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="p-6">
        <p className="text-center">Invoice not found</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const items = voucher.voucher_entries
    .filter((entry: any) => entry.stock_item_id)
    .map((entry: any) => ({
      description: entry.stock_item?.name || entry.ledger?.name || 'Item',
      hsn_sac: entry.stock_item?.hsn_code,
      quantity: entry.quantity || 1,
      unit: entry.stock_item?.unit,
      rate: entry.rate || 0,
      amount: entry.taxable_amount || entry.amount || 0,
      cgst_rate: entry.cgst_rate,
      sgst_rate: entry.sgst_rate,
      igst_rate: entry.igst_rate,
      cgst_amount: entry.cgst_amount,
      sgst_amount: entry.sgst_amount,
      igst_amount: entry.igst_amount,
    }));

  return (
    <div className="container mx-auto p-6">
      <Button onClick={() => navigate(-1)} variant="ghost" className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <InvoiceTemplate
        type={voucher.voucher_type}
        voucherNumber={voucher.voucher_number}
        voucherDate={voucher.voucher_date}
        dueDate={voucher.due_date}
        referenceNumber={voucher.reference_number}
        referenceDate={voucher.reference_date}
        company={{
          name: voucher.company.name,
          address: voucher.company.address,
          phone: voucher.company.phone,
          email: voucher.company.email,
          gstin: voucher.company.gstin,
          pan: voucher.company.pan,
          state: voucher.company.state,
          bank_name: voucher.company.bank_name,
          bank_account_number: voucher.company.bank_account_number,
          bank_ifsc: voucher.company.bank_ifsc,
        }}
        party={{
          name: voucher.party?.name || 'N/A',
          address: voucher.party?.address,
          phone: voucher.party?.phone,
          gstin: voucher.party?.gstin,
          state: voucher.party?.state,
        }}
        items={items}
        narration={voucher.narration}
        totalAmount={voucher.total_amount}
        placeOfSupply={voucher.place_of_supply}
        shippingAddress={voucher.shipping_address}
      />
    </div>
  );
}
