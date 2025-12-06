import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, Plus, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";

interface Contractor {
  id: string;
  name: string;
  current_balance: number;
}

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_mode: string | null;
  notes: string | null;
  sawmill_contractors?: { name: string } | null;
  vouchers?: { voucher_number: string } | null;
}

const PAYMENT_MODES = ["Cash", "Bank Transfer", "Cheque", "UPI", "Other"];

const ContractorPayments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);

  const [formData, setFormData] = useState({
    contractor_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    amount: "",
    payment_mode: "Cash",
    notes: "",
    create_voucher: true,
  });

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) {
      fetchContractors();
      fetchPayments();
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (formData.contractor_id) {
      const contractor = contractors.find(c => c.id === formData.contractor_id);
      setSelectedContractor(contractor || null);
    } else {
      setSelectedContractor(null);
    }
  }, [formData.contractor_id, contractors]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    if (data && data.length > 0) {
      setCompanies(data);
      setSelectedCompany(data[0].id);
    }
    setLoading(false);
  };

  const fetchContractors = async () => {
    const { data } = await supabase
      .from("sawmill_contractors")
      .select("id, name, current_balance")
      .eq("company_id", selectedCompany)
      .eq("is_active", true)
      .order("name");
    setContractors(data || []);
  };

  const fetchPayments = async () => {
    const { data } = await supabase
      .from("sawmill_contractor_payments")
      .select("*, sawmill_contractors(name), vouchers(voucher_number)")
      .eq("company_id", selectedCompany)
      .order("payment_date", { ascending: false })
      .limit(50);
    setPayments(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contractor_id || !formData.amount) {
      toast({ title: "Error", description: "Please select contractor and enter amount", variant: "destructive" });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      toast({ title: "Error", description: "Amount must be greater than 0", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let voucherId = null;

      // Create payment voucher if enabled
      if (formData.create_voucher) {
        // Get next voucher number
        const { data: lastVoucher } = await supabase
          .from("vouchers")
          .select("voucher_number")
          .eq("company_id", selectedCompany)
          .eq("voucher_type", "payment")
          .order("created_at", { ascending: false })
          .limit(1);

        let nextNumber = 1;
        if (lastVoucher && lastVoucher.length > 0) {
          const match = lastVoucher[0].voucher_number.match(/(\d+)$/);
          if (match) nextNumber = parseInt(match[1]) + 1;
        }

        const voucherNumber = `PAY/${format(new Date(formData.payment_date), "yy-MM")}/${String(nextNumber).padStart(4, "0")}`;

        const { data: voucher, error: voucherError } = await supabase
          .from("vouchers")
          .insert({
            company_id: selectedCompany,
            voucher_type: "payment",
            voucher_number: voucherNumber,
            voucher_date: formData.payment_date,
            total_amount: amount,
            narration: `Payment to contractor: ${selectedContractor?.name}. ${formData.notes || ""}`,
            created_by: user?.id,
          })
          .select("id")
          .single();

        if (voucherError) throw voucherError;
        voucherId = voucher.id;
      }

      // Create payment entry
      const { error: paymentError } = await supabase.from("sawmill_contractor_payments").insert({
        company_id: selectedCompany,
        contractor_id: formData.contractor_id,
        voucher_id: voucherId,
        payment_date: formData.payment_date,
        amount: amount,
        payment_mode: formData.payment_mode,
        notes: formData.notes || null,
        created_by: user?.id,
      });

      if (paymentError) throw paymentError;

      toast({ 
        title: "Success", 
        description: `Payment of ${formatCurrency(amount)} recorded. Contractor balance reduced.` 
      });
      
      setFormData(prev => ({
        ...prev,
        contractor_id: "",
        amount: "",
        notes: "",
      }));
      
      fetchContractors();
      fetchPayments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
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
          <h1 className="text-2xl font-bold text-foreground">Contractor Payments</h1>
          <p className="text-muted-foreground">Record payments to contractors</p>
        </div>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              New Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="contractor">Contractor *</Label>
                <Select value={formData.contractor_id} onValueChange={(v) => setFormData({ ...formData, contractor_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Contractor" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractors.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({formatCurrency(c.current_balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedContractor && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-xl font-bold text-destructive">
                    {formatCurrency(selectedContractor.current_balance)}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="payment_date">Payment Date</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="payment_mode">Payment Mode</Label>
                <Select value={formData.payment_mode} onValueChange={(v) => setFormData({ ...formData, payment_mode: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Payment notes..."
                  rows={2}
                />
              </div>

              {selectedContractor && formData.amount && (
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Balance After Payment</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(selectedContractor.current_balance - (parseFloat(formData.amount) || 0))}
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Payment History
            </CardTitle>
            <Badge variant="secondary" className="text-lg px-4">
              Total: {formatCurrency(totalPaid)}
            </Badge>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No payments recorded yet</p>
            ) : (
              <div className="overflow-x-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Contractor</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Voucher</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{format(new Date(payment.payment_date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="font-medium">
                          {payment.sawmill_contractors?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.payment_mode || "-"}</Badge>
                        </TableCell>
                        <TableCell>{payment.vouchers?.voucher_number || "-"}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContractorPayments;
