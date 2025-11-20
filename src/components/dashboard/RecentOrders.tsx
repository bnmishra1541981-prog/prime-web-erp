import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Order {
  id: string;
  voucher_number: string;
  voucher_date: string;
  voucher_type: string;
  total_amount: number;
  party_name: string;
}

export function RecentOrders({ companyId }: { companyId: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentOrders();
  }, [companyId]);

  const fetchRecentOrders = async () => {
    try {
      setLoading(true);
      
      const { data: vouchers } = await supabase
        .from('vouchers')
        .select(`
          id,
          voucher_number,
          voucher_date,
          voucher_type,
          total_amount,
          party_ledger_id,
          ledgers!vouchers_party_ledger_id_fkey(name)
        `)
        .eq('company_id', companyId)
        .in('voucher_type', ['sales', 'purchase'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (vouchers) {
        const formattedOrders = vouchers.map((v: any) => ({
          id: v.id,
          voucher_number: v.voucher_number,
          voucher_date: v.voucher_date,
          voucher_type: v.voucher_type,
          total_amount: v.total_amount,
          party_name: v.ledgers?.name || 'N/A',
        }));
        setOrders(formattedOrders);
      }
    } catch (error) {
      console.error('Error fetching recent orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = (order: Order) => {
    navigate(`/vouchers/${order.voucher_type}/${order.id}`);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="flex flex-row items-center justify-between hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Recent Orders
            </CardTitle>
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No recent orders found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <Card
                    key={order.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleOrderClick(order)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="font-medium">{order.voucher_number}</div>
                          <div className="text-sm text-muted-foreground">{order.party_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(order.voucher_date).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            ₹{Number(order.total_amount).toLocaleString('en-IN')}
                          </div>
                          <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                            order.voucher_type === 'sales' 
                              ? 'bg-success/10 text-success' 
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {order.voucher_type}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
