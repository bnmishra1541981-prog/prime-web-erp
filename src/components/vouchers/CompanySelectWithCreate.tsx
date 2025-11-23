import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useGstinLookup } from '@/hooks/useGstinLookup';
import { CURRENCY_OPTIONS } from '@/lib/currency';
import { INDIAN_STATES, getDistrictsByState, getCitiesByDistrict } from '@/lib/indianLocations';

interface Company {
  id: string;
  name: string;
}

interface CompanySelectWithCreateProps {
  value: string;
  onValueChange: (value: string) => void;
  onCompanyCreated?: () => void;
  ledgerGroupId?: string;
}

export const CompanySelectWithCreate = ({ value, onValueChange, onCompanyCreated, ledgerGroupId }: CompanySelectWithCreateProps) => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');
    if (data) setCompanies(data);
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
        email: prev.email,
        phone: prev.phone,
        financial_year_start: prev.financial_year_start,
        currency: prev.currency,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast.error('You must be logged in');
      return;
    }

    try {
      const companyData = {
        name: formData.name || formData.trade_name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        gstin: formData.gstin || null,
        financial_year_start: formData.financial_year_start || null,
        currency: formData.currency || 'INR',
        legal_name: formData.legal_name || null,
        trade_name: formData.trade_name || null,
        registration_date: formData.registration_date || null,
        business_nature: formData.business_nature || null,
        taxpayer_type: formData.taxpayer_type || null,
        constitution_of_business: formData.constitution_of_business || null,
        state_jurisdiction: formData.state_jurisdiction || null,
        gstn_status: formData.gstn_status || null,
        state: formData.state || null,
        building_name: formData.building_name || null,
        building_no: formData.building_no || null,
        floor_no: formData.floor_no || null,
        street: formData.street || null,
        locality: formData.locality || null,
        city: formData.city || null,
        district: formData.district || null,
        pincode: formData.pincode || null,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('companies')
        .insert([companyData])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Company created successfully');
      setIsDialogOpen(false);
      resetForm();
      await fetchCompanies();
      onValueChange(data.id);
      onCompanyCreated?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create company');
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
  };

  return (
    <>
      <Select 
        value={value} 
        onValueChange={(val) => {
          if (val === 'create_new') {
            setIsDialogOpen(true);
          } else {
            onValueChange(val);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select company" />
        </SelectTrigger>
        <SelectContent>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
          <SelectItem value="create_new" className="text-primary font-semibold">
            + Create New Company
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
            <DialogDescription>Enter the company details below</DialogDescription>
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
                    {gstinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-2" />Fetch</>}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Trade Name *</Label>
                <Input
                  value={formData.trade_name || formData.name}
                  onChange={(e) => setFormData({ ...formData, trade_name: e.target.value, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>State *</Label>
                <Select
                  value={formData.state}
                  onValueChange={(val) => setFormData({ ...formData, state: val, district: '', city: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state.name} value={state.name}>{state.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit">
                Create Company
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
