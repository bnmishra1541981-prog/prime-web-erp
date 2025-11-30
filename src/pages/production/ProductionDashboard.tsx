import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Package, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Users, 
  Wrench,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface DashboardStats {
  totalOrders: number;
  completedOrders: number;
  pendingProduction: number;
  totalProduction: number;
  totalDispatch: number;
  balanceQuantity: number;
  activeTeamMembers: number;
  activeMachines: number;
}

interface OrderStatus {
  status: string;
  count: number;
}

interface TeamPerformance {
  name: string;
  production: number;
  orders: number;
  dispatch: number;
}

interface DailyProduction {
  date: string;
  production: number;
  dispatch: number;
}

interface MachineUtilization {
  machine: string;
  production: number;
  dispatch: number;
  balance: number;
}

interface OrderSummary {
  order_no: string;
  customer_name: string;
  product: string;
  ordered: number;
  produced: number;
  dispatched: number;
  balance: number;
}

interface SizeSummary {
  size: string;
  length: string;
  totalProduction: number;
  totalDispatch: number;
  balance: number;
}

const COLORS = ['#F05134', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

const ProductionDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    completedOrders: 0,
    pendingProduction: 0,
    totalProduction: 0,
    totalDispatch: 0,
    balanceQuantity: 0,
    activeTeamMembers: 0,
    activeMachines: 0
  });
  const [orderStatusData, setOrderStatusData] = useState<OrderStatus[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);
  const [dailyProduction, setDailyProduction] = useState<DailyProduction[]>([]);
  const [machineUtilization, setMachineUtilization] = useState<MachineUtilization[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummary[]>([]);
  const [sizeSummary, setSizeSummary] = useState<SizeSummary[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (userRole === 'owner' || userRole === 'supervisor') {
      fetchDashboardData();
      
      // Set up real-time subscription
      const subscription = supabase
        .channel('dashboard-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_orders' }, () => {
          fetchDashboardData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'production_entries' }, () => {
          fetchDashboardData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatch_entries' }, () => {
          fetchDashboardData();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [userRole]);

  const checkUserRole = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user role:', error);
      return;
    }

    setUserRole(data?.role || null);
    
    if (data?.role !== 'owner' && data?.role !== 'supervisor') {
      toast.error('Only owners and supervisors can access the dashboard');
      navigate('/production/orders');
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all orders with related data
      const { data: orders, error: ordersError } = await supabase
        .from('sales_orders')
        .select('*');

      if (ordersError) throw ordersError;

      // Fetch production entries
      const { data: productionData, error: prodError } = await supabase
        .from('production_entries')
        .select('*');

      if (prodError) throw prodError;

      // Fetch user details for production entries
      const userIds = [...new Set(productionData?.map(p => p.created_by).filter(Boolean) || [])];
      const { data: usersData } = await supabase
        .from('user_roles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      // Map user data to production entries
      const productionWithUsers = productionData?.map(entry => ({
        ...entry,
        user_roles: usersData?.find(u => u.user_id === entry.created_by)
      })) || [];

      // Fetch dispatch entries
      const { data: dispatchData, error: dispatchError } = await supabase
        .from('dispatch_entries')
        .select('*');

      if (dispatchError) throw dispatchError;

      // Fetch team members
      const { data: teamData, error: teamError } = await supabase
        .from('user_roles')
        .select('*')
        .in('role', ['production', 'supervisor']);

      if (teamError) throw teamError;

      // Fetch machines
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .select('*')
        .eq('is_active', true);

      if (machineError) throw machineError;

      calculateStats(orders || [], productionWithUsers || [], dispatchData || [], teamData?.length || 0, machineData?.length || 0);
      calculateOrderStatus(orders || []);
      calculateTeamPerformance(productionWithUsers || [], dispatchData || [], orders || []);
      calculateDailyProduction(productionWithUsers || [], dispatchData || []);
      calculateMachineUtilization(productionWithUsers || [], dispatchData || [], machineData || []);
      calculateOrderSummary(orders || [], productionWithUsers || [], dispatchData || []);
      calculateSizeSummary(productionWithUsers || [], dispatchData || []);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (orders: any[], production: any[], dispatch: any[], teamCount: number, machineCount: number) => {
    const totalProduction = production.reduce((sum, p) => sum + Number(p.produced_quantity), 0);
    const totalDispatch = dispatch.reduce((sum, d) => sum + Number(d.dispatched_quantity), 0);
    const totalOrdered = orders.reduce((sum, o) => sum + Number(o.ordered_quantity), 0);

    setStats({
      totalOrders: orders.length,
      completedOrders: orders.filter(o => o.status === 'completed').length,
      pendingProduction: orders.filter(o => o.status === 'pending' || o.status === 'in_production').length,
      totalProduction,
      totalDispatch,
      balanceQuantity: totalOrdered - totalProduction - totalDispatch,
      activeTeamMembers: teamCount,
      activeMachines: machineCount
    });
  };

  const calculateOrderStatus = (orders: any[]) => {
    const statusCounts: Record<string, number> = {};
    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    const data = Object.entries(statusCounts).map(([status, count]) => ({
      status: status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      count
    }));

    setOrderStatusData(data);
  };

  const calculateTeamPerformance = (production: any[], dispatch: any[], orders: any[]) => {
    const teamStats: Record<string, { production: number; dispatch: number; orders: Set<string> }> = {};

    production.forEach(entry => {
      const name = entry.user_roles?.full_name || 'Unknown';
      if (!teamStats[name]) {
        teamStats[name] = { production: 0, dispatch: 0, orders: new Set() };
      }
      teamStats[name].production += Number(entry.produced_quantity);
      teamStats[name].orders.add(entry.order_id);
    });

    dispatch.forEach(entry => {
      const order = orders.find((o: any) => o.id === entry.order_id);
      if (order) {
        production.forEach(prod => {
          if (prod.order_id === entry.order_id) {
            const name = prod.user_roles?.full_name || 'Unknown';
            if (teamStats[name]) {
              teamStats[name].dispatch += Number(entry.dispatched_quantity);
            }
          }
        });
      }
    });

    const data = Object.entries(teamStats)
      .map(([name, stats]) => ({
        name,
        production: stats.production,
        dispatch: stats.dispatch,
        orders: stats.orders.size
      }))
      .sort((a, b) => b.production - a.production)
      .slice(0, 5);

    setTeamPerformance(data);
  };

  const calculateDailyProduction = (production: any[], dispatch: any[]) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return format(date, 'yyyy-MM-dd');
    });

    const data = last7Days.map(date => {
      const dayProduction = production
        .filter(p => format(new Date(p.entry_date), 'yyyy-MM-dd') === date)
        .reduce((sum, p) => sum + Number(p.produced_quantity), 0);

      const dayDispatch = dispatch
        .filter(d => format(new Date(d.dispatch_date), 'yyyy-MM-dd') === date)
        .reduce((sum, d) => sum + Number(d.dispatched_quantity), 0);

      return {
        date: format(new Date(date), 'MMM dd'),
        production: dayProduction,
        dispatch: dayDispatch
      };
    });

    setDailyProduction(data);
  };

  const calculateMachineUtilization = (production: any[], dispatch: any[], machines: any[]) => {
    const machineStats: Record<string, { production: number; dispatch: Set<string> }> = {};

    production.forEach(entry => {
      if (entry.machine_id) {
        if (!machineStats[entry.machine_id]) {
          machineStats[entry.machine_id] = { production: 0, dispatch: new Set() };
        }
        machineStats[entry.machine_id].production += Number(entry.produced_quantity);
      }
    });

    dispatch.forEach(entry => {
      production.forEach(prod => {
        if (prod.order_id === entry.order_id && prod.machine_id) {
          machineStats[prod.machine_id].dispatch.add(entry.id);
        }
      });
    });

    const data = machines.map(machine => {
      const stats = machineStats[machine.id] || { production: 0, dispatch: new Set() };
      const dispatchCount = Array.from(stats.dispatch).reduce((sum, _) => sum + 1, 0);
      return {
        machine: machine.name,
        production: stats.production,
        dispatch: dispatchCount,
        balance: stats.production - dispatchCount
      };
    }).sort((a, b) => b.production - a.production);

    setMachineUtilization(data);
  };

  const calculateOrderSummary = (orders: any[], production: any[], dispatch: any[]) => {
    const data = orders.map(order => {
      const produced = production
        .filter(p => p.order_id === order.id)
        .reduce((sum, p) => sum + Number(p.produced_quantity), 0);
      
      const dispatched = dispatch
        .filter(d => d.order_id === order.id)
        .reduce((sum, d) => sum + Number(d.dispatched_quantity), 0);

      return {
        order_no: order.order_no,
        customer_name: order.customer_name,
        product: order.product,
        ordered: Number(order.ordered_quantity),
        produced,
        dispatched,
        balance: Number(order.ordered_quantity) - produced - dispatched
      };
    }).sort((a, b) => b.balance - a.balance);

    setOrderSummary(data);
  };

  const calculateSizeSummary = (production: any[], dispatch: any[]) => {
    const sizeStats: Record<string, { production: number; dispatch: number; length: string }> = {};

    production.forEach(entry => {
      const key = entry.size || 'Unknown Size';
      if (!sizeStats[key]) {
        sizeStats[key] = { production: 0, dispatch: 0, length: entry.length_feet || 'N/A' };
      }
      sizeStats[key].production += Number(entry.produced_quantity);
    });

    dispatch.forEach(entry => {
      production.forEach(prod => {
        if (prod.order_id === entry.order_id) {
          const key = prod.size || 'Unknown Size';
          if (sizeStats[key]) {
            sizeStats[key].dispatch += Number(entry.dispatched_quantity) / production.filter(p => p.order_id === entry.order_id).length;
          }
        }
      });
    });

    const data = Object.entries(sizeStats)
      .map(([size, stats]) => ({
        size,
        length: stats.length,
        totalProduction: stats.production,
        totalDispatch: stats.dispatch,
        balance: stats.production - stats.dispatch
      }))
      .sort((a, b) => b.totalProduction - a.totalProduction);

    setSizeSummary(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'owner' && userRole !== 'supervisor') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Production Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time analytics and performance metrics</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Package className="h-8 w-8 text-blue-500" />
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                  Total
                </Badge>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats.totalOrders}</p>
              <p className="text-sm text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                  {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
                </Badge>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats.completedOrders}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-8 w-8 text-orange-500" />
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
                  Active
                </Badge>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats.pendingProduction}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-8 w-8 text-purple-500" />
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">
                  Balance
                </Badge>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats.balanceQuantity}</p>
              <p className="text-sm text-muted-foreground">Pending Qty</p>
            </CardContent>
          </Card>
        </div>

        {/* Production Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Production</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalProduction}</p>
                </div>
                <ArrowUpRight className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Dispatch</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalDispatch}</p>
                </div>
                <ArrowUpRight className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Balance Quantity</p>
                  <p className="text-2xl font-bold text-foreground">{stats.balanceQuantity}</p>
                </div>
                {stats.balanceQuantity > 0 ? (
                  <AlertCircle className="h-6 w-6 text-orange-500" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Production & Dispatch */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Production & Dispatch (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyProduction}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="production" stroke="#F05134" strokeWidth={2} name="Production" />
                  <Line type="monotone" dataKey="dispatch" stroke="#3b82f6" strokeWidth={2} name="Dispatch" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Order Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, count }) => `${status}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Top Team Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {teamPerformance.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No production data yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={teamPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="production" fill="#F05134" name="Production" />
                    <Bar dataKey="dispatch" fill="#10b981" name="Dispatch" />
                    <Bar dataKey="orders" fill="#3b82f6" name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Machine Utilization */}
          <Card>
            <CardHeader>
              <CardTitle>Machine Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              {machineUtilization.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No machine data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={machineUtilization} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="machine" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="production" fill="#F05134" name="Production" />
                    <Bar dataKey="dispatch" fill="#10b981" name="Dispatch" />
                    <Bar dataKey="balance" fill="#f59e0b" name="Balance" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resource Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.activeTeamMembers}</p>
                  <p className="text-sm text-muted-foreground">Active Team Members</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Wrench className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.activeMachines}</p>
                  <p className="text-sm text-muted-foreground">Active Machines</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>Order-wise Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Order No</th>
                    <th className="text-left py-2 px-2">Customer</th>
                    <th className="text-left py-2 px-2">Product</th>
                    <th className="text-right py-2 px-2">Ordered</th>
                    <th className="text-right py-2 px-2">Produced</th>
                    <th className="text-right py-2 px-2">Dispatched</th>
                    <th className="text-right py-2 px-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {orderSummary.map((order, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 font-medium">{order.order_no}</td>
                      <td className="py-2 px-2">{order.customer_name}</td>
                      <td className="py-2 px-2">{order.product}</td>
                      <td className="py-2 px-2 text-right">{order.ordered}</td>
                      <td className="py-2 px-2 text-right text-blue-600">{order.produced}</td>
                      <td className="py-2 px-2 text-right text-green-600">{order.dispatched}</td>
                      <td className="py-2 px-2 text-right">
                        <Badge variant={order.balance > 0 ? "destructive" : "default"}>
                          {order.balance}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Size-wise Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>Size & Length-wise Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Size</th>
                    <th className="text-left py-2 px-2">Length (ft)</th>
                    <th className="text-right py-2 px-2">Total Production</th>
                    <th className="text-right py-2 px-2">Total Dispatch</th>
                    <th className="text-right py-2 px-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeSummary.map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 font-medium">{item.size}</td>
                      <td className="py-2 px-2">{item.length}</td>
                      <td className="py-2 px-2 text-right text-blue-600">{item.totalProduction}</td>
                      <td className="py-2 px-2 text-right text-green-600">{item.totalDispatch}</td>
                      <td className="py-2 px-2 text-right">
                        <Badge variant={item.balance > 0 ? "destructive" : "default"}>
                          {item.balance}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProductionDashboard;
