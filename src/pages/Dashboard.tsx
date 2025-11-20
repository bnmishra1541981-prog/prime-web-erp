import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, ShoppingCart, Package, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SalesPurchaseChart } from '@/components/dashboard/SalesPurchaseChart';
import { CustomerAnalytics } from '@/components/dashboard/CustomerAnalytics';
import { InventoryAnalytics } from '@/components/dashboard/InventoryAnalytics';
import { RecentOrders } from '@/components/dashboard/RecentOrders';
import { formatCurrency } from '@/lib/currency';

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>('');
  const [companyCurrency, setCompanyCurrency] = useState<string>('INR');
  const [stats, setStats] = useState([
    {
      title: 'Total Sales',
      value: '₹0.00',
      change: '+0%',
      icon: TrendingUp,
      color: 'text-success',
    },
    {
      title: 'Total Purchase',
      value: '₹0.00',
      change: '+0%',
      icon: ShoppingCart,
      color: 'text-primary',
    },
    {
      title: 'Receivables',
      value: '₹0.00',
      icon: DollarSign,
      color: 'text-warning',
    },
    {
      title: 'Payables',
      value: '₹0.00',
      icon: DollarSign,
      color: 'text-destructive',
    },
  ]);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Add a refetch mechanism on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchDashboardStats();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Get user's company
      const { data: companies } = await supabase
        .from('companies')
        .select('id, currency')
        .limit(1);

      if (!companies || companies.length === 0) {
        setLoading(false);
        return;
      }

      const selectedCompanyId = companies[0].id;
      const currency = companies[0].currency || 'INR';
      setCompanyId(selectedCompanyId);
      setCompanyCurrency(currency);

      // Fetch vouchers and ledgers
      const [{ data: vouchers }, { data: ledgers }, { data: entries }] = await Promise.all([
        supabase
          .from('vouchers')
          .select('voucher_type, total_amount')
          .eq('company_id', selectedCompanyId),
        supabase
          .from('ledgers')
          .select('ledger_type, current_balance, opening_balance')
          .eq('company_id', selectedCompanyId),
        supabase
          .from('voucher_entries')
          .select(`
            *,
            vouchers!inner(company_id),
            ledgers!inner(ledger_type)
          `)
          .eq('vouchers.company_id', selectedCompanyId)
      ]);

      // Calculate totals by voucher type
      let totalSales = 0;
      let totalPurchase = 0;
      let receivables = 0;
      let payables = 0;

      vouchers?.forEach((voucher) => {
        switch (voucher.voucher_type) {
          case 'sales':
            totalSales += Number(voucher.total_amount);
            break;
          case 'purchase':
            totalPurchase += Number(voucher.total_amount);
            break;
        }
      });

      // Calculate receivables (debtors balance)
      ledgers?.forEach((ledger) => {
        if (ledger.ledger_type === 'sundry_debtors') {
          const balance = Number(ledger.opening_balance || 0);
          const currentBalance = entries?.filter((e: any) => 
            e.ledger_id && e.ledgers.ledger_type === 'sundry_debtors'
          ).reduce((sum, e) => 
            sum + Number(e.debit_amount || 0) - Number(e.credit_amount || 0), 
            balance
          );
          receivables += currentBalance || 0;
        }
        if (ledger.ledger_type === 'sundry_creditors') {
          const balance = Number(ledger.opening_balance || 0);
          const currentBalance = entries?.filter((e: any) => 
            e.ledger_id && e.ledgers.ledger_type === 'sundry_creditors'
          ).reduce((sum, e) => 
            sum + Number(e.credit_amount || 0) - Number(e.debit_amount || 0), 
            balance
          );
          payables += currentBalance || 0;
        }
      });

      setStats([
        {
          title: 'Total Sales',
          value: formatCurrency(totalSales, currency),
          change: totalSales > 0 ? '+' : '0%',
          icon: TrendingUp,
          color: 'text-success',
        },
        {
          title: 'Total Purchase',
          value: formatCurrency(totalPurchase, currency),
          change: totalPurchase > 0 ? '+' : '0%',
          icon: ShoppingCart,
          color: 'text-primary',
        },
        {
          title: 'Receivables',
          value: formatCurrency(receivables, currency),
          icon: DollarSign,
          color: 'text-warning',
        },
        {
          title: 'Payables',
          value: formatCurrency(payables, currency),
          icon: DollarSign,
          color: 'text-destructive',
        },
      ]);
    } catch (error: any) {
      toast({
        title: 'Error fetching dashboard data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: 'Sales Voucher', path: '/vouchers/sales' },
    { label: 'Purchase Voucher', path: '/vouchers/purchase' },
    { label: 'Payment', path: '/vouchers/payment' },
    { label: 'Receipt', path: '/vouchers/receipt' },
  ];

  return (
    <div className="p-6 space-y-6" key={companyId}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome to your ERP dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchDashboardStats()}
          >
            Refresh Data
          </Button>
          <div className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-IN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.change && (
                <p className={`text-xs ${stat.color} mt-1`}>
                  {stat.change} from last month
                </p>
              )}
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Button
                key={action.path}
                variant="outline"
                className="h-auto py-4"
                onClick={() => navigate(action.path)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Getting Started
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Set up your company</p>
              <p className="text-xs text-muted-foreground mt-1">
                Configure your company details and ledgers to get started
              </p>
              <Button
                variant="link"
                className="h-auto p-0 mt-2"
                onClick={() => navigate('/companies')}
              >
                Go to Companies →
              </Button>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Create ledgers</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add parties, bank accounts, and expense heads
              </p>
              <Button
                variant="link"
                className="h-auto p-0 mt-2"
                onClick={() => navigate('/ledgers')}
              >
                Go to Ledgers →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales & Purchase Chart */}
      {companyId && <SalesPurchaseChart companyId={companyId} />}

      {/* Customer Analytics */}
      {companyId && <CustomerAnalytics companyId={companyId} currency={companyCurrency} />}

      {/* Inventory Analytics */}
      {companyId && <InventoryAnalytics companyId={companyId} />}

      {/* Recent Orders */}
      {companyId && <RecentOrders companyId={companyId} currency={companyCurrency} />}
    </div>
  );
};

const FileText = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

export default Dashboard;
