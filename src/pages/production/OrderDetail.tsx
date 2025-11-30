import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Package, Calendar, TrendingUp, History } from 'lucide-react';
import { format } from 'date-fns';

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
}

interface Machine {
  id: string;
  name: string;
  machine_code: string;
}

interface ProductionEntry {
  id: string;
  produced_quantity: number;
  machine_id: string | null;
  shift: string | null;
  wastage: number;
  remarks: string | null;
  entry_date: string;
  created_at: string;
  created_by: string;
  machines: { name: string; machine_code: string } | null;
  profiles: { display_name: string } | null;
}

const OrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [productionEntries, setProductionEntries] = useState<ProductionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    produced_quantity: '',
    machine_id: '',
    shift: '',
    wastage: '',
    remarks: '',
    entry_date: format(new Date(), 'yyyy-MM-dd')
  });

  const [totals, setTotals] = useState({
    totalProduction: 0,
    totalDispatch: 0,
    balanceQuantity: 0
  });

  useEffect(() => {
    if (orderId && user) {
      fetchOrderDetails();
      fetchMachines();
      fetchProductionEntries();
    }
  }, [orderId, user]);

  useEffect(() => {
    if (order) {
      calculateTotals();
    }
  }, [order, productionEntries]);

  const fetchOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
      navigate('/production/orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchMachines = async () => {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setMachines(data);
    }
  };

  const fetchProductionEntries = async () => {
    const { data, error } = await supabase
      .from('production_entries')
      .select(`
        *,
        machines (name, machine_code),
        profiles (display_name)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProductionEntries(data as any);
    }
  };

  const calculateTotals = async () => {
    const { data: productionData } = await supabase
      .from('production_entries')
      .select('produced_quantity')
      .eq('order_id', orderId);

    const { data: dispatchData } = await supabase
      .from('dispatch_entries')
      .select('dispatched_quantity')
      .eq('order_id', orderId);

    const totalProduction = productionData?.reduce((sum, p) => sum + Number(p.produced_quantity), 0) || 0;
    const totalDispatch = dispatchData?.reduce((sum, d) => sum + Number(d.dispatched_quantity), 0) || 0;
    const balanceQuantity = Number(order?.ordered_quantity || 0) - totalProduction - totalDispatch;

    setTotals({
      totalProduction,
      totalDispatch,
      balanceQuantity
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !orderId) return;
    
    if (!formData.produced_quantity || Number(formData.produced_quantity) <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('production_entries')
        .insert({
          order_id: orderId,
          produced_quantity: Number(formData.produced_quantity),
          machine_id: formData.machine_id || null,
          shift: formData.shift || null,
          wastage: Number(formData.wastage) || 0,
          remarks: formData.remarks || null,
          entry_date: formData.entry_date,
          created_by: user.id
        });

      if (error) throw error;

      toast.success('Production entry added successfully');
      
      // Reset form
      setFormData({
        produced_quantity: '',
        machine_id: '',
        shift: '',
        wastage: '',
        remarks: '',
        entry_date: format(new Date(), 'yyyy-MM-dd')
      });

      // Refresh data
      fetchOrderDetails();
      fetchProductionEntries();
    } catch (error: any) {
      console.error('Error adding production entry:', error);
      toast.error('Failed to add production entry');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/production/orders')}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
          
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">{order.order_no}</h1>
              <p className="text-sm text-muted-foreground">{order.customer_name}</p>
            </div>
            <Badge variant="outline" className="shrink-0">
              Priority {order.priority}
            </Badge>
          </div>
        </div>

        {/* Order Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{order.product}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Due: {format(new Date(order.due_date), 'dd MMMM yyyy')}
              </span>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Ordered Quantity</p>
                <p className="text-2xl font-bold">{order.ordered_quantity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Balance Quantity</p>
                <p className={`text-2xl font-bold ${totals.balanceQuantity > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {totals.balanceQuantity}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Produced</p>
                <p className="text-lg font-semibold text-blue-600">{totals.totalProduction}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Dispatched</p>
                <p className="text-lg font-semibold text-green-600">{totals.totalDispatch}</p>
              </div>
            </div>

            {order.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{order.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Add Production Entry */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Daily Production
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="produced_quantity">Produced Quantity *</Label>
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
                  <Label htmlFor="entry_date">Entry Date *</Label>
                  <Input
                    id="entry_date"
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                    required
                  />
                </div>

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

                <div className="space-y-2">
                  <Label htmlFor="wastage">Wastage</Label>
                  <Input
                    id="wastage"
                    type="number"
                    step="0.01"
                    value={formData.wastage}
                    onChange={(e) => setFormData({ ...formData, wastage: e.target.value })}
                    placeholder="Enter wastage"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Add any notes or remarks..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Production Entry'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Production History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Production History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productionEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No production entries yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {productionEntries.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-lg">{entry.produced_quantity} units</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(entry.entry_date), 'dd MMM yyyy')}
                          {entry.shift && ` • ${entry.shift} Shift`}
                        </p>
                      </div>
                      {entry.wastage > 0 && (
                        <Badge variant="destructive">
                          Wastage: {entry.wastage}
                        </Badge>
                      )}
                    </div>
                    
                    {entry.machines && (
                      <p className="text-sm text-muted-foreground">
                        Machine: {entry.machines.name}
                      </p>
                    )}
                    
                    {entry.remarks && (
                      <p className="text-sm bg-muted p-2 rounded">{entry.remarks}</p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <span>
                        Added by {entry.profiles?.display_name || 'Unknown'}
                      </span>
                      <span>•</span>
                      <span>
                        {format(new Date(entry.created_at), 'dd MMM yyyy, hh:mm a')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderDetail;
