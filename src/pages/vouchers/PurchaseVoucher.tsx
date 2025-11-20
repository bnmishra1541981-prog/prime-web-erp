import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VoucherForm } from '@/components/vouchers/VoucherForm';
import { VoucherList } from '@/components/vouchers/VoucherList';
import { toast } from 'sonner';

const PurchaseVoucher = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
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
        .eq('voucher_type', 'purchase')
        .order('voucher_date', { ascending: false });

      if (error) throw error;
      setVouchers(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch purchase vouchers');
    } finally {
      setLoading(false);
    }
  };

  const handleVoucherCreated = () => {
    fetchVouchers();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Purchase Voucher</h1>
        <p className="text-sm text-muted-foreground">Record purchase transactions</p>
      </div>
      
      <VoucherForm 
        voucherType="purchase" 
        onSuccess={handleVoucherCreated}
      />

      <VoucherList 
        vouchers={vouchers}
        loading={loading}
        onRefresh={fetchVouchers}
      />
    </div>
  );
};

export default PurchaseVoucher;
