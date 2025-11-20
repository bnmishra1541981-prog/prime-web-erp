import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, FileText } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';

type VoucherType = Database['public']['Enums']['voucher_type'];

interface InvoiceItem {
  stock_item_id: string;
  stock_item_name: string;
  hsn_code: string;
  unit: string;
  no_of_pcs: string;
  quantity: string;
  rate: string;
  amount: string;
  cgst_rate: string;
  cgst_amount: string;
  sgst_rate: string;
  sgst_amount: string;
  igst_rate: string;
  igst_amount: string;
  taxable_amount: string;
}

interface InvoiceVoucherFormProps {
  voucherType: VoucherType;
  onSuccess: () => void;
}

export const InvoiceVoucherForm = ({ voucherType, onSuccess }: InvoiceVoucherFormProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    company_id: '',
    voucher_number: '',
    voucher_date: new Date().toISOString().split('T')[0],
    reference_number: '', // PO No
    reference_date: new Date().toISOString().split('T')[0], // PO Date
    party_ledger_id: '',
    billing_address: '',
    shipping_address: '',
    payment_terms: '0',
    payment_mode: '',
    truck_number: '',
    transport_name: '',
    transport_gst: '',
    lr_number: '',
    delivery_place: '',
    place_of_supply: '',
    narration: '',
    tcs_rate: '0',
    tds_rate: '0',
    other_charges: '0',
  });
  
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      stock_item_id: '',
      stock_item_name: '',
      hsn_code: '',
      unit: '',
      no_of_pcs: '1',
      quantity: '1',
      rate: '0',
      amount: '0',
      cgst_rate: '0',
      cgst_amount: '0',
      sgst_rate: '0',
      sgst_amount: '0',
      igst_rate: '0',
      igst_amount: '0',
      taxable_amount: '0',
    },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [companiesRes, ledgersRes, stockItemsRes] = await Promise.all([
        supabase.from('companies').select('id, name').order('name'),
        supabase.from('ledgers').select('id, name, ledger_type, address, gstin, state').order('name'),
        supabase.from('stock_items').select('id, name, hsn_code, unit').eq('is_active', true).order('name'),
      ]);

      if (companiesRes.data) {
        setCompanies(companiesRes.data);
        if (companiesRes.data.length > 0) {
          setFormData(prev => ({ ...prev, company_id: companiesRes.data[0].id }));
        }
      }
      if (ledgersRes.data) setLedgers(ledgersRes.data);
      if (stockItemsRes.data) setStockItems(stockItemsRes.data);
    } catch (error: any) {
      toast.error('Failed to fetch data');
    }
  };

  const addItem = () => {
    setItems([...items, {
      stock_item_id: '',
      stock_item_name: '',
      hsn_code: '',
      unit: '',
      no_of_pcs: '1',
      quantity: '1',
      rate: '0',
      amount: '0',
      cgst_rate: '0',
      cgst_amount: '0',
      sgst_rate: '0',
      sgst_amount: '0',
      igst_rate: '0',
      igst_amount: '0',
      taxable_amount: '0',
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Auto-fill HSN code and unit when stock item is selected
    if (field === 'stock_item_id') {
      const selectedItem = stockItems.find(item => item.id === value);
      if (selectedItem) {
        newItems[index].stock_item_name = selectedItem.name;
        newItems[index].hsn_code = selectedItem.hsn_code || '';
        newItems[index].unit = selectedItem.unit || '';
      }
    }

    // Calculate amount when quantity or rate changes
    if (field === 'quantity' || field === 'rate' || field === 'no_of_pcs') {
      const qty = parseFloat(newItems[index].quantity || '0');
      const rate = parseFloat(newItems[index].rate || '0');
      const amount = qty * rate;
      newItems[index].amount = amount.toFixed(2);
      newItems[index].taxable_amount = amount.toFixed(2);

      // Calculate GST amounts
      const cgstRate = parseFloat(newItems[index].cgst_rate || '0');
      const sgstRate = parseFloat(newItems[index].sgst_rate || '0');
      const igstRate = parseFloat(newItems[index].igst_rate || '0');

      newItems[index].cgst_amount = ((amount * cgstRate) / 100).toFixed(2);
      newItems[index].sgst_amount = ((amount * sgstRate) / 100).toFixed(2);
      newItems[index].igst_amount = ((amount * igstRate) / 100).toFixed(2);
    }

    // Recalculate GST when rates change
    if (field === 'cgst_rate' || field === 'sgst_rate' || field === 'igst_rate') {
      const taxableAmount = parseFloat(newItems[index].taxable_amount || '0');
      const cgstRate = parseFloat(newItems[index].cgst_rate || '0');
      const sgstRate = parseFloat(newItems[index].sgst_rate || '0');
      const igstRate = parseFloat(newItems[index].igst_rate || '0');

      newItems[index].cgst_amount = ((taxableAmount * cgstRate) / 100).toFixed(2);
      newItems[index].sgst_amount = ((taxableAmount * sgstRate) / 100).toFixed(2);
      newItems[index].igst_amount = ((taxableAmount * igstRate) / 100).toFixed(2);
    }

    setItems(newItems);
  };

  const calculateTotals = () => {
    const basicAmount = items.reduce((sum, item) => sum + parseFloat(item.taxable_amount || '0'), 0);
    const cgstTotal = items.reduce((sum, item) => sum + parseFloat(item.cgst_amount || '0'), 0);
    const sgstTotal = items.reduce((sum, item) => sum + parseFloat(item.sgst_amount || '0'), 0);
    const igstTotal = items.reduce((sum, item) => sum + parseFloat(item.igst_amount || '0'), 0);
    const otherCharges = parseFloat(formData.other_charges || '0');
    
    const subtotal = basicAmount + cgstTotal + sgstTotal + igstTotal + otherCharges;
    
    const tcsRate = parseFloat(formData.tcs_rate || '0');
    const tdsRate = parseFloat(formData.tds_rate || '0');
    const tcsAmount = (subtotal * tcsRate) / 100;
    const tdsAmount = (subtotal * tdsRate) / 100;
    
    const beforeRoundOff = subtotal + tcsAmount - tdsAmount;
    const roundOff = Math.round(beforeRoundOff) - beforeRoundOff;
    const grandTotal = Math.round(beforeRoundOff);

    return {
      basicAmount,
      cgstTotal,
      sgstTotal,
      igstTotal,
      tcsAmount,
      tdsAmount,
      otherCharges,
      roundOff,
      grandTotal,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totals = calculateTotals();

      const { data: voucherData, error: voucherError } = await supabase
        .from('vouchers')
        .insert([{
          company_id: formData.company_id,
          voucher_number: formData.voucher_number,
          voucher_date: formData.voucher_date,
          reference_number: formData.reference_number,
          reference_date: formData.reference_date,
          party_ledger_id: formData.party_ledger_id || null,
          billing_address: formData.billing_address,
          shipping_address: formData.shipping_address,
          payment_terms: parseInt(formData.payment_terms),
          payment_mode: formData.payment_mode,
          truck_number: formData.truck_number,
          transport_name: formData.transport_name,
          transport_gst: formData.transport_gst,
          lr_number: formData.lr_number,
          delivery_place: formData.delivery_place,
          place_of_supply: formData.place_of_supply,
          narration: formData.narration,
          tcs_rate: parseFloat(formData.tcs_rate),
          tcs_amount: totals.tcsAmount,
          tds_rate: parseFloat(formData.tds_rate),
          tds_amount: totals.tdsAmount,
          other_charges: totals.otherCharges,
          round_off: totals.roundOff,
          basic_amount: totals.basicAmount,
          total_amount: totals.grandTotal,
          voucher_type: voucherType,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (voucherError) throw voucherError;

      // Create voucher entries for each item
      const entriesData = items.flatMap((item) => {
        const entries = [];
        
        // Main item entry
        if (item.stock_item_id) {
          entries.push({
            voucher_id: voucherData.id,
            ledger_id: formData.party_ledger_id,
            stock_item_id: item.stock_item_id,
            quantity: parseFloat(item.quantity),
            rate: parseFloat(item.rate),
            amount: parseFloat(item.amount),
            taxable_amount: parseFloat(item.taxable_amount),
            cgst_rate: parseFloat(item.cgst_rate),
            cgst_amount: parseFloat(item.cgst_amount),
            sgst_rate: parseFloat(item.sgst_rate),
            sgst_amount: parseFloat(item.sgst_amount),
            igst_rate: parseFloat(item.igst_rate),
            igst_amount: parseFloat(item.igst_amount),
            debit_amount: voucherType === 'sales' ? parseFloat(item.amount) : 0,
            credit_amount: voucherType === 'purchase' ? parseFloat(item.amount) : 0,
          });
        }
        
        return entries;
      });

      if (entriesData.length > 0) {
        const { error: entriesError } = await supabase
          .from('voucher_entries')
          .insert(entriesData);

        if (entriesError) throw entriesError;
      }

      toast.success('Invoice created successfully');
      
      // Navigate to invoice view
      navigate(`/invoice/${voucherData.id}`);
      
      resetForm();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      company_id: companies[0]?.id || '',
      voucher_number: '',
      voucher_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      reference_date: new Date().toISOString().split('T')[0],
      party_ledger_id: '',
      billing_address: '',
      shipping_address: '',
      payment_terms: '0',
      payment_mode: '',
      truck_number: '',
      transport_name: '',
      transport_gst: '',
      lr_number: '',
      delivery_place: '',
      place_of_supply: '',
      narration: '',
      tcs_rate: '0',
      tds_rate: '0',
      other_charges: '0',
    });
    setItems([{
      stock_item_id: '',
      stock_item_name: '',
      hsn_code: '',
      unit: '',
      no_of_pcs: '1',
      quantity: '1',
      rate: '0',
      amount: '0',
      cgst_rate: '0',
      cgst_amount: '0',
      sgst_rate: '0',
      sgst_amount: '0',
      igst_rate: '0',
      igst_amount: '0',
      taxable_amount: '0',
    }]);
  };

  const totals = calculateTotals();

  return (
    <Card>
      <CardHeader>
        <CardTitle>New {voucherType === 'sales' ? 'Sales' : 'Purchase'} Invoice</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Company *</Label>
              <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Invoice No. *</Label>
              <Input
                value={formData.voucher_number}
                onChange={(e) => setFormData({ ...formData, voucher_number: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Date *</Label>
              <Input
                type="date"
                value={formData.voucher_date}
                onChange={(e) => setFormData({ ...formData, voucher_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Party *</Label>
              <Select value={formData.party_ledger_id} onValueChange={(value) => {
                setFormData({ ...formData, party_ledger_id: value });
                const party = ledgers.find((l: any) => l.id === value);
                if (party) {
                  setFormData(prev => ({
                    ...prev,
                    party_ledger_id: value,
                    billing_address: (party as any).address || '',
                    place_of_supply: (party as any).state || '',
                  }));
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select party" />
                </SelectTrigger>
                <SelectContent>
                  {ledgers.map((ledger: any) => (
                    <SelectItem key={ledger.id} value={ledger.id}>
                      {ledger.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* PO and Payment Details */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>PO No.</Label>
              <Input
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>PO Date</Label>
              <Input
                type="date"
                value={formData.reference_date}
                onChange={(e) => setFormData({ ...formData, reference_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Terms (Days)</Label>
              <Input
                type="number"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={formData.payment_mode} onValueChange={(value) => setFormData({ ...formData, payment_mode: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="NEFT">NEFT</SelectItem>
                  <SelectItem value="RTGS">RTGS</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Transport Details */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Truck No.</Label>
              <Input
                value={formData.truck_number}
                onChange={(e) => setFormData({ ...formData, truck_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Transport Name</Label>
              <Input
                value={formData.transport_name}
                onChange={(e) => setFormData({ ...formData, transport_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Transport GST</Label>
              <Input
                value={formData.transport_gst}
                onChange={(e) => setFormData({ ...formData, transport_gst: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>LR No.</Label>
              <Input
                value={formData.lr_number}
                onChange={(e) => setFormData({ ...formData, lr_number: e.target.value })}
              />
            </div>
          </div>

          {/* Address Details */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Bill To Address</Label>
              <Textarea
                value={formData.billing_address}
                onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Ship To Address</Label>
              <Textarea
                value={formData.shipping_address}
                onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery Place</Label>
              <Input
                value={formData.delivery_place}
                onChange={(e) => setFormData({ ...formData, delivery_place: e.target.value })}
              />
              <Label>Place of Supply</Label>
              <Input
                value={formData.place_of_supply}
                onChange={(e) => setFormData({ ...formData, place_of_supply: e.target.value })}
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">Items</Label>
              <Button type="button" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left text-xs">Sr.</th>
                    <th className="p-2 text-left text-xs">Item Name *</th>
                    <th className="p-2 text-left text-xs">HSN Code</th>
                    <th className="p-2 text-left text-xs">UoM</th>
                    <th className="p-2 text-left text-xs">No. of Pcs</th>
                    <th className="p-2 text-left text-xs">Qty</th>
                    <th className="p-2 text-left text-xs">Rate</th>
                    <th className="p-2 text-left text-xs">Amount</th>
                    <th className="p-2 text-left text-xs">CGST %</th>
                    <th className="p-2 text-left text-xs">CGST ₹</th>
                    <th className="p-2 text-left text-xs">SGST %</th>
                    <th className="p-2 text-left text-xs">SGST ₹</th>
                    <th className="p-2 text-left text-xs">IGST %</th>
                    <th className="p-2 text-left text-xs">IGST ₹</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2">
                        <Select value={item.stock_item_id} onValueChange={(value) => updateItem(index, 'stock_item_id', value)}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {stockItems.map((stock: any) => (
                              <SelectItem key={stock.id} value={stock.id}>
                                {stock.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input className="w-24" value={item.hsn_code} onChange={(e) => updateItem(index, 'hsn_code', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input className="w-20" value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input className="w-20" type="number" value={item.no_of_pcs} onChange={(e) => updateItem(index, 'no_of_pcs', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input className="w-20" type="number" step="0.01" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input className="w-24" type="number" step="0.01" value={item.rate} onChange={(e) => updateItem(index, 'rate', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input className="w-24" value={item.amount} readOnly />
                      </td>
                      <td className="p-2">
                        <Input className="w-20" type="number" step="0.01" value={item.cgst_rate} onChange={(e) => updateItem(index, 'cgst_rate', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input className="w-24" value={item.cgst_amount} readOnly />
                      </td>
                      <td className="p-2">
                        <Input className="w-20" type="number" step="0.01" value={item.sgst_rate} onChange={(e) => updateItem(index, 'sgst_rate', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input className="w-24" value={item.sgst_amount} readOnly />
                      </td>
                      <td className="p-2">
                        <Input className="w-20" type="number" step="0.01" value={item.igst_rate} onChange={(e) => updateItem(index, 'igst_rate', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input className="w-24" value={item.igst_amount} readOnly />
                      </td>
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Narration</Label>
              <Textarea
                value={formData.narration}
                onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                rows={4}
              />
            </div>
            
            <div className="space-y-2 bg-muted p-4 rounded-lg">
              <div className="flex justify-between">
                <span>Basic Amount:</span>
                <span className="font-semibold">₹{totals.basicAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST:</span>
                <span className="font-semibold">₹{totals.cgstTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST:</span>
                <span className="font-semibold">₹{totals.sgstTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IGST:</span>
                <span className="font-semibold">₹{totals.igstTotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center gap-2 pt-2 border-t">
                <Label className="text-xs">Other Charges:</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="w-32"
                  value={formData.other_charges}
                  onChange={(e) => setFormData({ ...formData, other_charges: e.target.value })}
                />
              </div>

              <div className="flex justify-between items-center gap-2">
                <Label className="text-xs">TCS Rate (%):</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="w-32"
                  value={formData.tcs_rate}
                  onChange={(e) => setFormData({ ...formData, tcs_rate: e.target.value })}
                />
              </div>
              <div className="flex justify-between">
                <span>TCS Amount:</span>
                <span className="font-semibold">₹{totals.tcsAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center gap-2">
                <Label className="text-xs">TDS Rate (%):</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="w-32"
                  value={formData.tds_rate}
                  onChange={(e) => setFormData({ ...formData, tds_rate: e.target.value })}
                />
              </div>
              <div className="flex justify-between">
                <span>TDS Amount:</span>
                <span className="font-semibold text-destructive">-₹{totals.tdsAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between pt-2 border-t">
                <span>Round Off:</span>
                <span className="font-semibold">{totals.roundOff >= 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between pt-2 border-t text-lg">
                <span className="font-bold">Grand Total:</span>
                <span className="font-bold">₹{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetForm}>
              Clear
            </Button>
            <Button type="submit" disabled={loading}>
              <FileText className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save & View Invoice'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};