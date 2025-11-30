import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';

interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  product: string;
  status: string;
  due_date: string;
  isAssigned: boolean;
}

interface UserInfo {
  full_name: string;
  role: string;
  department: string | null;
}

const OrderAssignment = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && userId) {
      fetchUserInfo();
      fetchOrders();
    }
  }, [user, userId]);

  const fetchUserInfo = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('full_name, role, department')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUserInfo(data);
    } catch (error: any) {
      console.error('Error fetching user info:', error);
      toast.error('Failed to load user information');
      navigate('/production/users');
    }
  };

  const fetchOrders = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Fetch all orders
      const { data: allOrders, error: ordersError } = await supabase
        .from('sales_orders')
        .select('id, order_no, customer_name, product, status, due_date')
        .order('due_date', { ascending: true });

      if (ordersError) throw ordersError;

      // Fetch assignments for this user
      const { data: assignments, error: assignError } = await supabase
        .from('order_assignments')
        .select('order_id')
        .eq('assigned_to', userId);

      if (assignError) throw assignError;

      const assignedIds = new Set(assignments?.map(a => a.order_id) || []);

      // Combine data
      const ordersWithAssignment = allOrders?.map(order => ({
        ...order,
        isAssigned: assignedIds.has(order.id)
      })) || [];

      setOrders(ordersWithAssignment);
      setSelectedOrders(assignedIds);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOrder = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);

    try {
      // Get current assignments
      const currentAssignments = new Set(
        orders.filter(o => o.isAssigned).map(o => o.id)
      );

      // Find orders to assign (in selected but not in current)
      const toAssign = Array.from(selectedOrders).filter(
        id => !currentAssignments.has(id)
      );

      // Find orders to unassign (in current but not in selected)
      const toUnassign = Array.from(currentAssignments).filter(
        id => !selectedOrders.has(id)
      );

      // Insert new assignments
      if (toAssign.length > 0) {
        const { error: insertError } = await supabase
          .from('order_assignments')
          .insert(
            toAssign.map(orderId => ({
              order_id: orderId,
              assigned_to: userId
            }))
          );

        if (insertError) throw insertError;
      }

      // Delete removed assignments
      if (toUnassign.length > 0) {
        const { error: deleteError } = await supabase
          .from('order_assignments')
          .delete()
          .eq('assigned_to', userId)
          .in('order_id', toUnassign);

        if (deleteError) throw deleteError;
      }

      toast.success('Order assignments updated successfully');
      navigate('/production/users');
    } catch (error: any) {
      console.error('Error saving assignments:', error);
      toast.error('Failed to update assignments');
    } finally {
      setSaving(false);
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
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/production/users')}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
          
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">
                Assign Orders to {userInfo.full_name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {userInfo.role.charAt(0).toUpperCase() + userInfo.role.slice(1)}
                {userInfo.department && ` • ${userInfo.department}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Assignments'}
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
            </span>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium text-foreground mb-2">No orders available</p>
              <p className="text-sm text-muted-foreground text-center">
                Create sales orders first to assign them to team members
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Card 
                key={order.id}
                className={`cursor-pointer transition-colors ${
                  selectedOrders.has(order.id) ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => handleToggleOrder(order.id)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedOrders.has(order.id)}
                      onCheckedChange={() => handleToggleOrder(order.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-semibold truncate">{order.order_no}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {order.customer_name}
                          </p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.split('_').map(w => 
                            w.charAt(0).toUpperCase() + w.slice(1)
                          ).join(' ')}
                        </Badge>
                      </div>
                      
                      <p className="text-sm mb-1">{order.product}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(order.due_date).toLocaleDateString()}
                      </p>
                    </div>
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

export default OrderAssignment;
