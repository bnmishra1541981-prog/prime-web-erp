import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Package, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  product: string;
  ordered_quantity: number;
  due_date: string;
  priority: number;
  status: 'pending' | 'in_production' | 'partially_dispatched' | 'completed';
  notes: string | null;
  total_production: number;
  total_dispatch: number;
  balance_quantity: number;
}

const ProductionOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchAssignedOrders();
    }
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user role:', error);
      return;
    }

    setUserRole(data?.role || null);
  };

  const fetchAssignedOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch orders assigned to the user
      const { data: assignedOrders, error: ordersError } = await supabase
        .from('order_assignments')
        .select(`
          order_id,
          sales_orders (
            id,
            order_no,
            customer_name,
            product,
            ordered_quantity,
            due_date,
            priority,
            status,
            notes
          )
        `)
        .eq('assigned_to', user.id);

      if (ordersError) throw ordersError;

      // Fetch production totals for each order
      const orderIds = assignedOrders?.map(a => a.sales_orders?.id).filter(Boolean) || [];
      
      const { data: productionData, error: prodError } = await supabase
        .from('production_entries')
        .select('order_id, produced_quantity')
        .in('order_id', orderIds);

      if (prodError) throw prodError;

      const { data: dispatchData, error: dispatchError } = await supabase
        .from('dispatch_entries')
        .select('order_id, dispatched_quantity')
        .in('order_id', orderIds);

      if (dispatchError) throw dispatchError;

      // Calculate totals
      const ordersWithTotals = assignedOrders
        ?.map(assignment => {
          const order = assignment.sales_orders;
          if (!order) return null;

          const totalProduction = productionData
            ?.filter(p => p.order_id === order.id)
            .reduce((sum, p) => sum + Number(p.produced_quantity), 0) || 0;

          const totalDispatch = dispatchData
            ?.filter(d => d.order_id === order.id)
            .reduce((sum, d) => sum + Number(d.dispatched_quantity), 0) || 0;

          const balanceQuantity = Number(order.ordered_quantity) - totalProduction - totalDispatch;

          return {
            ...order,
            total_production: totalProduction,
            total_dispatch: totalDispatch,
            balance_quantity: balanceQuantity
          };
        })
        .filter(Boolean) as Order[];

      setOrders(ordersWithTotals);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_production':
        return 'bg-blue-500';
      case 'partially_dispatched':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 3) return 'destructive';
    if (priority >= 2) return 'default';
    return 'secondary';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">My Production Orders</h1>
          <p className="text-sm text-muted-foreground">
            {orders.length} order{orders.length !== 1 ? 's' : ''} assigned to you
          </p>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No orders assigned</p>
              <p className="text-sm text-muted-foreground text-center">
                You don't have any production orders assigned yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card 
                key={order.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/production/orders/${order.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-1 truncate">{order.order_no}</CardTitle>
                      <p className="text-sm text-muted-foreground truncate">{order.customer_name}</p>
                    </div>
                    <Badge 
                      variant={getPriorityColor(order.priority)}
                      className="shrink-0"
                    >
                      P{order.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Product */}
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{order.product}</span>
                  </div>

                  {/* Due Date */}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">
                      Due: {format(new Date(order.due_date), 'dd MMM yyyy')}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Ordered</span>
                      <span className="font-semibold">{order.ordered_quantity}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Produced</span>
                      <span className="font-medium text-blue-600">{order.total_production}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Dispatched</span>
                      <span className="font-medium text-green-600">{order.total_dispatch}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-semibold pt-2 border-t">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        Balance
                      </span>
                      <span className={order.balance_quantity > 0 ? 'text-orange-600' : 'text-green-600'}>
                        {order.balance_quantity}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between pt-2">
                    <Badge className={getStatusColor(order.status)}>
                      {getStatusText(order.status)}
                    </Badge>
                    {order.balance_quantity > order.ordered_quantity * 0.5 && (
                      <div className="flex items-center gap-1 text-xs text-orange-600">
                        <AlertCircle className="h-3 w-3" />
                        <span>High balance</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionOrders;
