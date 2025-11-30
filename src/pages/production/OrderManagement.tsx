import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Package, Calendar, AlertCircle, Users, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

const orderSchema = z.object({
  order_no: z.string().trim().min(1, 'Order number is required').max(50),
  customer_name: z.string().trim().min(1, 'Customer name is required').max(200),
  product: z.string().trim().min(1, 'Product is required').max(500),
  ordered_quantity: z.number().positive('Quantity must be positive'),
  due_date: z.string().min(1, 'Due date is required'),
  priority: z.number().min(0).max(5),
  notes: z.string().max(1000).optional(),
});

interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  product: string;
  ordered_quantity: number;
  due_date: string;
  priority: number;
  status: string;
  notes: string | null;
  created_at: string;
  assignedUsers?: { full_name: string }[];
}

interface TeamMember {
  user_id: string;
  full_name: string;
  role: string;
  department: string | null;
}

const OrderManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    order_no: '',
    customer_name: '',
    product: '',
    ordered_quantity: '',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    priority: '1',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      checkUserRole();
      fetchOrders();
      fetchTeamMembers();
    }
  }, [user]);

  const checkUserRole = async () => {
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
    
    if (data?.role !== 'owner' && data?.role !== 'supervisor') {
      toast.error('Only owners and supervisors can manage orders');
      navigate('/production/orders');
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          order_assignments!order_assignments_order_id_fkey (
            user_roles!order_assignments_assigned_to_fkey (
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ordersWithAssignments = data?.map(order => ({
        ...order,
        assignedUsers: order.order_assignments?.map((a: any) => a.user_roles) || []
      })) || [];

      setOrders(ordersWithAssignments);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, full_name, role, department')
        .in('role', ['production', 'supervisor'])
        .order('full_name');

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching team members:', error);
    }
  };

  const validateForm = () => {
    try {
      orderSchema.parse({
        order_no: formData.order_no,
        customer_name: formData.customer_name,
        product: formData.product,
        ordered_quantity: Number(formData.ordered_quantity),
        due_date: formData.due_date,
        priority: Number(formData.priority),
        notes: formData.notes || undefined,
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    if (selectedMembers.size === 0) {
      toast.error('Please assign at least one team member');
      return;
    }

    setSubmitting(true);

    try {
      // Create order
      const { data: newOrder, error: orderError } = await supabase
        .from('sales_orders')
        .insert({
          order_no: formData.order_no.trim(),
          customer_name: formData.customer_name.trim(),
          product: formData.product.trim(),
          ordered_quantity: Number(formData.ordered_quantity),
          due_date: formData.due_date,
          priority: Number(formData.priority),
          notes: formData.notes.trim() || null,
          created_by: user.id,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Assign team members
      const assignments = Array.from(selectedMembers).map(memberId => ({
        order_id: newOrder.id,
        assigned_to: memberId
      }));

      const { error: assignError } = await supabase
        .from('order_assignments')
        .insert(assignments);

      if (assignError) throw assignError;

      toast.success('Order created successfully');
      
      // Reset form
      setFormData({
        order_no: '',
        customer_name: '',
        product: '',
        ordered_quantity: '',
        due_date: format(new Date(), 'yyyy-MM-dd'),
        priority: '1',
        notes: ''
      });
      setSelectedMembers(new Set());
      setErrors({});
      setIsDialogOpen(false);
      fetchOrders();
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (orderId: string, orderNo: string) => {
    if (!confirm(`Are you sure you want to delete order ${orderNo}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order deleted successfully');
      fetchOrders();
    } catch (error: any) {
      console.error('Error deleting order:', error);
      toast.error('Failed to delete order');
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
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

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'destructive';
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

  if (userRole !== 'owner' && userRole !== 'supervisor') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Order Management</h1>
            <p className="text-sm text-muted-foreground">
              Create and manage production orders
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Production Order</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="order_no">Order Number *</Label>
                    <Input
                      id="order_no"
                      value={formData.order_no}
                      onChange={(e) => setFormData({ ...formData, order_no: e.target.value })}
                      placeholder="e.g., ORD-2025-001"
                      className={errors.order_no ? 'border-red-500' : ''}
                    />
                    {errors.order_no && (
                      <p className="text-xs text-red-500">{errors.order_no}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Customer Name *</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      placeholder="Enter customer name"
                      className={errors.customer_name ? 'border-red-500' : ''}
                    />
                    {errors.customer_name && (
                      <p className="text-xs text-red-500">{errors.customer_name}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="product">Product *</Label>
                    <Input
                      id="product"
                      value={formData.product}
                      onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                      placeholder="Enter product details"
                      className={errors.product ? 'border-red-500' : ''}
                    />
                    {errors.product && (
                      <p className="text-xs text-red-500">{errors.product}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ordered_quantity">Quantity *</Label>
                    <Input
                      id="ordered_quantity"
                      type="number"
                      step="0.01"
                      value={formData.ordered_quantity}
                      onChange={(e) => setFormData({ ...formData, ordered_quantity: e.target.value })}
                      placeholder="Enter quantity"
                      className={errors.ordered_quantity ? 'border-red-500' : ''}
                    />
                    {errors.ordered_quantity && (
                      <p className="text-xs text-red-500">{errors.ordered_quantity}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className={errors.due_date ? 'border-red-500' : ''}
                    />
                    {errors.due_date && (
                      <p className="text-xs text-red-500">{errors.due_date}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority *</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 - Low</SelectItem>
                        <SelectItem value="1">1 - Normal</SelectItem>
                        <SelectItem value="2">2 - Medium</SelectItem>
                        <SelectItem value="3">3 - High</SelectItem>
                        <SelectItem value="4">4 - Urgent</SelectItem>
                        <SelectItem value="5">5 - Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any additional notes..."
                    rows={3}
                    maxLength={1000}
                  />
                </div>

                {/* Team Assignment */}
                <div className="space-y-2">
                  <Label>Assign Team Members *</Label>
                  <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                    {teamMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No team members available. Add users first.
                      </p>
                    ) : (
                      teamMembers.map((member) => (
                        <div key={member.user_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={member.user_id}
                            checked={selectedMembers.has(member.user_id)}
                            onCheckedChange={() => toggleMember(member.user_id)}
                          />
                          <label
                            htmlFor={member.user_id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            {member.full_name}
                            <span className="text-muted-foreground ml-2">
                              ({member.role}
                              {member.department && ` - ${member.department}`})
                            </span>
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Order'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No orders yet</p>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Create your first production order to get started
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Order
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-1 truncate">{order.order_no}</CardTitle>
                      <p className="text-sm text-muted-foreground truncate">{order.customer_name}</p>
                    </div>
                    <Badge variant={getPriorityColor(order.priority)} className="shrink-0">
                      P{order.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{order.product}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">
                      Due: {format(new Date(order.due_date), 'dd MMM yyyy')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="font-semibold">{order.ordered_quantity}</span>
                  </div>

                  {order.assignedUsers && order.assignedUsers.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Users className="h-4 w-4" />
                        <span>Assigned to:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {order.assignedUsers.map((u, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {u.full_name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.split('_').map(w => 
                        w.charAt(0).toUpperCase() + w.slice(1)
                      ).join(' ')}
                    </Badge>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(order.id, order.order_no)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {order.notes && (
                    <div className="text-xs bg-muted p-2 rounded">
                      {order.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderManagement;
