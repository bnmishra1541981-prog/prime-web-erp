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
import { Plus, Trash2, Send } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type VoucherType = Database['public']['Enums']['voucher_type'];

interface VoucherEntry {
  ledger_id: string;
  debit_amount: string;
  credit_amount: string;
  narration: string;
}

interface VoucherFormProps {
  voucherType: VoucherType;
  onSuccess: () => void;
}

export const VoucherForm = ({ voucherType, onSuccess }: VoucherFormProps) => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [formData, setFormData] = useState({
    company_id: '',
    voucher_number: '',
    voucher_date: new Date().toISOString().split('T')[0],
    party_ledger_id: '',
    narration: '',
  });
  const [entries, setEntries] = useState<VoucherEntry[]>([
    { ledger_id: '', debit_amount: '0', credit_amount: '0', narration: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [notificationDialog, setNotificationDialog] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [lastVoucherId, setLastVoucherId] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [companiesRes, ledgersRes] = await Promise.all([
        supabase.from('companies').select('id, name').order('name'),
        supabase.from('ledgers').select('id, name, ledger_type').order('name'),
      ]);

      if (companiesRes.data) {
        setCompanies(companiesRes.data);
        if (companiesRes.data.length > 0) {
          setFormData(prev => ({ ...prev, company_id: companiesRes.data[0].id }));
        }
      }
      if (ledgersRes.data) setLedgers(ledgersRes.data);
    } catch (error: any) {
      toast.error('Failed to fetch data');
    }
  };

  const addEntry = () => {
    setEntries([...entries, { ledger_id: '', debit_amount: '0', credit_amount: '0', narration: '' }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof VoucherEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };

  const calculateTotal = () => {
    const debitTotal = entries.reduce((sum, entry) => sum + parseFloat(entry.debit_amount || '0'), 0);
    const creditTotal = entries.reduce((sum, entry) => sum + parseFloat(entry.credit_amount || '0'), 0);
    return { debitTotal, creditTotal };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { debitTotal, creditTotal } = calculateTotal();
      
      if (Math.abs(debitTotal - creditTotal) > 0.01) {
        toast.error('Debit and Credit totals must be equal');
        return;
      }

      const { data: voucherData, error: voucherError } = await supabase
        .from('vouchers')
        .insert([{
          ...formData,
          voucher_type: voucherType,
          total_amount: debitTotal,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (voucherError) throw voucherError;

      const entriesData = entries.map(entry => ({
        voucher_id: voucherData.id,
        ledger_id: entry.ledger_id,
        debit_amount: parseFloat(entry.debit_amount),
        credit_amount: parseFloat(entry.credit_amount),
        narration: entry.narration,
      }));

      const { error: entriesError } = await supabase
        .from('voucher_entries')
        .insert(entriesData);

      if (entriesError) throw entriesError;

      toast.success('Voucher created successfully');
      setLastVoucherId(voucherData.id);
      resetForm();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async () => {
    if (!notificationEmail || !lastVoucherId) {
      toast.error('Please enter recipient email');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-voucher-notification', {
        body: {
          voucher_id: lastVoucherId,
          to_user_email: notificationEmail,
          from_company_id: formData.company_id,
          message: notificationMessage || `New ${voucherType} voucher created for your review`,
        },
      });

      if (error) throw error;

      toast.success('Notification sent successfully!');
      setNotificationDialog(false);
      setNotificationEmail('');
      setNotificationMessage('');
      setLastVoucherId('');
    } catch (error: any) {
      toast.error('Failed to send notification');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      company_id: companies[0]?.id || '',
      voucher_number: '',
      voucher_date: new Date().toISOString().split('T')[0],
      party_ledger_id: '',
      narration: '',
    });
    setEntries([{ ledger_id: '', debit_amount: '0', credit_amount: '0', narration: '' }]);
  };

  const { debitTotal, creditTotal } = calculateTotal();

  return (
    <Card>
      <CardHeader>
        <CardTitle>New {voucherType.charAt(0).toUpperCase() + voucherType.slice(1)} Voucher</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_id">Company *</Label>
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
              <Label htmlFor="voucher_number">Voucher No. *</Label>
              <Input
                id="voucher_number"
                value={formData.voucher_number}
                onChange={(e) => setFormData({ ...formData, voucher_number: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucher_date">Date *</Label>
              <Input
                id="voucher_date"
                type="date"
                value={formData.voucher_date}
                onChange={(e) => setFormData({ ...formData, voucher_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="party_ledger_id">Party Ledger</Label>
              <Select value={formData.party_ledger_id} onValueChange={(value) => setFormData({ ...formData, party_ledger_id: value })}>
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

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Voucher Entries</Label>
              <Button type="button" size="sm" onClick={addEntry}>
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </div>

            {entries.map((entry, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label>Ledger *</Label>
                  <Select value={entry.ledger_id} onValueChange={(value) => updateEntry(index, 'ledger_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ledger" />
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
                <div className="space-y-2">
                  <Label>Debit</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={entry.debit_amount}
                    onChange={(e) => updateEntry(index, 'debit_amount', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Credit</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={entry.credit_amount}
                    onChange={(e) => updateEntry(index, 'credit_amount', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Narration</Label>
                  <Input
                    value={entry.narration}
                    onChange={(e) => updateEntry(index, 'narration', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEntry(index)}
                    disabled={entries.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-8 p-4 bg-muted rounded-lg">
              <div>
                <span className="font-semibold">Total Debit: </span>
                <span className={debitTotal !== creditTotal ? 'text-destructive' : ''}>
                  ₹{debitTotal.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="font-semibold">Total Credit: </span>
                <span className={debitTotal !== creditTotal ? 'text-destructive' : ''}>
                  ₹{creditTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="narration">Narration</Label>
            <Textarea
              id="narration"
              value={formData.narration}
              onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetForm}>
              Clear
            </Button>
            <Button type="submit" disabled={loading || Math.abs(debitTotal - creditTotal) > 0.01}>
              {loading ? 'Saving...' : 'Save Voucher'}
            </Button>
            
            {lastVoucherId && (
              <Dialog open={notificationDialog} onOpenChange={setNotificationDialog}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">
                    <Send className="h-4 w-4 mr-2" />
                    Send Notification
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send Voucher Notification</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="notif-email">Recipient Email</Label>
                      <Input
                        id="notif-email"
                        type="email"
                        placeholder="user@example.com"
                        value={notificationEmail}
                        onChange={(e) => setNotificationEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notif-message">Message (optional)</Label>
                      <Textarea
                        id="notif-message"
                        placeholder="Add a message for the recipient..."
                        value={notificationMessage}
                        onChange={(e) => setNotificationMessage(e.target.value)}
                      />
                    </div>
                    <Button onClick={sendNotification} className="w-full">
                      Send Notification
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
