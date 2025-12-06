import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, TreeDeciduous, Package, Wallet, TrendingUp, Users, Factory } from "lucide-react";
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
}

interface Contractor {
  id: string;
  name: string;
  current_balance: number;
}

const SawmillDashboard = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [sawMills, setSawMills] = useState<any[]>([]);
  const [selectedMill, setSelectedMill] = useState<string>("all");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
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

    // Calculate stats
    const totalInputCFT = productionData?.reduce((sum, e) => sum + Number(e.cft), 0) || 0;
    const totalOutputCFT = outputData?.reduce((sum, e) => sum + Number(e.cft), 0) || 0;
    const mainMaterialCFT = outputData?.filter(e => e.output_type === "main_material").reduce((sum, e) => sum + Number(e.cft), 0) || 0;
    const offSideCFT = outputData?.filter(e => e.output_type === "off_side").reduce((sum, e) => sum + Number(e.cft), 0) || 0;
    const firewoodCFT = outputData?.filter(e => e.output_type === "firewood").reduce((sum, e) => sum + Number(e.cft), 0) || 0;
    const sawdustCFT = outputData?.filter(e => e.output_type === "sawdust").reduce((sum, e) => sum + Number(e.cft), 0) || 0;
    const totalContractorBalance = contractorData?.reduce((sum, c) => sum + Number(c.current_balance), 0) || 0;
    const totalPayments = paymentData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const totalExpenses = expenseData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

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
    });
    setContractors(contractorData || []);
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
          <p className="text-muted-foreground">Production & Contractor Overview</p>
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

      {/* Main Stats */}
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
            <CardTitle className="text-sm font-medium">Contractor Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalContractorBalance || 0)}</div>
            <p className="text-xs text-muted-foreground">{stats?.contractorCount} Contractors</p>
          </CardContent>
        </Card>
      </div>

      {/* Output Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <CardTitle className="text-sm font-medium">Active Contractors</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.contractorCount}</div>
            <p className="text-xs text-muted-foreground">Working Contractors</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SawmillDashboard;
