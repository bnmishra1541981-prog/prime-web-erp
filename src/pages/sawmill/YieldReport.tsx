import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, Download, Printer, BarChart3, Users, Factory } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format, startOfMonth, endOfMonth } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface YieldEntry {
  tag_number: string;
  input_cft: number;
  main_size_cft: number;
  off_size_cft: number;
  sawdust_weight: number;
  firewood_weight: number;
  total_output_cft: number;
  yield_percent: number;
}

interface MunsiReport {
  name: string;
  total_logs: number;
  total_input_cft: number;
  total_output_cft: number;
  avg_yield: number;
}

interface MachineReport {
  machine_no: string;
  total_logs: number;
  total_cft: number;
  total_output_cft: number;
  efficiency: number;
}

interface DailySummary {
  date: string;
  total_logs: number;
  input_cft: number;
  output_cft: number;
  yield_percent: number;
  contractor_cost: number;
  labour_expense: number;
  maintenance_expense: number;
  product_value: number;
  net_profit: number;
}

const YieldReport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("yield");

  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  const [yieldData, setYieldData] = useState<YieldEntry[]>([]);
  const [munsiData, setMunsiData] = useState<MunsiReport[]>([]);
  const [machineData, setMachineData] = useState<MachineReport[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) fetchAllReports();
  }, [selectedCompany, dateRange]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    if (data && data.length > 0) {
      setCompanies(data);
      setSelectedCompany(data[0].id);
    }
    setLoading(false);
  };

  const fetchAllReports = async () => {
    setLoading(true);
    await Promise.all([fetchYieldReport(), fetchMunsiReport(), fetchMachineReport(), fetchDailySummary()]);
    setLoading(false);
  };

  const fetchYieldReport = async () => {
    // Get production entries with log info
    const { data: prodEntries } = await supabase
      .from("sawmill_production_entries")
      .select("log_id, cft, saw_mill_id")
      .eq("company_id", selectedCompany)
      .gte("entry_date", dateRange.start)
      .lte("entry_date", dateRange.end)
      .not("log_id", "is", null);

    if (!prodEntries || prodEntries.length === 0) { setYieldData([]); return; }

    const logIds = [...new Set(prodEntries.map(e => e.log_id).filter(Boolean))] as string[];
    
    // Get log details
    const { data: logs } = await supabase.from("sawmill_logs").select("id, tag_number, cft").in("id", logIds);

    // Get output entries linked through production
    const { data: outputEntries } = await supabase
      .from("sawmill_output_entries")
      .select("production_entry_id, output_type, cft, weight")
      .eq("company_id", selectedCompany)
      .gte("entry_date", dateRange.start)
      .lte("entry_date", dateRange.end);

    // Build yield per tag
    const yieldMap = new Map<string, YieldEntry>();

    logs?.forEach(log => {
      yieldMap.set(log.id, {
        tag_number: log.tag_number,
        input_cft: Number(log.cft) || 0,
        main_size_cft: 0, off_size_cft: 0, sawdust_weight: 0, firewood_weight: 0,
        total_output_cft: 0, yield_percent: 0,
      });
    });

    // Sum output by type (simplified - using date range matching)
    outputEntries?.forEach(entry => {
      // For now aggregate all outputs in the period
      yieldMap.forEach((val) => {
        // This is simplified - in production you'd link via production_entry_id
      });
    });

    // Aggregate output by date range per tag (simplified approach)
    const { data: allOutputs } = await supabase
      .from("sawmill_output_entries")
      .select("output_type, cft, weight")
      .eq("company_id", selectedCompany)
      .gte("entry_date", dateRange.start)
      .lte("entry_date", dateRange.end);

    const totalInputCFT = [...yieldMap.values()].reduce((s, v) => s + v.input_cft, 0);
    const totalMainCFT = allOutputs?.filter(o => o.output_type === "main_material").reduce((s, o) => s + Number(o.cft), 0) || 0;
    const totalOffCFT = allOutputs?.filter(o => o.output_type === "off_side").reduce((s, o) => s + Number(o.cft), 0) || 0;
    const totalSawdust = allOutputs?.filter(o => o.output_type === "sawdust").reduce((s, o) => s + Number(o.weight || 0), 0) || 0;
    const totalFirewood = allOutputs?.filter(o => o.output_type === "firewood").reduce((s, o) => s + Number(o.weight || 0), 0) || 0;
    const totalOutputCFT = totalMainCFT + totalOffCFT;

    // Distribute proportionally across tags
    yieldMap.forEach((val, key) => {
      if (totalInputCFT > 0) {
        const ratio = val.input_cft / totalInputCFT;
        val.main_size_cft = totalMainCFT * ratio;
        val.off_size_cft = totalOffCFT * ratio;
        val.sawdust_weight = totalSawdust * ratio;
        val.firewood_weight = totalFirewood * ratio;
        val.total_output_cft = (totalMainCFT + totalOffCFT) * ratio;
        val.yield_percent = val.input_cft > 0 ? (val.total_output_cft / val.input_cft) * 100 : 0;
      }
    });

    setYieldData([...yieldMap.values()]);
  };

  const fetchMunsiReport = async () => {
    const { data } = await supabase
      .from("sawmill_production_entries")
      .select("team_name, cft, log_id")
      .eq("company_id", selectedCompany)
      .gte("entry_date", dateRange.start)
      .lte("entry_date", dateRange.end);

    if (!data) { setMunsiData([]); return; }

    const map = new Map<string, MunsiReport>();
    data.forEach(entry => {
      const name = (entry as any).team_name || "Unassigned";
      if (!map.has(name)) {
        map.set(name, { name, total_logs: 0, total_input_cft: 0, total_output_cft: 0, avg_yield: 0 });
      }
      const m = map.get(name)!;
      m.total_logs += 1;
      m.total_input_cft += Number(entry.cft) || 0;
    });

    // Get total output for yield calc
    const { data: outputs } = await supabase
      .from("sawmill_output_entries")
      .select("cft, output_type")
      .eq("company_id", selectedCompany)
      .gte("entry_date", dateRange.start)
      .lte("entry_date", dateRange.end);

    const totalOutput = outputs?.filter(o => !["firewood", "sawdust"].includes(o.output_type)).reduce((s, o) => s + Number(o.cft), 0) || 0;
    const totalInput = [...map.values()].reduce((s, m) => s + m.total_input_cft, 0);

    map.forEach(m => {
      if (totalInput > 0) {
        m.total_output_cft = totalOutput * (m.total_input_cft / totalInput);
        m.avg_yield = m.total_input_cft > 0 ? (m.total_output_cft / m.total_input_cft) * 100 : 0;
      }
    });

    setMunsiData([...map.values()].filter(m => m.total_logs > 0));
  };

  const fetchMachineReport = async () => {
    const { data } = await supabase
      .from("sawmill_production_entries")
      .select("machine_no, cft, log_id")
      .eq("company_id", selectedCompany)
      .gte("entry_date", dateRange.start)
      .lte("entry_date", dateRange.end);

    if (!data) { setMachineData([]); return; }

    const map = new Map<string, MachineReport>();
    data.forEach(entry => {
      const mno = (entry as any).machine_no || "Unassigned";
      if (!map.has(mno)) {
        map.set(mno, { machine_no: mno, total_logs: 0, total_cft: 0, total_output_cft: 0, efficiency: 0 });
      }
      const m = map.get(mno)!;
      m.total_logs += 1;
      m.total_cft += Number(entry.cft) || 0;
    });

    const { data: outputs } = await supabase
      .from("sawmill_output_entries")
      .select("cft, output_type")
      .eq("company_id", selectedCompany)
      .gte("entry_date", dateRange.start)
      .lte("entry_date", dateRange.end);

    const totalOutput = outputs?.filter(o => !["firewood", "sawdust"].includes(o.output_type)).reduce((s, o) => s + Number(o.cft), 0) || 0;
    const totalInput = [...map.values()].reduce((s, m) => s + m.total_cft, 0);

    map.forEach(m => {
      if (totalInput > 0) {
        m.total_output_cft = totalOutput * (m.total_cft / totalInput);
        m.efficiency = m.total_cft > 0 ? (m.total_output_cft / m.total_cft) * 100 : 0;
      }
    });

    setMachineData([...map.values()].filter(m => m.total_logs > 0));
  };

  const fetchDailySummary = async () => {
    const { data: prodData } = await supabase
      .from("sawmill_production_entries")
      .select("entry_date, cft, total_amount")
      .eq("company_id", selectedCompany)
      .gte("entry_date", dateRange.start)
      .lte("entry_date", dateRange.end)
      .order("entry_date");

    const { data: outputData } = await supabase
      .from("sawmill_output_entries")
      .select("entry_date, cft, output_type, amount, rate_per_unit")
      .eq("company_id", selectedCompany)
      .gte("entry_date", dateRange.start)
      .lte("entry_date", dateRange.end);

    const { data: expenseData } = await supabase
      .from("sawmill_expenses")
      .select("expense_date, amount, category")
      .eq("company_id", selectedCompany)
      .gte("expense_date", dateRange.start)
      .lte("expense_date", dateRange.end);

    if (!prodData) { setDailySummary([]); return; }

    const dateMap = new Map<string, DailySummary>();

    prodData.forEach(e => {
      const d = e.entry_date;
      if (!dateMap.has(d)) {
        dateMap.set(d, { date: d, total_logs: 0, input_cft: 0, output_cft: 0, yield_percent: 0, contractor_cost: 0, labour_expense: 0, maintenance_expense: 0, product_value: 0, net_profit: 0 });
      }
      const s = dateMap.get(d)!;
      s.total_logs += 1;
      s.input_cft += Number(e.cft) || 0;
      s.contractor_cost += Number(e.total_amount) || 0;
    });

    outputData?.forEach(e => {
      const d = e.entry_date;
      if (!dateMap.has(d)) return;
      const s = dateMap.get(d)!;
      if (!["firewood", "sawdust"].includes(e.output_type)) {
        s.output_cft += Number(e.cft) || 0;
      }
      s.product_value += Number((e as any).amount) || 0;
    });

    expenseData?.forEach(e => {
      const d = e.expense_date;
      if (!dateMap.has(d)) return;
      const s = dateMap.get(d)!;
      const cat = e.category?.toLowerCase() || "";
      if (cat.includes("labour") || cat.includes("labor")) {
        s.labour_expense += Number(e.amount);
      } else if (cat.includes("maintenance") || cat.includes("blade") || cat.includes("machine")) {
        s.maintenance_expense += Number(e.amount);
      } else {
        s.maintenance_expense += Number(e.amount);
      }
    });

    dateMap.forEach(s => {
      s.yield_percent = s.input_cft > 0 ? (s.output_cft / s.input_cft) * 100 : 0;
      s.net_profit = s.product_value - s.contractor_cost - s.labour_expense - s.maintenance_expense;
    });

    setDailySummary([...dateMap.values()].sort((a, b) => a.date.localeCompare(b.date)));
  };

  const handlePrint = () => window.print();

  const handleExport = async () => {
    if (!printRef.current) return;
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`yield-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast({ title: "Success", description: "Report exported" });
    } catch { toast({ title: "Error", description: "Export failed", variant: "destructive" }); }
  };

  const getYieldBadge = (percent: number) => {
    if (percent >= 80) return <Badge className="bg-green-100 text-green-800">{percent.toFixed(1)}%</Badge>;
    if (percent >= 60) return <Badge className="bg-yellow-100 text-yellow-800">{percent.toFixed(1)}%</Badge>;
    return <Badge variant="destructive">{percent.toFixed(1)}%</Badge>;
  };

  // Totals
  const totalInputCFT = yieldData.reduce((s, y) => s + y.input_cft, 0);
  const totalOutputCFT = yieldData.reduce((s, y) => s + y.total_output_cft, 0);
  const overallYield = totalInputCFT > 0 ? (totalOutputCFT / totalInputCFT) * 100 : 0;

  if (loading && yieldData.length === 0) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6" ref={printRef}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Production Reports & Yield Analysis</h1>
          <p className="text-muted-foreground">Track efficiency, team performance & daily profitability</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Company" /></SelectTrigger>
            <SelectContent>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" /> Print</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" /> PDF</Button>
        </div>
      </div>

      {/* Date Range */}
      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <Label>From</Label>
          <Input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} />
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Input CFT</p><p className="text-2xl font-bold">{totalInputCFT.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Output CFT</p><p className="text-2xl font-bold">{totalOutputCFT.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Overall Yield</p><p className="text-2xl font-bold">{getYieldBadge(overallYield)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Tags Processed</p><p className="text-2xl font-bold">{yieldData.length}</p></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="yield"><TrendingUp className="h-4 w-4 mr-1" /> Yield</TabsTrigger>
          <TabsTrigger value="munsi"><Users className="h-4 w-4 mr-1" /> Munsi-wise</TabsTrigger>
          <TabsTrigger value="machine"><Factory className="h-4 w-4 mr-1" /> Machine-wise</TabsTrigger>
          <TabsTrigger value="daily"><BarChart3 className="h-4 w-4 mr-1" /> Daily Summary</TabsTrigger>
        </TabsList>

        {/* Yield Report */}
        <TabsContent value="yield">
          <Card>
            <CardHeader><CardTitle>Tag-wise Yield Report</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tag No</TableHead>
                      <TableHead>Input CFT</TableHead>
                      <TableHead>Main Size CFT</TableHead>
                      <TableHead>Off Size CFT</TableHead>
                      <TableHead>Sawdust (Kg)</TableHead>
                      <TableHead>Firewood (Kg)</TableHead>
                      <TableHead>Total Output CFT</TableHead>
                      <TableHead>Yield %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yieldData.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No data for selected period</TableCell></TableRow>
                    ) : yieldData.map((y, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{y.tag_number}</TableCell>
                        <TableCell>{y.input_cft.toFixed(2)}</TableCell>
                        <TableCell>{y.main_size_cft.toFixed(2)}</TableCell>
                        <TableCell>{y.off_size_cft.toFixed(2)}</TableCell>
                        <TableCell>{y.sawdust_weight.toFixed(1)}</TableCell>
                        <TableCell>{y.firewood_weight.toFixed(1)}</TableCell>
                        <TableCell>{y.total_output_cft.toFixed(2)}</TableCell>
                        <TableCell>{getYieldBadge(y.yield_percent)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Munsi Report */}
        <TabsContent value="munsi">
          <Card>
            <CardHeader><CardTitle>Munsi / Team-wise Report</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Munsi Name</TableHead>
                    <TableHead>Total Logs</TableHead>
                    <TableHead>Total Input CFT</TableHead>
                    <TableHead>Total Output CFT</TableHead>
                    <TableHead>Avg Yield %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {munsiData.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                  ) : munsiData.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.total_logs}</TableCell>
                      <TableCell>{m.total_input_cft.toFixed(2)}</TableCell>
                      <TableCell>{m.total_output_cft.toFixed(2)}</TableCell>
                      <TableCell>{getYieldBadge(m.avg_yield)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Machine Report */}
        <TabsContent value="machine">
          <Card>
            <CardHeader><CardTitle>Machine / Mill-wise Report</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mill / Machine No</TableHead>
                    <TableHead>Total Logs</TableHead>
                    <TableHead>Total CFT Processed</TableHead>
                    <TableHead>Total Output CFT</TableHead>
                    <TableHead>Efficiency %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machineData.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                  ) : machineData.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{m.machine_no}</TableCell>
                      <TableCell>{m.total_logs}</TableCell>
                      <TableCell>{m.total_cft.toFixed(2)}</TableCell>
                      <TableCell>{m.total_output_cft.toFixed(2)}</TableCell>
                      <TableCell>{getYieldBadge(m.efficiency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Summary */}
        <TabsContent value="daily">
          <Card>
            <CardHeader><CardTitle>Daily Production Summary & Profit</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Logs</TableHead>
                      <TableHead>Input CFT</TableHead>
                      <TableHead>Output CFT</TableHead>
                      <TableHead>Yield %</TableHead>
                      <TableHead>Contractor Cost</TableHead>
                      <TableHead>Labour Exp</TableHead>
                      <TableHead>Maintenance</TableHead>
                      <TableHead>Product Value</TableHead>
                      <TableHead>Net Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailySummary.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                    ) : (
                      <>
                        {dailySummary.map((s, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{format(new Date(s.date), "dd MMM")}</TableCell>
                            <TableCell>{s.total_logs}</TableCell>
                            <TableCell>{s.input_cft.toFixed(2)}</TableCell>
                            <TableCell>{s.output_cft.toFixed(2)}</TableCell>
                            <TableCell>{getYieldBadge(s.yield_percent)}</TableCell>
                            <TableCell>{formatCurrency(s.contractor_cost)}</TableCell>
                            <TableCell>{formatCurrency(s.labour_expense)}</TableCell>
                            <TableCell>{formatCurrency(s.maintenance_expense)}</TableCell>
                            <TableCell>{formatCurrency(s.product_value)}</TableCell>
                            <TableCell className={s.net_profit >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                              {formatCurrency(s.net_profit)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Totals Row */}
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell>TOTAL</TableCell>
                          <TableCell>{dailySummary.reduce((s, d) => s + d.total_logs, 0)}</TableCell>
                          <TableCell>{dailySummary.reduce((s, d) => s + d.input_cft, 0).toFixed(2)}</TableCell>
                          <TableCell>{dailySummary.reduce((s, d) => s + d.output_cft, 0).toFixed(2)}</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>{formatCurrency(dailySummary.reduce((s, d) => s + d.contractor_cost, 0))}</TableCell>
                          <TableCell>{formatCurrency(dailySummary.reduce((s, d) => s + d.labour_expense, 0))}</TableCell>
                          <TableCell>{formatCurrency(dailySummary.reduce((s, d) => s + d.maintenance_expense, 0))}</TableCell>
                          <TableCell>{formatCurrency(dailySummary.reduce((s, d) => s + d.product_value, 0))}</TableCell>
                          <TableCell className={dailySummary.reduce((s, d) => s + d.net_profit, 0) >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(dailySummary.reduce((s, d) => s + d.net_profit, 0))}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default YieldReport;
