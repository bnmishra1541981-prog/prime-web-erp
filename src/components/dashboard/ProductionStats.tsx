import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle2, Clock, TrendingUp, Users, Wrench } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { format, subDays } from "date-fns";

interface ProductionStatsData {
  totalOrders: number;
  completedOrders: number;
  inProgressOrders: number;
  totalProduction: number;
  totalDispatch: number;
  balanceQty: number;
  activeTeam: number;
  activeMachines: number;
}

interface DailyData {
  date: string;
  production: number;
  dispatch: number;
}

interface OrderStatus {
  status: string;
  count: number;
}

const COLORS = ['#F05134', '#3b82f6', '#10b981', '#f59e0b'];

export const ProductionStats = () => {
  const [stats, setStats] = useState<ProductionStatsData | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccessAndFetch();
  }, []);

  const checkAccessAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData?.role === "owner" || roleData?.role === "supervisor") {
      setHasAccess(true);
      await fetchStats();
    } else {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);

    // Fetch orders
    const { data: orders } = await supabase.from("sales_orders").select("*");

    // Fetch production entries
    const { data: production } = await supabase.from("production_entries").select("*");

    // Fetch dispatch entries
    const { data: dispatch } = await supabase.from("dispatch_entries").select("*");

    // Fetch team
    const { data: team } = await supabase
      .from("user_roles")
      .select("*")
      .in("role", ["production", "supervisor"]);

    // Fetch machines
    const { data: machines } = await supabase
      .from("machines")
      .select("*")
      .eq("is_active", true);

    const totalProduction = production?.reduce((sum, p) => sum + Number(p.produced_quantity), 0) || 0;
    const totalDispatch = dispatch?.reduce((sum, d) => sum + Number(d.dispatched_quantity), 0) || 0;
    const totalOrdered = orders?.reduce((sum, o) => sum + Number(o.ordered_quantity), 0) || 0;

    setStats({
      totalOrders: orders?.length || 0,
      completedOrders: orders?.filter(o => o.status === "completed").length || 0,
      inProgressOrders: orders?.filter(o => o.status === "in_production" || o.status === "pending").length || 0,
      totalProduction,
      totalDispatch,
      balanceQty: totalOrdered - totalDispatch,
      activeTeam: team?.length || 0,
      activeMachines: machines?.length || 0,
    });

    // Calculate daily data for last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return format(date, "yyyy-MM-dd");
    });

    const daily = last7Days.map(date => {
      const dayProd = production
        ?.filter(p => format(new Date(p.entry_date), "yyyy-MM-dd") === date)
        .reduce((sum, p) => sum + Number(p.produced_quantity), 0) || 0;
      const dayDisp = dispatch
        ?.filter(d => format(new Date(d.dispatch_date), "yyyy-MM-dd") === date)
        .reduce((sum, d) => sum + Number(d.dispatched_quantity), 0) || 0;
      return {
        date: format(new Date(date), "dd MMM"),
        production: dayProd,
        dispatch: dayDisp,
      };
    });
    setDailyData(daily);

    // Order status
    const statusCounts: Record<string, number> = {};
    orders?.forEach(o => {
      statusCounts[o.status || "pending"] = (statusCounts[o.status || "pending"] || 0) + 1;
    });
    setOrderStatus(
      Object.entries(statusCounts).map(([status, count]) => ({
        status: status.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        count,
      }))
    );

    setLoading(false);
  };

  if (loading) return null;
  if (!hasAccess || !stats) return null;
  if (stats.totalOrders === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          Production Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </div>
          <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <p className="text-2xl font-bold text-foreground">{stats.completedOrders}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="text-center p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
            <p className="text-2xl font-bold text-foreground">{stats.inProgressOrders}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div className="text-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <p className="text-2xl font-bold text-foreground">{stats.balanceQty}</p>
            <p className="text-xs text-muted-foreground">Balance Qty</p>
          </div>
        </div>

        {/* Production vs Dispatch Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-xl font-bold">{stats.totalProduction}</p>
            <p className="text-xs text-muted-foreground">Produced</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-xl font-bold">{stats.totalDispatch}</p>
            <p className="text-xs text-muted-foreground">Dispatched</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-xl font-bold">{stats.activeTeam}</span>
              <Wrench className="h-4 w-4 ml-2" />
              <span className="text-xl font-bold">{stats.activeMachines}</span>
            </div>
            <p className="text-xs text-muted-foreground">Team / Machines</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium mb-2">Last 7 Days Production</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={dailyData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Bar dataKey="production" fill="#F05134" name="Production" />
                <Bar dataKey="dispatch" fill="#3b82f6" name="Dispatch" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Order Status</p>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={orderStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  dataKey="count"
                  label={({ status, count }) => `${status}: ${count}`}
                  labelLine={false}
                >
                  {orderStatus.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
