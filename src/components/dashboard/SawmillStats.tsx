import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TreeDeciduous, Package, Wallet, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface SawmillStatsData {
  totalInputCFT: number;
  totalOutputCFT: number;
  efficiency: number;
  totalContractorBalance: number;
  mainMaterialCFT: number;
  offSideCFT: number;
  firewoodKg: number;
  sawdustKg: number;
}

interface SawmillStatsProps {
  companyId: string;
}

export const SawmillStats = ({ companyId }: SawmillStatsProps) => {
  const [stats, setStats] = useState<SawmillStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) fetchStats();
  }, [companyId]);

  const fetchStats = async () => {
    setLoading(true);
    
    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    // Fetch production entries
    const { data: prodData } = await supabase
      .from("sawmill_production_entries")
      .select("cft")
      .eq("company_id", companyId)
      .gte("entry_date", startOfMonth)
      .lte("entry_date", endOfMonth);

    // Fetch output entries
    const { data: outputData } = await supabase
      .from("sawmill_output_entries")
      .select("cft, output_type, weight")
      .eq("company_id", companyId)
      .gte("entry_date", startOfMonth)
      .lte("entry_date", endOfMonth);

    // Fetch contractors
    const { data: contractorData } = await supabase
      .from("sawmill_contractors")
      .select("current_balance")
      .eq("company_id", companyId)
      .eq("is_active", true);

    const totalInputCFT = prodData?.reduce((sum, e) => sum + Number(e.cft), 0) || 0;
    const mainMaterialCFT = outputData?.filter(o => o.output_type === "main_material").reduce((sum, e) => sum + Number(e.cft), 0) || 0;
    const offSideCFT = outputData?.filter(o => o.output_type === "off_side").reduce((sum, e) => sum + Number(e.cft), 0) || 0;
    const firewoodKg = outputData?.filter(o => o.output_type === "firewood").reduce((sum, e) => sum + Number(e.weight || 0), 0) || 0;
    const sawdustKg = outputData?.filter(o => o.output_type === "sawdust").reduce((sum, e) => sum + Number(e.weight || 0), 0) || 0;
    const totalOutputCFT = mainMaterialCFT + offSideCFT;
    const efficiency = totalInputCFT > 0 ? (totalOutputCFT / totalInputCFT) * 100 : 0;
    const totalContractorBalance = contractorData?.reduce((sum, c) => sum + Number(c.current_balance), 0) || 0;

    setStats({
      totalInputCFT,
      totalOutputCFT,
      efficiency,
      totalContractorBalance,
      mainMaterialCFT,
      offSideCFT,
      firewoodKg,
      sawdustKg,
    });
    setLoading(false);
  };

  if (loading || !stats) return null;
  if (stats.totalInputCFT === 0 && stats.totalContractorBalance === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TreeDeciduous className="h-5 w-5" />
          Sawmill Overview (This Month)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{stats.totalInputCFT.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Input CFT</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{stats.totalOutputCFT.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Output CFT</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Badge variant={stats.efficiency > 60 ? "default" : "secondary"}>
              {stats.efficiency.toFixed(1)}%
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Efficiency</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Badge variant={stats.totalContractorBalance > 0 ? "destructive" : "secondary"}>
              {formatCurrency(stats.totalContractorBalance)}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Contractor Due</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Main Material:</span>
            <span className="font-medium">{stats.mainMaterialCFT.toFixed(1)} CFT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Off-Side:</span>
            <span className="font-medium">{stats.offSideCFT.toFixed(1)} CFT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Firewood:</span>
            <span className="font-medium">{stats.firewoodKg.toFixed(1)} Kg</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sawdust:</span>
            <span className="font-medium">{stats.sawdustKg.toFixed(1)} Kg</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
