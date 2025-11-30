import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Package, Users, Calendar, History } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  product: string;
  ordered_quantity: number;
  status: string;
  due_date: string;
  size?: string | null;
  ready_materials?: number | null;
  created_at: string;
}

interface TeamMember {
  user_id: string;
  full_name: string;
  role: string;
}

interface ProductionEntry {
  id: string;
  produced_quantity: number;
  entry_date: string;
  created_at: string;
  previous_quantity: number | null;
  edited_reason: string | null;
  user_roles: {
    full_name: string;
  } | null;
}

const MyOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [productionHistory, setProductionHistory] = useState<ProductionEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyOrders();
    }
  }, [user]);

  const fetchMyOrders = async () => {
    try {
      setLoading(true);

      // Get orders assigned to current user
      const { data: assignments, error: assignError } = await supabase
        .from('order_assignments')
        .select('order_id')
        .eq('assigned_to', user?.id);

      if (assignError) throw assignError;

      const orderIds = assignments?.map(a => a.order_id) || [];

      if (orderIds.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('sales_orders')
        .select('*')
        .in('id', orderIds)
        .order('due_date', { ascending: true });

      if (ordersError) throw ordersError;

      setOrders(ordersData || []);

      // Fetch team members for each order
      const teamMembersMap: Record<string, TeamMember[]> = {};
      
      for (const orderId of orderIds) {
        const { data: assignments } = await supabase
          .from('order_assignments')
          .select('assigned_to')
          .eq('order_id', orderId);

        if (assignments) {
          const userIds = assignments.map(a => a.assigned_to);
          
          const { data: users } = await supabase
            .from('user_roles')
            .select('user_id, full_name, role')
            .in('user_id', userIds);

          if (users) {
            teamMembersMap[orderId] = users as TeamMember[];
          }
        }
      }

      setTeamMembers(teamMembersMap);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductionHistory = async (orderId: string) => {
    try {
      setHistoryLoading(true);
      
      const { data, error } = await supabase
        .from('production_entries')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user details for each entry
      const entriesWithUsers = await Promise.all(
        (data || []).map(async (entry) => {
          const { data: userData } = await supabase
            .from('user_roles')
            .select('full_name')
            .eq('user_id', entry.created_by)
            .single();

          return {
            ...entry,
            user_roles: userData || { full_name: 'Unknown' }
          };
        })
      );

      setProductionHistory(entriesWithUsers);
    } catch (error: any) {
      console.error('Error fetching production history:', error);
      toast.error('Failed to load production history');
    } finally {
      setHistoryLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">My Orders</h1>
          <p className="text-sm text-muted-foreground">
            Orders assigned to you • {orders.length} total
          </p>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Orders Assigned</h3>
                <p className="text-sm text-muted-foreground">
                  You don't have any orders assigned yet. Contact your supervisor.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{order.order_no}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.customer_name}
                      </p>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{order.product}</p>
                    {order.size && (
                      <p className="text-xs text-muted-foreground mt-1">Size: {order.size}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Ordered Qty</p>
                      <p className="font-medium">{order.ordered_quantity}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Produced</p>
                      <p className="font-medium text-blue-600">
                        {order.ready_materials || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Balance</p>
                      <p className="font-medium text-orange-600">
                        {order.ordered_quantity - (order.ready_materials || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Due Date</p>
                      <p className="font-medium">
                        {format(new Date(order.due_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Team Members</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {teamMembers[order.id]?.map((member, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {member.full_name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Audit Trail Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          fetchProductionHistory(order.id);
                        }}
                      >
                        <History className="h-4 w-4 mr-2" />
                        View Production History
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Production History - {order.order_no}</DialogTitle>
                      </DialogHeader>
                      {historyLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {productionHistory.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                              No production entries yet
                            </p>
                          ) : (
                            productionHistory.map((entry) => (
                              <Card key={entry.id}>
                                <CardContent className="pt-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <p className="font-medium">
                                        {entry.user_roles?.full_name || 'Unknown'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}
                                      </p>
                                    </div>
                                    <Badge variant="outline">
                                      Qty: {entry.produced_quantity}
                                    </Badge>
                                  </div>

                                  {entry.previous_quantity !== null && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded p-2 mb-2">
                                      <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                                        Edited Entry
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Previous: {entry.previous_quantity} → New: {entry.produced_quantity}
                                      </p>
                                      {entry.edited_reason && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Reason: {entry.edited_reason}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  <div className="text-sm text-muted-foreground">
                                    Entry Date: {format(new Date(entry.entry_date), 'MMM dd, yyyy')}
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
