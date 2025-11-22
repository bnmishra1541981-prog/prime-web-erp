import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Building2, Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react';
import { CURRENCY_OPTIONS } from '@/lib/currency';
import { useGstinLookup } from '@/hooks/useGstinLookup';

interface Company {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  financial_year_start: string | null;
  currency: string | null;
}

const Companies = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const { fetchGstinDetails, loading: gstinLoading } = useGstinLookup();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    financial_year_start: '2024-04-01',
    currency: 'INR',
    legal_name: '',
    trade_name: '',
    registration_date: '',
    business_nature: '',
    taxpayer_type: '',
    constitution_of_business: '',
    state_jurisdiction: '',
    gstn_status: '',
    state: '',
    building_name: '',
    building_no: '',
    floor_no: '',
    street: '',
    locality: '',
    city: '',
    district: '',
    pincode: '',
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update(formData)
          .eq('id', editingCompany.id);

        if (error) throw error;
        toast.success('Company updated successfully');
      } else {
        const { error } = await supabase
          .from('companies')
          .insert([{ ...formData, user_id: user?.id }]);

        if (error) throw error;
        toast.success('Company created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company?')) return;

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Company deleted successfully');
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleGstinLookup = async () => {
    if (!formData.gstin || formData.gstin.length !== 15) {
      toast.error('Please enter a valid 15-digit GSTIN');
      return;
    }

    const gstinData = await fetchGstinDetails(formData.gstin);
    
    if (gstinData) {
      setFormData(prev => ({
        ...prev,
        ...gstinData,
        // Preserve user-entered values for fields not from GSTIN
        email: prev.email,
        phone: prev.phone,
        financial_year_start: prev.financial_year_start,
        currency: prev.currency,
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      gstin: '',
      financial_year_start: '2024-04-01',
      currency: 'INR',
      legal_name: '',
      trade_name: '',
      registration_date: '',
      business_nature: '',
      taxpayer_type: '',
      constitution_of_business: '',
      state_jurisdiction: '',
      gstn_status: '',
      state: '',
      building_name: '',
      building_no: '',
      floor_no: '',
      street: '',
      locality: '',
      city: '',
      district: '',
      pincode: '',
    });
    setEditingCompany(null);
  };

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      gstin: company.gstin || '',
      financial_year_start: company.financial_year_start || '2024-04-01',
      currency: company.currency || 'INR',
      legal_name: '',
      trade_name: '',
      registration_date: '',
      business_nature: '',
      taxpayer_type: '',
      constitution_of_business: '',
      state_jurisdiction: '',
      gstn_status: '',
      state: '',
      building_name: '',
      building_no: '',
      floor_no: '',
      street: '',
      locality: '',
      city: '',
      district: '',
      pincode: '',
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Companies</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage your company information</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCompany ? 'Edit Company' : 'Add New Company'}</DialogTitle>
              <DialogDescription>
                Enter the company details below
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="gstin">GSTIN *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="gstin"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                      required
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleGstinLookup}
                      disabled={gstinLoading || !formData.gstin || formData.gstin.length !== 15}
                    >
                      {gstinLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Fetch
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_name">Legal Name</Label>
                  <Input
                    id="legal_name"
                    value={formData.legal_name}
                    onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                    placeholder="Auto-filled from GSTIN"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trade_name">Trade Name *</Label>
                  <Input
                    id="trade_name"
                    value={formData.trade_name || formData.name}
                    onChange={(e) => setFormData({ ...formData, trade_name: e.target.value, name: e.target.value })}
                    required
                    placeholder="Auto-filled from GSTIN"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxpayer_type">Taxpayer Type</Label>
                  <Input
                    id="taxpayer_type"
                    value={formData.taxpayer_type}
                    onChange={(e) => setFormData({ ...formData, taxpayer_type: e.target.value })}
                    placeholder="Auto-filled from GSTIN"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="constitution_of_business">Constitution</Label>
                  <Input
                    id="constitution_of_business"
                    value={formData.constitution_of_business}
                    onChange={(e) => setFormData({ ...formData, constitution_of_business: e.target.value })}
                    placeholder="Auto-filled from GSTIN"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstn_status">GSTN Status</Label>
                  <Input
                    id="gstn_status"
                    value={formData.gstn_status}
                    onChange={(e) => setFormData({ ...formData, gstn_status: e.target.value })}
                    placeholder="Auto-filled from GSTIN"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registration_date">Registration Date</Label>
                  <Input
                    id="registration_date"
                    type="date"
                    value={formData.registration_date}
                    onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="address">Full Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Auto-filled from GSTIN"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="building_no">Building No</Label>
                  <Input
                    id="building_no"
                    value={formData.building_no}
                    onChange={(e) => setFormData({ ...formData, building_no: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="building_name">Building Name</Label>
                  <Input
                    id="building_name"
                    value={formData.building_name}
                    onChange={(e) => setFormData({ ...formData, building_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street">Street</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locality">Locality</Label>
                  <Input
                    id="locality"
                    value={formData.locality}
                    onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="financial_year_start">Financial Year Start</Label>
                  <Input
                    id="financial_year_start"
                    type="date"
                    value={formData.financial_year_start}
                    onChange={(e) => setFormData({ ...formData, financial_year_start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.name} ({currency.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCompany ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Company List</CardTitle>
          <CardDescription className="text-xs sm:text-sm">All registered companies in your account</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="text-center py-8 text-sm">Loading...</div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground px-4">
              <Building2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
              <p className="text-xs sm:text-sm">No companies found. Add your first company to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.gstin || '-'}</TableCell>
                    <TableCell>
                      {CURRENCY_OPTIONS.find(c => c.code === (company.currency || 'INR'))?.symbol || '₹'} {company.currency || 'INR'}
                    </TableCell>
                    <TableCell>{company.email || '-'}</TableCell>
                    <TableCell>{company.phone || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(company)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(company.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
  );
};

export default Companies;
