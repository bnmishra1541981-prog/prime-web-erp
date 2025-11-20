import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

type Period = 'monthly' | 'quarterly' | 'yearly';

export function SalesPurchaseChart({ companyId }: { companyId: string }) {
  const [period, setPeriod] = useState<Period>('monthly');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, [period, companyId]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const { data: vouchers } = await supabase
        .from('vouchers')
        .select('voucher_type, total_amount, voucher_date')
        .eq('company_id', companyId)
        .in('voucher_type', ['sales', 'purchase']);

      if (!vouchers) return;

      const grouped = groupByPeriod(vouchers, period);
      setData(grouped);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupByPeriod = (vouchers: any[], period: Period) => {
    const result: Record<string, { sales: number; purchase: number }> = {};

    vouchers.forEach((v) => {
      const date = new Date(v.voucher_date);
      let key = '';

      if (period === 'monthly') {
        key = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      } else if (period === 'quarterly') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `Q${quarter} ${date.getFullYear()}`;
      } else {
        key = date.getFullYear().toString();
      }

      if (!result[key]) {
        result[key] = { sales: 0, purchase: 0 };
      }

      if (v.voucher_type === 'sales') {
        result[key].sales += Number(v.total_amount);
      } else {
        result[key].purchase += Number(v.total_amount);
      }
    });

    return Object.entries(result).map(([name, values]) => ({
      name,
      sales: values.sales,
      purchase: values.purchase,
    }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Sales & Purchase Trends</CardTitle>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <ChartContainer
            config={{
              sales: {
                label: 'Sales',
                color: 'hsl(var(--success))',
              },
              purchase: {
                label: 'Purchase',
                color: 'hsl(var(--primary))',
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="sales" fill="var(--color-sales)" name="Sales" />
                <Bar dataKey="purchase" fill="var(--color-purchase)" name="Purchase" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
