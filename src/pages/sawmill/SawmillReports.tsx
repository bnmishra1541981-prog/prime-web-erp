import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Factory, Users, Briefcase, Download, Printer, Package } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format, startOfMonth, endOfMonth } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface MillReport {
  mill_id: string;
  mill_name: string;
  total_input_cft: number;
  total_output_cft: number;
  main_material_cft: number;
  off_side_cft: number;
  firewood_kg: number;
  sawdust_kg: number;
  total_production_amount: number;
  total_payments: number;
  efficiency: number;
}

interface TeamReport {
  employee_id: string;
  employee_name: string;
  role: string;
  entries_count: number;
  total_cft: number;
  total_amount: number;
  assigned_mills: string[];
}

interface ContractorReport {
  contractor_id: string;
  contractor_name: string;
  total_cft: number;
  total_amount: number;
  payments_made: number;
  current_balance: number;
  entries_count: number;
}

interface InventoryItem {
  output_type: string;
  size: string;
  opening_stock: number;
  production_qty: number;
  sales_qty: number;
  closing_stock: number;
  unit: string;
}

const SawmillReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [sawMills, setSawMills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("mill");

  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  const [millReports, setMillReports] = useState<MillReport[]>([]);
  const [teamReports, setTeamReports] = useState<TeamReport[]>([]);
  const [contractorReports, setContractorReports] = useState<ContractorReport[]>([]);
  const [inventoryReport, setInventoryReport] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) {
      fetchSawMills();
      fetchReports();
    }
  }, [selectedCompany, dateRange]);

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
      .order("name");
    setSawMills(data || []);
  };

  const fetchReports = async () => {
    setLoading(true);
    await Promise.all([
      fetchMillReports(),
      fetchTeamReports(),
      fetchContractorReports(),
      fetchInventoryReport(),
    ]);
    setLoading(false);
  };

  const fetchMillReports = async () => {
    const { data: mills } = await supabase
      .from("saw_mills")
      .select("id, name")
      .eq("company_id", selectedCompany)
      .eq("is_active", true);

    if (!mills) return;

    const reports: MillReport[] = [];

    for (const mill of mills) {
      // Production entries
      const { data: prodData } = await supabase
        .from("sawmill_production_entries")
        .select("cft, total_amount")
        .eq("company_id", selectedCompany)
        .eq("saw_mill_id", mill.id)
        .gte("entry_date", dateRange.start)
        .lte("entry_date", dateRange.end);

      // Output entries
      const { data: outputData } = await supabase
        .from("sawmill_output_entries")
        .select("cft, output_type, weight")
        .eq("company_id", selectedCompany)
        .eq("saw_mill_id", mill.id)
        .gte("entry_date", dateRange.start)
        .lte("entry_date", dateRange.end);

      // Payments
      const { data: paymentData } = await supabase
        .from("sawmill_contractor_payments")
        .select("amount, contractor_id, sawmill_contractors!inner(saw_mill_id)")
        .eq("company_id", selectedCompany)
        .gte("payment_date", dateRange.start)
        .lte("payment_date", dateRange.end);

      const millPayments = paymentData?.filter((p: any) => p.sawmill_contractors?.saw_mill_id === mill.id) || [];

      const totalInput = prodData?.reduce((sum, e) => sum + Number(e.cft), 0) || 0;
      const totalOutput = outputData?.filter(o => !["firewood", "sawdust"].includes(o.output_type)).reduce((sum, e) => sum + Number(e.cft), 0) || 0;
      const mainMaterial = outputData?.filter(o => o.output_type === "main_material").reduce((sum, e) => sum + Number(e.cft), 0) || 0;
      const offSide = outputData?.filter(o => o.output_type === "off_side").reduce((sum, e) => sum + Number(e.cft), 0) || 0;
      const firewood = outputData?.filter(o => o.output_type === "firewood").reduce((sum, e) => sum + Number(e.weight || 0), 0) || 0;
      const sawdust = outputData?.filter(o => o.output_type === "sawdust").reduce((sum, e) => sum + Number(e.weight || 0), 0) || 0;
      const totalAmount = prodData?.reduce((sum, e) => sum + Number(e.total_amount), 0) || 0;
      const totalPaid = millPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);

      reports.push({
        mill_id: mill.id,
        mill_name: mill.name,
        total_input_cft: totalInput,
        total_output_cft: totalOutput,
        main_material_cft: mainMaterial,
        off_side_cft: offSide,
        firewood_kg: firewood,
        sawdust_kg: sawdust,
        total_production_amount: totalAmount,
        total_payments: totalPaid,
        efficiency: totalInput > 0 ? (totalOutput / totalInput) * 100 : 0,
      });
    }

    setMillReports(reports);
  };

  const fetchTeamReports = async () => {
    const { data: employees } = await supabase
      .from("sawmill_employees")
      .select("id, name, role, user_id")
      .eq("company_id", selectedCompany)
      .eq("is_active", true);

    if (!employees) return;

    const { data: assignments } = await supabase
      .from("sawmill_employee_assignments")
      .select("employee_id, saw_mill_id");

    const reports: TeamReport[] = [];

    for (const emp of employees) {
      const { data: prodData } = await supabase
        .from("sawmill_production_entries")
        .select("cft, total_amount")
        .eq("company_id", selectedCompany)
        .eq("created_by", emp.user_id)
        .gte("entry_date", dateRange.start)
        .lte("entry_date", dateRange.end);

      const empAssigns = assignments?.filter(a => a.employee_id === emp.id) || [];
      const millNames = empAssigns.map(a => sawMills.find(m => m.id === a.saw_mill_id)?.name).filter(Boolean);

      reports.push({
        employee_id: emp.id,
        employee_name: emp.name,
        role: emp.role,
        entries_count: prodData?.length || 0,
        total_cft: prodData?.reduce((sum, e) => sum + Number(e.cft), 0) || 0,
        total_amount: prodData?.reduce((sum, e) => sum + Number(e.total_amount), 0) || 0,
        assigned_mills: millNames.length > 0 ? millNames as string[] : ["All Mills"],
      });
    }

    setTeamReports(reports.filter(r => r.entries_count > 0 || r.total_cft > 0));
  };

  const fetchContractorReports = async () => {
    const { data: contractors } = await supabase
      .from("sawmill_contractors")
      .select("id, name, current_balance")
      .eq("company_id", selectedCompany)
      .eq("is_active", true);

    if (!contractors) return;

    const reports: ContractorReport[] = [];

    for (const contractor of contractors) {
      const { data: prodData } = await supabase
        .from("sawmill_production_entries")
        .select("cft, total_amount")
        .eq("company_id", selectedCompany)
        .eq("contractor_id", contractor.id)
        .gte("entry_date", dateRange.start)
        .lte("entry_date", dateRange.end);

      const { data: paymentData } = await supabase
        .from("sawmill_contractor_payments")
        .select("amount")
        .eq("company_id", selectedCompany)
        .eq("contractor_id", contractor.id)
        .gte("payment_date", dateRange.start)
        .lte("payment_date", dateRange.end);

      reports.push({
        contractor_id: contractor.id,
        contractor_name: contractor.name,
        total_cft: prodData?.reduce((sum, e) => sum + Number(e.cft), 0) || 0,
        total_amount: prodData?.reduce((sum, e) => sum + Number(e.total_amount), 0) || 0,
        payments_made: paymentData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
        current_balance: contractor.current_balance,
        entries_count: prodData?.length || 0,
      });
    }

    setContractorReports(reports.filter(r => r.entries_count > 0 || r.current_balance > 0));
  };

  const fetchInventoryReport = async () => {
    // Get opening stock (production before date range)
    const { data: openingProdData } = await supabase
      .from("sawmill_output_entries")
      .select("output_type, size, cft, weight, quantity")
      .eq("company_id", selectedCompany)
      .lt("entry_date", dateRange.start);

    // Get production during date range
    const { data: productionData } = await supabase
      .from("sawmill_output_entries")
      .select("output_type, size, cft, weight, quantity")
      .eq("company_id", selectedCompany)
      .gte("entry_date", dateRange.start)
      .lte("entry_date", dateRange.end);

    // Get sales vouchers during date range (this would be sales of finished goods)
    const { data: salesVouchers } = await supabase
      .from("vouchers")
      .select("id")
      .eq("company_id", selectedCompany)
      .eq("voucher_type", "sales")
      .gte("voucher_date", dateRange.start)
      .lte("voucher_date", dateRange.end);

    const salesVoucherIds = salesVouchers?.map(v => v.id) || [];
    
    let salesEntries: any[] = [];
    if (salesVoucherIds.length > 0) {
      const { data } = await supabase
        .from("voucher_entries")
        .select("quantity, stock_item_id, stock_items(name)")
        .in("voucher_id", salesVoucherIds);
      salesEntries = data || [];
    }

    // Group by output type and size
    const inventoryMap: Record<string, InventoryItem> = {};

    // Process opening stock
    openingProdData?.forEach(entry => {
      const key = `${entry.output_type}-${entry.size || 'default'}`;
      const isWeight = ["firewood", "sawdust"].includes(entry.output_type);
      const qty = isWeight ? Number(entry.weight || 0) : Number(entry.cft || 0);
      
      if (!inventoryMap[key]) {
        inventoryMap[key] = {
          output_type: entry.output_type,
          size: entry.size || "-",
          opening_stock: 0,
          production_qty: 0,
          sales_qty: 0,
          closing_stock: 0,
          unit: isWeight ? "Kg" : "CFT",
        };
      }
      inventoryMap[key].opening_stock += qty;
    });

    // Process production during period
    productionData?.forEach(entry => {
      const key = `${entry.output_type}-${entry.size || 'default'}`;
      const isWeight = ["firewood", "sawdust"].includes(entry.output_type);
      const qty = isWeight ? Number(entry.weight || 0) : Number(entry.cft || 0);
      
      if (!inventoryMap[key]) {
        inventoryMap[key] = {
          output_type: entry.output_type,
          size: entry.size || "-",
          opening_stock: 0,
          production_qty: 0,
          sales_qty: 0,
          closing_stock: 0,
          unit: isWeight ? "Kg" : "CFT",
        };
      }
      inventoryMap[key].production_qty += qty;
    });

    // Process sales (simplified - matching by item name if available)
    salesEntries?.forEach(entry => {
      const itemName = (entry.stock_items as any)?.name?.toLowerCase() || "";
      const qty = Number(entry.quantity || 0);
      
      // Try to match sales to inventory types
      Object.keys(inventoryMap).forEach(key => {
        const item = inventoryMap[key];
        if (itemName.includes(item.output_type.replace("_", " ")) || 
            itemName.includes(item.size.toLowerCase())) {
          item.sales_qty += qty;
        }
      });
    });

    // Calculate closing stock
    Object.values(inventoryMap).forEach(item => {
      item.closing_stock = item.opening_stock + item.production_qty - item.sales_qty;
    });

    setInventoryReport(Object.values(inventoryMap).sort((a, b) => a.output_type.localeCompare(b.output_type)));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async () => {
    if (!printRef.current) return;
    
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`sawmill-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast({ title: "Success", description: "Report exported successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export PDF", variant: "destructive" });
    }
  };

  if (loading && millReports.length === 0) {
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
          <h1 className="text-2xl font-bold text-foreground">Sawmill Reports</h1>
          <p className="text-muted-foreground">Mill-wise, Team-wise & Contractor-wise reports</p>
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
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-[160px]"
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-[160px]"
              />
            </div>
            <Button variant="secondary" onClick={fetchReports} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <div ref={printRef}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="mill" className="flex items-center gap-2">
              <Factory className="h-4 w-4" /> Mill-wise
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Team-wise
            </TabsTrigger>
            <TabsTrigger value="contractor" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Contractor-wise
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Inventory
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mill" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-5 w-5" />
                  Mill-wise Summary ({format(new Date(dateRange.start), "dd MMM")} - {format(new Date(dateRange.end), "dd MMM yyyy")})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {millReports.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No data found for selected period</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mill Name</TableHead>
                          <TableHead className="text-right">Input CFT</TableHead>
                          <TableHead className="text-right">Main Material</TableHead>
                          <TableHead className="text-right">Off-Side</TableHead>
                          <TableHead className="text-right">Firewood (kg)</TableHead>
                          <TableHead className="text-right">Sawdust (kg)</TableHead>
                          <TableHead className="text-right">Efficiency</TableHead>
                          <TableHead className="text-right">Production Amt</TableHead>
                          <TableHead className="text-right">Payments</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {millReports.map((report) => (
                          <TableRow key={report.mill_id}>
                            <TableCell className="font-medium">{report.mill_name}</TableCell>
                            <TableCell className="text-right">{report.total_input_cft.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{report.main_material_cft.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{report.off_side_cft.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{report.firewood_kg.toFixed(1)}</TableCell>
                            <TableCell className="text-right">{report.sawdust_kg.toFixed(1)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={report.efficiency > 60 ? "default" : "secondary"}>
                                {report.efficiency.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(report.total_production_amount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(report.total_payments)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right">{millReports.reduce((s, r) => s + r.total_input_cft, 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{millReports.reduce((s, r) => s + r.main_material_cft, 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{millReports.reduce((s, r) => s + r.off_side_cft, 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{millReports.reduce((s, r) => s + r.firewood_kg, 0).toFixed(1)}</TableCell>
                          <TableCell className="text-right">{millReports.reduce((s, r) => s + r.sawdust_kg, 0).toFixed(1)}</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right">{formatCurrency(millReports.reduce((s, r) => s + r.total_production_amount, 0))}</TableCell>
                          <TableCell className="text-right">{formatCurrency(millReports.reduce((s, r) => s + r.total_payments, 0))}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team-wise Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamReports.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No team data found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team Member</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Assigned Mills</TableHead>
                          <TableHead className="text-right">Entries</TableHead>
                          <TableHead className="text-right">Total CFT</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamReports.map((report) => (
                          <TableRow key={report.employee_id}>
                            <TableCell className="font-medium">{report.employee_name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{report.role}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{report.assigned_mills.join(", ")}</TableCell>
                            <TableCell className="text-right">{report.entries_count}</TableCell>
                            <TableCell className="text-right">{report.total_cft.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(report.total_amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contractor" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Contractor-wise Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contractorReports.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No contractor data found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contractor</TableHead>
                          <TableHead className="text-right">Entries</TableHead>
                          <TableHead className="text-right">Total CFT</TableHead>
                          <TableHead className="text-right">Production Amount</TableHead>
                          <TableHead className="text-right">Payments Made</TableHead>
                          <TableHead className="text-right">Current Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contractorReports.map((report) => (
                          <TableRow key={report.contractor_id}>
                            <TableCell className="font-medium">{report.contractor_name}</TableCell>
                            <TableCell className="text-right">{report.entries_count}</TableCell>
                            <TableCell className="text-right">{report.total_cft.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(report.total_amount)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(report.payments_made)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={report.current_balance > 0 ? "destructive" : "secondary"}>
                                {formatCurrency(report.current_balance)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right">{contractorReports.reduce((s, r) => s + r.entries_count, 0)}</TableCell>
                          <TableCell className="text-right">{contractorReports.reduce((s, r) => s + r.total_cft, 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(contractorReports.reduce((s, r) => s + r.total_amount, 0))}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(contractorReports.reduce((s, r) => s + r.payments_made, 0))}</TableCell>
                          <TableCell className="text-right">{formatCurrency(contractorReports.reduce((s, r) => s + r.current_balance, 0))}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="mt-4 space-y-6">
            {/* Size-wise Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(() => {
                const sizeGroups = inventoryReport
                  .filter(i => i.unit === "CFT")
                  .reduce((acc, item) => {
                    const size = item.size || "Unspecified";
                    if (!acc[size]) acc[size] = { size, closing_stock: 0, production_qty: 0 };
                    acc[size].closing_stock += item.closing_stock;
                    acc[size].production_qty += item.production_qty;
                    return acc;
                  }, {} as Record<string, { size: string; closing_stock: number; production_qty: number }>);
                
                return Object.values(sizeGroups).map((group, idx) => (
                  <Card key={idx} className="border-l-4 border-l-primary">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground uppercase">Size: {group.size}</p>
                      <p className="text-2xl font-bold">{group.closing_stock.toFixed(2)} <span className="text-sm text-muted-foreground">CFT</span></p>
                      <p className="text-xs text-green-600">+{group.production_qty.toFixed(2)} produced</p>
                    </CardContent>
                  </Card>
                ));
              })()}
            </div>

            {/* Size-wise Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Size-wise Inventory Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inventoryReport.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No inventory data found</p>
                ) : (
                  <div className="space-y-6">
                    {/* Group by Size */}
                    {(() => {
                      const groupedBySize = inventoryReport.reduce((acc, item) => {
                        const size = item.size || "Unspecified";
                        if (!acc[size]) acc[size] = [];
                        acc[size].push(item);
                        return acc;
                      }, {} as Record<string, InventoryItem[]>);

                      return Object.entries(groupedBySize).map(([size, items], idx) => (
                        <div key={idx} className="border rounded-lg overflow-hidden">
                          <div className="bg-muted/50 px-4 py-2 border-b flex justify-between items-center">
                            <h4 className="font-semibold">Size: {size}</h4>
                            <Badge variant="outline">
                              Total: {items.reduce((s, i) => s + i.closing_stock, 0).toFixed(2)} {items[0]?.unit || "CFT"}
                            </Badge>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product Type</TableHead>
                                <TableHead className="text-right">Opening</TableHead>
                                <TableHead className="text-right text-green-600">+ Production</TableHead>
                                <TableHead className="text-right text-red-600">- Sales</TableHead>
                                <TableHead className="text-right">Closing</TableHead>
                                <TableHead>Unit</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((item, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium capitalize">{item.output_type.replace("_", " ")}</TableCell>
                                  <TableCell className="text-right">{item.opening_stock.toFixed(2)}</TableCell>
                                  <TableCell className="text-right text-green-600">+{item.production_qty.toFixed(2)}</TableCell>
                                  <TableCell className="text-right text-red-600">-{item.sales_qty.toFixed(2)}</TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant={item.closing_stock > 0 ? "default" : "secondary"}>
                                      {item.closing_stock.toFixed(2)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{item.unit}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ));
                    })()}

                    {/* Summary Totals */}
                    <Card className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Summary Totals</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">CFT Items - Opening</p>
                            <p className="text-xl font-bold">{inventoryReport.filter(i => i.unit === "CFT").reduce((s, r) => s + r.opening_stock, 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">CFT Items - Production</p>
                            <p className="text-xl font-bold text-green-600">+{inventoryReport.filter(i => i.unit === "CFT").reduce((s, r) => s + r.production_qty, 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">CFT Items - Sales</p>
                            <p className="text-xl font-bold text-red-600">-{inventoryReport.filter(i => i.unit === "CFT").reduce((s, r) => s + r.sales_qty, 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">CFT Items - Closing</p>
                            <p className="text-xl font-bold">{inventoryReport.filter(i => i.unit === "CFT").reduce((s, r) => s + r.closing_stock, 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Weight Items - Opening</p>
                            <p className="text-xl font-bold">{inventoryReport.filter(i => i.unit === "Kg").reduce((s, r) => s + r.opening_stock, 0).toFixed(2)} Kg</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Weight Items - Production</p>
                            <p className="text-xl font-bold text-green-600">+{inventoryReport.filter(i => i.unit === "Kg").reduce((s, r) => s + r.production_qty, 0).toFixed(2)} Kg</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Weight Items - Sales</p>
                            <p className="text-xl font-bold text-red-600">-{inventoryReport.filter(i => i.unit === "Kg").reduce((s, r) => s + r.sales_qty, 0).toFixed(2)} Kg</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Weight Items - Closing</p>
                            <p className="text-xl font-bold">{inventoryReport.filter(i => i.unit === "Kg").reduce((s, r) => s + r.closing_stock, 0).toFixed(2)} Kg</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SawmillReports;