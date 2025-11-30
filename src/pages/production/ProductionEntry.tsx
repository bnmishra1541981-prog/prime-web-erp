import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ClipboardList, Calendar, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  product: string;
  ordered_quantity: number;
  status: string;
}

interface Machine {
  id: string;
  name: string;
  machine_code: string;
}

interface ProductionEntry {
  id: string;
  produced_quantity: number;
  entry_date: string;
  shift: string | null;
  size: string | null;
  wastage: number;
  remarks: string | null;
  created_at: string;
  sales_orders: {
    order_no: string;
    customer_name: string;
    product: string;
  } | null;
  machines: {
    name: string;
  } | null;
}

const ProductionEntry = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [todayEntries, setTodayEntries] = useState<ProductionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    order_id: '',
    produced_quantity: '',
    entry_date: format(new Date(), 'yyyy-MM-dd'),
    machine_id: '',
    shift: '',
    size: '',
    wastage: '0',
    remarks: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Check user role
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      let ordersData = [];

      // If owner or supervisor, show all orders
      if (userRole?.role === 'owner' || userRole?.role === 'supervisor') {
        const { data, error } = await supabase
          .from('sales_orders')
          .select('*')
          .in('status', ['pending', 'in_production', 'partially_dispatched'])
          .order('due_date', { ascending: true });

        if (error) throw error;
        ordersData = data || [];
      } else {
        // For production users, show only assigned orders
        const { data: assignedOrders, error: assignError } = await supabase
          .from('order_assignments')
          .select('order_id')
          .eq('assigned_to', user?.id);

        if (assignError) throw assignError;

        const orderIds = assignedOrders?.map(a => a.order_id) || [];

        if (orderIds.length > 0) {
          const { data, error } = await supabase
            .from('sales_orders')
            .select('*')
            .in('id', orderIds)
            .in('status', ['pending', 'in_production', 'partially_dispatched'])
            .order('due_date', { ascending: true });

          if (error) throw error;
          ordersData = data || [];
        }
      }

      setOrders(ordersData);

      // Fetch machines
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (machinesError) throw machinesError;
      setMachines(machinesData || []);

      // Fetch today's entries
      await fetchTodayEntries();
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayEntries = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('production_entries')
        .select(`
          *,
          sales_orders(order_no, customer_name, product),
          machines(name)
        `)
        .eq('entry_date', today)
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodayEntries(data || []);
    } catch (error: any) {
      console.error('Error fetching today entries:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.order_id || !formData.produced_quantity) {
      toast({
        title: 'Error',
        description: 'Please fill in required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('production_entries')
        .insert({
          order_id: formData.order_id,
          produced_quantity: parseFloat(formData.produced_quantity),
          entry_date: formData.entry_date,
          machine_id: formData.machine_id || null,
          shift: formData.shift || null,
          size: formData.size || null,
          wastage: parseFloat(formData.wastage) || 0,
          remarks: formData.remarks || null,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Production entry added successfully',
      });

      // Reset form
      setFormData({
        order_id: '',
        produced_quantity: '',
        entry_date: format(new Date(), 'yyyy-MM-dd'),
        machine_id: '',
        shift: '',
        size: '',
        wastage: '0',
        remarks: ''
      });

      // Refresh today's entries
      fetchTodayEntries();
      
    } catch (error: any) {
      console.error('Error adding entry:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalProducedToday = todayEntries.reduce((sum, entry) => sum + Number(entry.produced_quantity), 0);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Daily Production Entry</h1>
          <p className="text-muted-foreground">Add your daily production data</p>
        </div>

        {/* Stats Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today's Date</p>
                  <p className="text-xl font-bold">{format(new Date(), 'dd MMM yyyy')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today's Production</p>
                  <p className="text-xl font-bold text-green-600">{totalProducedToday} units</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today's Entries</p>
                  <p className="text-xl font-bold text-blue-600">{todayEntries.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Entry Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Add Production Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="order_id">Order *</Label>
                  <Select
                    value={formData.order_id}
                    onValueChange={(value) => setFormData({ ...formData, order_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select order" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No orders available</div>
                      ) : (
                        orders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.order_no} - {order.customer_name} ({order.product})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="produced_quantity">Quantity *</Label>
                    <Input
                      id="produced_quantity"
                      type="number"
                      step="0.01"
                      value={formData.produced_quantity}
                      onChange={(e) => setFormData({ ...formData, produced_quantity: e.target.value })}
                      placeholder="Enter quantity"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entry_date">Date *</Label>
                    <Input
                      id="entry_date"
                      type="date"
                      value={formData.entry_date}
                      onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="machine_id">Machine</Label>
                    <Select
                      value={formData.machine_id}
                      onValueChange={(value) => setFormData({ ...formData, machine_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select machine" />
                      </SelectTrigger>
                      <SelectContent>
                        {machines.map((machine) => (
                          <SelectItem key={machine.id} value={machine.id}>
                            {machine.name} ({machine.machine_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shift">Shift</Label>
                    <Select
                      value={formData.shift}
                      onValueChange={(value) => setFormData({ ...formData, shift: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select shift" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Morning">Morning</SelectItem>
                        <SelectItem value="Evening">Evening</SelectItem>
                        <SelectItem value="Night">Night</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="size">Size/Dimension</Label>
                    <Input
                      id="size"
                      type="text"
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      placeholder="e.g., 10x20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wastage">Wastage</Label>
                    <Input
                      id="wastage"
                      type="number"
                      step="0.01"
                      value={formData.wastage}
                      onChange={(e) => setFormData({ ...formData, wastage: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Add any notes..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Entry'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Today's Entries */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {todayEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No entries added today</p>
                  <p className="text-sm mt-1">Start adding your production data</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {todayEntries.map((entry) => (
                    <div key={entry.id} className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-lg">{entry.produced_quantity} units</p>
                          <p className="text-sm text-muted-foreground">
                            {entry.sales_orders?.order_no} - {entry.sales_orders?.customer_name}
                          </p>
                        </div>
                        {entry.wastage > 0 && (
                          <Badge variant="destructive">
                            Wastage: {entry.wastage}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {entry.shift && (
                          <Badge variant="outline">{entry.shift} Shift</Badge>
                        )}
                        {entry.size && (
                          <Badge variant="outline">Size: {entry.size}</Badge>
                        )}
                        {entry.machines && (
                          <Badge variant="outline">{entry.machines.name}</Badge>
                        )}
                      </div>
                      
                      {entry.remarks && (
                        <p className="text-sm bg-muted p-2 rounded">{entry.remarks}</p>
                      )}
                      
                      <p className="text-xs text-muted-foreground pt-2 border-t">
                        {format(new Date(entry.created_at), 'hh:mm a')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductionEntry;
