import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface InventoryStats {
  totalProducts: number;
  lowStock: number;
  highStock: number;
  outOfStock: number;
  trendingProducts: Array<{ name: string; quantity: number }>;
  slowMoving: Array<{ name: string; quantity: number }>;
  fastMoving: Array<{ name: string; quantity: number }>;
}

export function InventoryAnalytics({ companyId }: { companyId: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InventoryStats>({
    totalProducts: 0,
    lowStock: 0,
    highStock: 0,
    outOfStock: 0,
    trendingProducts: [],
    slowMoving: [],
    fastMoving: [],
  });

  useEffect(() => {
    fetchInventoryStats();
  }, [companyId]);

  const fetchInventoryStats = async () => {
    try {
      setLoading(true);
      
      const { data: stockItems } = await supabase
        .from('stock_items')
        .select('id, name, current_balance, reorder_level')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (!stockItems) return;

      // Calculate stock statistics
      const totalProducts = stockItems.length;
      const outOfStock = stockItems.filter(item => Number(item.current_balance) === 0).length;
      const lowStock = stockItems.filter(
        item => Number(item.current_balance) > 0 && Number(item.current_balance) <= Number(item.reorder_level)
      ).length;
      const highStock = stockItems.filter(
        item => Number(item.current_balance) > Number(item.reorder_level) * 2
      ).length;

      // Get stock movement data from voucher entries
      const { data: entries } = await supabase
        .from('voucher_entries')
        .select(`
          stock_item_id,
          quantity,
          vouchers!inner(company_id, voucher_date, voucher_type)
        `)
        .eq('vouchers.company_id', companyId)
        .not('stock_item_id', 'is', null);

      // Calculate movement for each product
      const movementMap: Record<string, { quantity: number; name: string }> = {};
      
      entries?.forEach((entry: any) => {
        if (entry.stock_item_id && entry.vouchers?.voucher_type === 'sales') {
          const itemId = entry.stock_item_id;
          if (!movementMap[itemId]) {
            const item = stockItems.find(si => si.id === itemId);
            movementMap[itemId] = { quantity: 0, name: item?.name || '' };
          }
          movementMap[itemId].quantity += Number(entry.quantity || 0);
        }
      });

      const movements = Object.values(movementMap);
      const fastMoving = movements
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
      
      const slowMoving = movements
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 5);

      setStats({
        totalProducts,
        lowStock,
        highStock,
        outOfStock,
        trendingProducts: fastMoving.slice(0, 3),
        slowMoving: slowMoving.slice(0, 3),
        fastMoving: fastMoving.slice(0, 3),
      });
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="flex flex-row items-center justify-between hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Analytics
            </CardTitle>
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalProducts}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-warning">{stats.lowStock}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Out of Stock</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">{stats.outOfStock}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">High Stock</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">{stats.highStock}</div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2 lg:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Fast Moving</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.fastMoving.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="truncate">{item.name}</span>
                          <span className="font-medium">{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2 lg:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Slow Moving</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.slowMoving.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="truncate">{item.name}</span>
                          <span className="font-medium text-muted-foreground">{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Trending Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.trendingProducts.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="truncate">{item.name}</span>
                          <span className="font-medium text-success">{item.quantity} units</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
