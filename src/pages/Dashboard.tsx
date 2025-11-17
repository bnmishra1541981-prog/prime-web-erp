import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, ShoppingCart, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  const stats = [
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
  ];

  const quickActions = [
    { label: 'Sales Voucher', path: '/vouchers/sales' },
    { label: 'Purchase Voucher', path: '/vouchers/purchase' },
    { label: 'Payment', path: '/vouchers/payment' },
    { label: 'Receipt', path: '/vouchers/receipt' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome to your ERP dashboard</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats Grid */}
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

      {/* Recent Activity - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Vouchers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No vouchers yet. Create your first voucher to get started!</p>
          </div>
        </CardContent>
      </Card>
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
