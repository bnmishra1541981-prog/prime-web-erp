import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, TreeDeciduous, Package, Wallet, TrendingUp, Users, Factory, Truck, ClipboardList } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface DashboardStats {
  totalInputCFT: number;
  totalOutputCFT: number;
  mainMaterialCFT: number;
  offSideCFT: number;
  firewoodCFT: number;
  sawdustCFT: number;
  totalContractorBalance: number;
  totalPayments: number;
  totalExpenses: number;
  contractorCount: number;
  // Production/Dispatch stats
  totalOrders: number;
  pendingOrders: number;
  totalProduced: number;
  totalDispatched: number;
  balanceQty: number;
  // Log inventory stats
  totalLogs: number;
  availableLogs: number;
  inProcessLogs: number;
  processedLogs: number;
  logsTotalCFT: number;
}

interface Contractor {
  id: string;
  name: string;
  current_balance: number;
}

interface OrderSummary {
  id: string;
  order_no: string;
  customer_name: string;
  ordered_quantity: number;
  produced: number;
  dispatched: number;
  balance: number;
  status: string;
}

const SawmillDashboard = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [sawMills, setSawMills] = useState<any[]>([]);
  const [selectedMill, setSelectedMill] = useState<string>("all");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) {
      fetchSawMills();
      fetchDashboardData();
    }
  }, [selectedCompany, selectedMill, period]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    if (data && data.length > 0) {
      setCompanies(data);
      setSelectedCompany(data[0].id);
    }
    setLoading(false);
  };

  const fetchSawMills = async () => {
    const { data } = await supabase
      .from("saw_mills")
      .select("id, name")
      .eq("company_id", selectedCompany)
      .eq("is_active", true)
      .order("name");
    setSawMills(data || []);
  };

  const getDateFilter = () => {
    const today = new Date();
    if (period === "today") {
      return today.toISOString().split("T")[0];
    } else if (period === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo.toISOString().split("T")[0];
    } else {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return monthAgo.toISOString().split("T")[0];
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    const dateFilter = getDateFilter();

    // Fetch production entries
    let productionQuery = supabase
      .from("sawmill_production_entries")
      .select("cft, total_amount")
      .eq("company_id", selectedCompany)
      .gte("entry_date", dateFilter);
    
    if (selectedMill !== "all") {
      productionQuery = productionQuery.eq("saw_mill_id", selectedMill);
    }
    
    const { data: productionData } = await productionQuery;

    // Fetch output entries
    let outputQuery = supabase
      .from("sawmill_output_entries")
      .select("cft, output_type")
      .eq("company_id", selectedCompany)
      .gte("entry_date", dateFilter);
    
    if (selectedMill !== "all") {
      outputQuery = outputQuery.eq("saw_mill_id", selectedMill);
    }
    
    const { data: outputData } = await outputQuery;

    // Fetch contractors
    let contractorQuery = supabase
      .from("sawmill_contractors")
      .select("id, name, current_balance")
      .eq("company_id", selectedCompany)
      .eq("is_active", true);
    
    if (selectedMill !== "all") {
      contractorQuery = contractorQuery.eq("saw_mill_id", selectedMill);
    }
    
    const { data: contractorData } = await contractorQuery;

    // Fetch payments
    let paymentQuery = supabase
      .from("sawmill_contractor_payments")
      .select("amount")
      .eq("company_id", selectedCompany)
      .gte("payment_date", dateFilter);
    
    const { data: paymentData } = await paymentQuery;

    // Fetch expenses
    let expenseQuery = supabase
      .from("sawmill_expenses")
      .select("amount")
      .eq("company_id", selectedCompany)
      .gte("expense_date", dateFilter);
    
    if (selectedMill !== "all") {
      expenseQuery = expenseQuery.eq("saw_mill_id", selectedMill);
    }
    
    const { data: expenseData } = await expenseQuery;

    // Fetch sales orders for production/dispatch tracking
    const { data: salesOrdersData } = await supabase
      .from("sales_orders")
      .select("id, order_no, customer_name, ordered_quantity, status, ready_materials")
      .gte("created_at", dateFilter);

    // Fetch production entries for orders
    const { data: orderProductionData } = await supabase
      .from("production_entries")
      .select("order_id, produced_quantity")
      .gte("entry_date", dateFilter);

    // Fetch dispatch entries
    const { data: dispatchData } = await supabase
      .from("dispatch_entries")
      .select("order_id, dispatched_quantity")
      .gte("dispatch_date", dateFilter);

    // Fetch log inventory
    let logsQuery = supabase
      .from("sawmill_logs")
      .select("status, cft")
      .eq("company_id", selectedCompany);
    if (selectedMill !== "all") {
      logsQuery = logsQuery.eq("saw_mill_id", selectedMill);
    }
    const { data: logsData } = await logsQuery;

    // Calculate production stats
    const productionByOrder = new Map<string, number>();
    orderProductionData?.forEach(e => {
      const current = productionByOrder.get(e.order_id) || 0;
      productionByOrder.set(e.order_id, current + Number(e.produced_quantity));
    });

    const dispatchByOrder = new Map<string, number>();
    dispatchData?.forEach(e => {
      const current = dispatchByOrder.get(e.order_id) || 0;
      dispatchByOrder.set(e.order_id, current + Number(e.dispatched_quantity));
    });

    const orderSummaries: OrderSummary[] = (salesOrdersData || []).map(order => {
      const produced = productionByOrder.get(order.id) || Number(order.ready_materials || 0);
      const dispatched = dispatchByOrder.get(order.id) || 0;
      return {
        id: order.id,
        order_no: order.order_no,
        customer_name: order.customer_name,
        ordered_quantity: order.ordered_quantity,
        produced,
        dispatched,
        balance: order.ordered_quantity - dispatched,
        status: order.status || 'pending',
      };
    });

    const totalProduced = orderSummaries.reduce((sum, o) => sum + o.produced, 0);
    const totalDispatched = orderSummaries.reduce((sum, o) => sum + o.dispatched, 0);
    const totalOrderedQty = orderSummaries.reduce((sum, o) => sum + o.ordered_quantity, 0);
    const pendingOrders = orderSummaries.filter(o => o.status !== 'completed').length;

    // Calculate sawmill stats
    const totalInputCFT = productionData?.reduce((sum, e) => sum + Number(e.cft), 0) || 0;
    const totalOutputCFT = outputData?.reduce((sum, e) => sum + Number(e.cft), 0) || 0;
    const mainMaterialCFT = outputData?.filter(e => e.output_type === "main_material").reduce((sum, e) => sum + Number(e.cft), 0) || 0;
    const offSideCFT = outputData?.filter(e => e.output_type === "off_side").reduce((sum, e) => sum + Number(e.cft), 0) || 0;
    const firewoodCFT = outputData?.filter(e => e.output_type === "firewood").reduce((sum, e) => sum + Number(e.cft), 0) || 0;
    const sawdustCFT = outputData?.filter(e => e.output_type === "sawdust").reduce((sum, e) => sum + Number(e.cft), 0) || 0;
    const totalContractorBalance = contractorData?.reduce((sum, c) => sum + Number(c.current_balance), 0) || 0;
    const totalPayments = paymentData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const totalExpenses = expenseData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    // Calculate log stats
    const totalLogs = logsData?.length || 0;
    const availableLogs = logsData?.filter(l => l.status === 'available').length || 0;
    const inProcessLogs = logsData?.filter(l => l.status === 'in_process').length || 0;
    const processedLogs = logsData?.filter(l => l.status === 'processed').length || 0;
    const logsTotalCFT = logsData?.reduce((sum, l) => sum + Number(l.cft), 0) || 0;

    setStats({
      totalInputCFT,
      totalOutputCFT,
      mainMaterialCFT,
      offSideCFT,
      firewoodCFT,
      sawdustCFT,
      totalContractorBalance,
      totalPayments,
      totalExpenses,
      contractorCount: contractorData?.length || 0,
      totalOrders: salesOrdersData?.length || 0,
      pendingOrders,
      totalProduced,
      totalDispatched,
      balanceQty: totalOrderedQty - totalDispatched,
      totalLogs,
      availableLogs,
      inProcessLogs,
      processedLogs,
      logsTotalCFT,
    });
    setContractors(contractorData || []);
    setOrders(orderSummaries.slice(0, 5)); // Top 5 orders
    setLoading(false);
  };

  const getEfficiencyPercent = () => {
    if (!stats || stats.totalInputCFT === 0) return 0;
    return ((stats.totalOutputCFT / stats.totalInputCFT) * 100).toFixed(1);
  };

  const getOutputPercent = (cft: number) => {
    if (!stats || stats.totalInputCFT === 0) return 0;
    return ((cft / stats.totalInputCFT) * 100).toFixed(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_production': return 'bg-blue-500';
      case 'partially_dispatched': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Saw Mill Dashboard</h1>
          <p className="text-muted-foreground">Production, Dispatch & Contractor Overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMill} onValueChange={setSelectedMill}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Mills" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Mills</SelectItem>
              {sawMills.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Production/Dispatch Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.pendingOrders || 0} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Produced</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.totalProduced || 0}</div>
            <p className="text-xs text-muted-foreground">Total Produced</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dispatched</CardTitle>
            <Truck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.totalDispatched || 0}</div>
            <p className="text-xs text-muted-foreground">Total Dispatched</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.balanceQty || 0}</div>
            <p className="text-xs text-muted-foreground">Pending Dispatch</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contractor Due</CardTitle>
            <Wallet className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats?.totalContractorBalance || 0)}</div>
            <p className="text-xs text-muted-foreground">{stats?.contractorCount} Contractors</p>
          </CardContent>
        </Card>
      </div>

      {/* Log Inventory Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <TreeDeciduous className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLogs || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.logsTotalCFT?.toFixed(2) || 0} Total CFT</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available Logs</CardTitle>
            <TreeDeciduous className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.availableLogs || 0}</div>
            <p className="text-xs text-muted-foreground">Ready for processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Process</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.inProcessLogs || 0}</div>
            <p className="text-xs text-muted-foreground">Being processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.processedLogs || 0}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>
      {/* Sawmill Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Input CFT</CardTitle>
            <TreeDeciduous className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalInputCFT.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Round Log Input</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Output CFT</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOutputCFT.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total Output</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getEfficiencyPercent()}%</div>
            <p className="text-xs text-muted-foreground">Overall Yield</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Contractors</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.contractorCount}</div>
            <p className="text-xs text-muted-foreground">Working Contractors</p>
          </CardContent>
        </Card>
      </div>

      {/* Output Breakdown & Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Output Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Main Material</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{stats?.mainMaterialCFT.toFixed(2)} CFT</span>
                <Badge variant="secondary">{getOutputPercent(stats?.mainMaterialCFT || 0)}%</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Off-Side Material</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{stats?.offSideCFT.toFixed(2)} CFT</span>
                <Badge variant="secondary">{getOutputPercent(stats?.offSideCFT || 0)}%</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Firewood</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{stats?.firewoodCFT.toFixed(2)} CFT</span>
                <Badge variant="secondary">{getOutputPercent(stats?.firewoodCFT || 0)}%</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Sawdust</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{stats?.sawdustCFT.toFixed(2)} CFT</span>
                <Badge variant="secondary">{getOutputPercent(stats?.sawdustCFT || 0)}%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-muted-foreground text-sm">No orders found</p>
            ) : (
              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{o.order_no}</span>
                      <p className="text-xs text-muted-foreground">{o.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(o.status)}>{o.status}</Badge>
                      <p className="text-xs text-muted-foreground">Bal: {o.balance}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contractor Balances</CardTitle>
          </CardHeader>
          <CardContent>
            {contractors.length === 0 ? (
              <p className="text-muted-foreground text-sm">No contractors found</p>
            ) : (
              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                {contractors.map((c) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <span className="text-sm">{c.name}</span>
                    <Badge variant={c.current_balance > 0 ? "destructive" : "secondary"}>
                      {formatCurrency(c.current_balance)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <Wallet className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats?.totalPayments || 0)}</div>
            <p className="text-xs text-muted-foreground">Paid to Contractors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Factory className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats?.totalExpenses || 0)}</div>
            <p className="text-xs text-muted-foreground">Misc Expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Outflow</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency((stats?.totalPayments || 0) + (stats?.totalExpenses || 0))}
            </div>
            <p className="text-xs text-muted-foreground">Payments + Expenses</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SawmillDashboard;
