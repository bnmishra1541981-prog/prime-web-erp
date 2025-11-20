import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface CustomerStats {
  totalCustomers: number;
  newCustomers: number;
  avgPaymentDays: number;
  topCustomers: Array<{ name: string; amount: number }>;
  onTimeCustomers: number;
  delayed15_30: number;
  delayed31_59: number;
  delayed60Plus: number;
}

export function CustomerAnalytics({ companyId, currency = 'INR' }: { companyId: string; currency?: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    newCustomers: 0,
    avgPaymentDays: 0,
    topCustomers: [],
    onTimeCustomers: 0,
    delayed15_30: 0,
    delayed31_59: 0,
    delayed60Plus: 0,
  });

  useEffect(() => {
    fetchCustomerStats();
  }, [companyId]);

  const fetchCustomerStats = async () => {
    try {
      setLoading(true);
      
      // Fetch sundry debtors
      const { data: customers } = await supabase
        .from('ledgers')
        .select('id, name, created_at, current_balance')
        .eq('company_id', companyId)
        .eq('ledger_type', 'sundry_debtors');

      if (!customers) return;

      // Fetch vouchers for payment analysis
      const { data: vouchers } = await supabase
        .from('vouchers')
        .select('id, party_ledger_id, voucher_date, due_date, total_amount, voucher_type')
        .eq('company_id', companyId)
        .in('voucher_type', ['sales', 'receipt']);

      // Calculate stats
      const totalCustomers = customers.length;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newCustomers = customers.filter(c => new Date(c.created_at) > thirtyDaysAgo).length;

      // Top customers by balance
      const topCustomers = customers
        .sort((a, b) => Number(b.current_balance) - Number(a.current_balance))
        .slice(0, 5)
        .map(c => ({ name: c.name, amount: Number(c.current_balance) }));

      // Payment delay analysis
      let totalDays = 0;
      let delayCount = 0;
      let onTime = 0;
      let delayed15_30 = 0;
      let delayed31_59 = 0;
      let delayed60Plus = 0;

      vouchers?.forEach(v => {
        if (v.due_date && v.voucher_type === 'sales') {
          const dueDate = new Date(v.due_date);
          const today = new Date();
          const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays > 0) {
            totalDays += diffDays;
            delayCount++;
            
            if (diffDays <= 14) onTime++;
            else if (diffDays <= 30) delayed15_30++;
            else if (diffDays <= 59) delayed31_59++;
            else delayed60Plus++;
          } else {
            onTime++;
          }
        }
      });

      setStats({
        totalCustomers,
        newCustomers,
        avgPaymentDays: delayCount > 0 ? Math.round(totalDays / delayCount) : 0,
        topCustomers,
        onTimeCustomers: onTime,
        delayed15_30,
        delayed31_59,
        delayed60Plus,
      });
    } catch (error) {
      console.error('Error fetching customer stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="flex flex-row items-center justify-between hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Analytics
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
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">New Customers (30d)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">{stats.newCustomers}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Payment Days</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.avgPaymentDays} days</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">On-Time Payments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">{stats.onTimeCustomers}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">15-30 Days Delayed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-warning">{stats.delayed15_30}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">31-59 Days Delayed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-warning">{stats.delayed31_59}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">60+ Days Delayed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">{stats.delayed60Plus}</div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2 lg:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Top Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.topCustomers.slice(0, 3).map((customer, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="truncate">{customer.name}</span>
                          <span className="font-medium">{formatCurrency(customer.amount, currency)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
