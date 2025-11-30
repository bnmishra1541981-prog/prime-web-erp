import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Truck, User, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  product: string;
  ordered_quantity: number;
  due_date: string;
  status: string;
  total_production: number;
  total_dispatch: number;
  balance_quantity: number;
}

interface DispatchEntry {
  id: string;
  order_id: string;
  dispatched_quantity: number;
  dispatch_date: string;
  vehicle_no: string | null;
  driver_name: string | null;
  transporter: string | null;
  loading_remarks: string | null;
  created_at: string;
  sales_orders: {
    order_no: string;
    customer_name: string;
    product: string;
  };
}

export default function DispatchManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [dispatchHistory, setDispatchHistory] = useState<DispatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    dispatched_quantity: "",
    dispatch_date: format(new Date(), "yyyy-MM-dd"),
    vehicle_no: "",
    driver_name: "",
    transporter: "",
    loading_remarks: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchOrders();
      fetchDispatchHistory();
    }
  }, [userRole]);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData && ["owner", "supervisor", "dispatch"].includes(roleData.role)) {
      setUserRole(roleData.role);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data: ordersData, error } = await supabase
        .from("sales_orders")
        .select("*")
        .neq("status", "completed")
        .order("due_date", { ascending: true });

      if (error) throw error;

      // Calculate production and dispatch totals for each order
      const ordersWithTotals = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: productionData } = await supabase
            .from("production_entries")
            .select("produced_quantity")
            .eq("order_id", order.id);

          const { data: dispatchData } = await supabase
            .from("dispatch_entries")
            .select("dispatched_quantity")
            .eq("order_id", order.id);

          const total_production = productionData?.reduce(
            (sum, entry) => sum + Number(entry.produced_quantity),
            0
          ) || 0;

          const total_dispatch = dispatchData?.reduce(
            (sum, entry) => sum + Number(entry.dispatched_quantity),
            0
          ) || 0;

          const balance_quantity = order.ordered_quantity - total_dispatch;

          return {
            ...order,
            total_production,
            total_dispatch,
            balance_quantity,
          };
        })
      );

      // Filter orders that have production available
      const ordersReadyForDispatch = ordersWithTotals.filter(
        (order) => order.total_production > order.total_dispatch
      );

      setOrders(ordersReadyForDispatch);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDispatchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("dispatch_entries")
        .select(`
          *,
          sales_orders (
            order_no,
            customer_name,
            product
          )
        `)
        .order("dispatch_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      setDispatchHistory(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const dispatchedQty = Number(formData.dispatched_quantity);
    const availableForDispatch = selectedOrder.total_production - selectedOrder.total_dispatch;

    if (dispatchedQty <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Dispatched quantity must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (dispatchedQty > availableForDispatch) {
      toast({
        title: "Invalid Quantity",
        description: `Cannot dispatch more than available quantity (${availableForDispatch})`,
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("dispatch_entries").insert({
        order_id: selectedOrder.id,
        dispatched_quantity: dispatchedQty,
        dispatch_date: formData.dispatch_date,
        vehicle_no: formData.vehicle_no || null,
        driver_name: formData.driver_name || null,
        transporter: formData.transporter || null,
        loading_remarks: formData.loading_remarks || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Dispatch entry added successfully",
      });

      setFormData({
        dispatched_quantity: "",
        dispatch_date: format(new Date(), "yyyy-MM-dd"),
        vehicle_no: "",
        driver_name: "",
        transporter: "",
        loading_remarks: "",
      });
      setSelectedOrder(null);
      fetchOrders();
      fetchDispatchHistory();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "partially_dispatched":
        return "bg-blue-500";
      case "in_production":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  if (!userRole || !["owner", "supervisor", "dispatch"].includes(userRole)) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dispatch Management</h1>
          <p className="text-muted-foreground">
            Track and manage order dispatches
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ready for Dispatch
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Dispatches
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                dispatchHistory.filter(
                  (d) =>
                    format(new Date(d.dispatch_date), "yyyy-MM-dd") ===
                    format(new Date(), "yyyy-MM-dd")
                ).length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Dispatched
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dispatchHistory.reduce(
                (sum, d) => sum + Number(d.dispatched_quantity),
                0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Ready for Dispatch */}
      <Card>
        <CardHeader>
          <CardTitle>Orders Ready for Dispatch</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No orders ready for dispatch
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {order.order_no}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {order.customer_name}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Product</p>
                      <p className="text-sm text-muted-foreground">
                        {order.product}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="font-medium">Ordered</p>
                        <p>{order.ordered_quantity}</p>
                      </div>
                      <div>
                        <p className="font-medium">Produced</p>
                        <p>{order.total_production}</p>
                      </div>
                      <div>
                        <p className="font-medium">Dispatched</p>
                        <p>{order.total_dispatch}</p>
                      </div>
                      <div>
                        <p className="font-medium text-blue-600">Available</p>
                        <p className="text-blue-600 font-semibold">
                          {order.total_production - order.total_dispatch}
                        </p>
                      </div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          className="w-full"
                          onClick={() => setSelectedOrder(order)}
                        >
                          Add Dispatch
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            Dispatch Order: {order.order_no}
                          </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Customer</Label>
                              <Input
                                value={order.customer_name}
                                disabled
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Product</Label>
                              <Input value={order.product} disabled />
                            </div>
                            <div className="space-y-2">
                              <Label>Available for Dispatch</Label>
                              <Input
                                value={
                                  order.total_production - order.total_dispatch
                                }
                                disabled
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="dispatched_quantity">
                                Dispatched Quantity *
                              </Label>
                              <Input
                                id="dispatched_quantity"
                                type="number"
                                value={formData.dispatched_quantity}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    dispatched_quantity: e.target.value,
                                  })
                                }
                                required
                                min="1"
                                max={
                                  order.total_production - order.total_dispatch
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="dispatch_date">
                                Dispatch Date *
                              </Label>
                              <Input
                                id="dispatch_date"
                                type="date"
                                value={formData.dispatch_date}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    dispatch_date: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="vehicle_no">Vehicle Number</Label>
                              <Input
                                id="vehicle_no"
                                value={formData.vehicle_no}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    vehicle_no: e.target.value,
                                  })
                                }
                                placeholder="e.g., MH12AB1234"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="driver_name">Driver Name</Label>
                              <Input
                                id="driver_name"
                                value={formData.driver_name}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    driver_name: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="transporter">Transporter</Label>
                              <Input
                                id="transporter"
                                value={formData.transporter}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    transporter: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="loading_remarks">
                              Loading Notes / Remarks
                            </Label>
                            <Textarea
                              id="loading_remarks"
                              value={formData.loading_remarks}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  loading_remarks: e.target.value,
                                })
                              }
                              rows={3}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <DialogTrigger asChild>
                              <Button type="button" variant="outline">
                                Cancel
                              </Button>
                            </DialogTrigger>
                            <Button type="submit" disabled={submitting}>
                              {submitting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                "Submit Dispatch"
                              )}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispatch History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Dispatch History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Order No</th>
                  <th className="text-left p-2">Customer</th>
                  <th className="text-left p-2">Product</th>
                  <th className="text-right p-2">Quantity</th>
                  <th className="text-left p-2">Vehicle</th>
                  <th className="text-left p-2">Driver</th>
                  <th className="text-left p-2">Transporter</th>
                </tr>
              </thead>
              <tbody>
                {dispatchHistory.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      {format(new Date(entry.dispatch_date), "dd MMM yyyy")}
                    </td>
                    <td className="p-2">{entry.sales_orders.order_no}</td>
                    <td className="p-2">{entry.sales_orders.customer_name}</td>
                    <td className="p-2">{entry.sales_orders.product}</td>
                    <td className="p-2 text-right">
                      {entry.dispatched_quantity}
                    </td>
                    <td className="p-2">{entry.vehicle_no || "-"}</td>
                    <td className="p-2">{entry.driver_name || "-"}</td>
                    <td className="p-2">{entry.transporter || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
