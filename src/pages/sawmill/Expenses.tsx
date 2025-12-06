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
import { Loader2, Receipt, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  description: string | null;
  amount: number;
  saw_mills?: { name: string } | null;
}

const EXPENSE_CATEGORIES = [
  "Fuel & Diesel",
  "Electricity",
  "Maintenance & Repairs",
  "Tools & Equipment",
  "Transportation",
  "Labor Charges",
  "Safety Equipment",
  "Office Expenses",
  "Miscellaneous",
];

const Expenses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [sawMills, setSawMills] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split("T")[0],
    saw_mill_id: "",
    category: "Miscellaneous",
    description: "",
    amount: "",
  });

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) {
      fetchSawMills();
      fetchExpenses();
    }
  }, [selectedCompany]);

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

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from("sawmill_expenses")
      .select("*, saw_mills(name)")
      .eq("company_id", selectedCompany)
      .order("expense_date", { ascending: false })
      .limit(50);
    setExpenses(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category || !formData.amount) {
      toast({ title: "Error", description: "Please fill category and amount", variant: "destructive" });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      toast({ title: "Error", description: "Amount must be greater than 0", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("sawmill_expenses").insert({
        company_id: selectedCompany,
        saw_mill_id: formData.saw_mill_id || null,
        expense_date: formData.expense_date,
        category: formData.category,
        description: formData.description || null,
        amount: amount,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Expense recorded successfully" });
      
      setFormData(prev => ({
        ...prev,
        description: "",
        amount: "",
      }));
      
      fetchExpenses();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Group by category for summary
  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

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
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-muted-foreground">Track miscellaneous expenses</p>
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

      {/* Category Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryTotals).map(([category, total]) => (
              <Badge key={category} variant="secondary" className="text-sm px-3 py-1">
                {category}: {formatCurrency(total)}
              </Badge>
            ))}
            <Badge variant="default" className="text-sm px-3 py-1">
              Total: {formatCurrency(totalExpenses)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="expense_date">Date</Label>
                <Input
                  id="expense_date"
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="saw_mill">Saw Mill</Label>
                <Select value={formData.saw_mill_id || "all"} onValueChange={(v) => setFormData({ ...formData, saw_mill_id: v === "all" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Mill (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Mills</SelectItem>
                    {sawMills.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Expense description..."
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Expense
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Expense History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No expenses recorded yet</p>
            ) : (
              <div className="overflow-x-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Mill</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{format(new Date(expense.expense_date), "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell>{expense.saw_mills?.name || "All"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {expense.description || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {formatCurrency(expense.amount)}
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

export default Expenses;
