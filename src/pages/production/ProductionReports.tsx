import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { BarChart3, Package, Settings, Calendar, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { ProductionReportPrint } from '@/components/reports/ProductionReportPrint';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface MachineProduction {
  machine_name: string;
  machine_code: string;
  total_quantity: number;
  entry_count: number;
  total_wastage: number;
}

interface SizeProduction {
  size: string;
  total_quantity: number;
  entry_count: number;
  order_count: number;
}

interface OrderProduction {
  order_no: string;
  customer_name: string;
  product: string;
  ordered_quantity: number;
  produced_quantity: number;
  dispatched_quantity: number;
  balance_quantity: number;
}

const ProductionReports = () => {
  const printRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'machine' | 'size' | 'order'>('machine');
  const [dateFrom, setDateFrom] = useState(
    format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd')
  );
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  const [machineData, setMachineData] = useState<MachineProduction[]>([]);
  const [sizeData, setSizeData] = useState<SizeProduction[]>([]);
  const [orderData, setOrderData] = useState<OrderProduction[]>([]);

  useEffect(() => {
    fetchReports();
  }, [dateFrom, dateTo]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMachineReport(),
        fetchSizeReport(),
        fetchOrderReport(),
      ]);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchMachineReport = async () => {
    const { data, error } = await supabase
      .from('production_entries')
      .select(`
        produced_quantity,
        wastage,
        machines (name, machine_code)
      `)
      .gte('entry_date', dateFrom)
      .lte('entry_date', dateTo)
      .not('machine_id', 'is', null);

    if (error) throw error;

    // Group by machine
    const machineMap = new Map<string, MachineProduction>();
    data?.forEach((entry: any) => {
      if (entry.machines) {
        const key = `${entry.machines.name}-${entry.machines.machine_code}`;
        if (!machineMap.has(key)) {
          machineMap.set(key, {
            machine_name: entry.machines.name,
            machine_code: entry.machines.machine_code,
            total_quantity: 0,
            entry_count: 0,
            total_wastage: 0,
          });
        }
        const machine = machineMap.get(key)!;
        machine.total_quantity += Number(entry.produced_quantity);
        machine.total_wastage += Number(entry.wastage || 0);
        machine.entry_count += 1;
      }
    });

    setMachineData(Array.from(machineMap.values()));
  };

  const fetchSizeReport = async () => {
    const { data, error } = await supabase
      .from('production_entries')
      .select('produced_quantity, size, order_id')
      .gte('entry_date', dateFrom)
      .lte('entry_date', dateTo)
      .not('size', 'is', null);

    if (error) throw error;

    // Group by size
    const sizeMap = new Map<string, SizeProduction>();
    data?.forEach((entry: any) => {
      const size = entry.size || 'Not Specified';
      if (!sizeMap.has(size)) {
        sizeMap.set(size, {
          size,
          total_quantity: 0,
          entry_count: 0,
          order_count: new Set().size,
        });
      }
      const sizeData = sizeMap.get(size)!;
      sizeData.total_quantity += Number(entry.produced_quantity);
      sizeData.entry_count += 1;
    });

    setSizeData(Array.from(sizeMap.values()));
  };

  const fetchOrderReport = async () => {
    const { data: orders, error } = await supabase
      .from('sales_orders')
      .select('*')
      .order('order_no', { ascending: false });

    if (error) throw error;

    const orderReports: OrderProduction[] = [];

    for (const order of orders || []) {
      // Get production data
      const { data: productionData } = await supabase
        .from('production_entries')
        .select('produced_quantity')
        .eq('order_id', order.id)
        .gte('entry_date', dateFrom)
        .lte('entry_date', dateTo);

      // Get dispatch data
      const { data: dispatchData } = await supabase
        .from('dispatch_entries')
        .select('dispatched_quantity')
        .eq('order_id', order.id);

      const producedQty = productionData?.reduce(
        (sum, p) => sum + Number(p.produced_quantity),
        0
      ) || 0;

      const dispatchedQty = dispatchData?.reduce(
        (sum, d) => sum + Number(d.dispatched_quantity),
        0
      ) || 0;

      if (producedQty > 0) {
        orderReports.push({
          order_no: order.order_no,
          customer_name: order.customer_name,
          product: order.product,
          ordered_quantity: Number(order.ordered_quantity),
          produced_quantity: producedQty,
          dispatched_quantity: dispatchedQty,
          balance_quantity: Number(order.ordered_quantity) - producedQty - dispatchedQty,
        });
      }
    }

    setOrderData(orderReports);
  };

  const handleExport = async (type: 'machine' | 'size' | 'order') => {
    try {
      toast.loading(`Generating ${type} report PDF...`);
      
      if (!printRef.current) return;

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: type === 'order' ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = type === 'order' ? 280 : 190;
      const pageHeight = type === 'order' ? 190 : 277;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `production-report-${type}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);
      
      toast.dismiss();
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF');
    }
  };

  const handlePrint = () => {
    window.print();
    toast.success('Opening print dialog...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      {/* Hidden Print Component */}
      <div className="hidden">
        <ProductionReportPrint
          ref={printRef}
          reportType={activeTab}
          dateFrom={dateFrom}
          dateTo={dateTo}
          machineData={machineData}
          sizeData={sizeData}
          orderData={orderData}
        />
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Production Reports</h1>
            <p className="text-muted-foreground mt-1">
              Analyze production data by machine, size, and order
            </p>
          </div>
          <BarChart3 className="h-8 w-8 text-primary" />
        </div>

        {/* Date Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date Range Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={fetchReports} className="w-full">
                  Apply Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="machine">Machine-wise</TabsTrigger>
            <TabsTrigger value="size">Size-wise</TabsTrigger>
            <TabsTrigger value="order">Order-wise</TabsTrigger>
          </TabsList>

          {/* Machine-wise Report */}
          <TabsContent value="machine">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Machine-wise Production Summary
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrint}
                      className="no-print"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('machine')}
                      className="no-print"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {machineData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No production data found for the selected date range
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Machine Name</TableHead>
                        <TableHead>Machine Code</TableHead>
                        <TableHead className="text-right">Total Quantity</TableHead>
                        <TableHead className="text-right">Entries</TableHead>
                        <TableHead className="text-right">Total Wastage</TableHead>
                        <TableHead className="text-right">Efficiency %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {machineData.map((machine, idx) => {
                        const efficiency =
                          machine.total_quantity > 0
                            ? ((machine.total_quantity - machine.total_wastage) /
                                machine.total_quantity) *
                              100
                            : 0;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {machine.machine_name}
                            </TableCell>
                            <TableCell>{machine.machine_code}</TableCell>
                            <TableCell className="text-right">
                              {machine.total_quantity.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {machine.entry_count}
                            </TableCell>
                            <TableCell className="text-right">
                              {machine.total_wastage.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={
                                  efficiency >= 95
                                    ? 'text-green-600 font-semibold'
                                    : efficiency >= 90
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                                }
                              >
                                {efficiency.toFixed(2)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="font-bold bg-muted">
                        <TableCell colSpan={2}>Total</TableCell>
                        <TableCell className="text-right">
                          {machineData
                            .reduce((sum, m) => sum + m.total_quantity, 0)
                            .toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {machineData.reduce((sum, m) => sum + m.entry_count, 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {machineData
                            .reduce((sum, m) => sum + m.total_wastage, 0)
                            .toLocaleString()}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Size-wise Report */}
          <TabsContent value="size">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Size-wise Production Summary
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrint}
                      className="no-print"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('size')}
                      className="no-print"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {sizeData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No size data found for the selected date range
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Size/Dimension</TableHead>
                        <TableHead className="text-right">Total Quantity</TableHead>
                        <TableHead className="text-right">Number of Entries</TableHead>
                        <TableHead className="text-right">Avg per Entry</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sizeData.map((size, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{size.size}</TableCell>
                          <TableCell className="text-right">
                            {size.total_quantity.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {size.entry_count}
                          </TableCell>
                          <TableCell className="text-right">
                            {(size.total_quantity / size.entry_count).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">
                          {sizeData
                            .reduce((sum, s) => sum + s.total_quantity, 0)
                            .toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {sizeData.reduce((sum, s) => sum + s.entry_count, 0)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Order-wise Report */}
          <TabsContent value="order">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order-wise Production Summary
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrint}
                      className="no-print"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('order')}
                      className="no-print"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {orderData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No order data found for the selected date range
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order No</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Ordered</TableHead>
                          <TableHead className="text-right">Produced</TableHead>
                          <TableHead className="text-right">Dispatched</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead className="text-right">Completion %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderData.map((order, idx) => {
                          const completion =
                            (order.produced_quantity / order.ordered_quantity) * 100;
                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {order.order_no}
                              </TableCell>
                              <TableCell>{order.customer_name}</TableCell>
                              <TableCell>{order.product}</TableCell>
                              <TableCell className="text-right">
                                {order.ordered_quantity.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-blue-600 font-semibold">
                                {order.produced_quantity.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-green-600 font-semibold">
                                {order.dispatched_quantity.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-orange-600 font-semibold">
                                {order.balance_quantity.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={
                                    completion >= 100
                                      ? 'text-green-600 font-semibold'
                                      : completion >= 75
                                      ? 'text-blue-600'
                                      : completion >= 50
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                  }
                                >
                                  {completion.toFixed(1)}%
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="font-bold bg-muted">
                          <TableCell colSpan={3}>Total</TableCell>
                          <TableCell className="text-right">
                            {orderData
                              .reduce((sum, o) => sum + o.ordered_quantity, 0)
                              .toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {orderData
                              .reduce((sum, o) => sum + o.produced_quantity, 0)
                              .toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {orderData
                              .reduce((sum, o) => sum + o.dispatched_quantity, 0)
                              .toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {orderData
                              .reduce((sum, o) => sum + o.balance_quantity, 0)
                              .toLocaleString()}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
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

export default ProductionReports;
