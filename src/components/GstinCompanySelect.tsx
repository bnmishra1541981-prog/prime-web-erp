import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { useGstinLookup } from '@/hooks/useGstinLookup';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
  gstin: string | null;
  trade_name?: string | null;
}

interface GstinCompanySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

export const GstinCompanySelect = ({ 
  value, 
  onValueChange, 
  label = "Company",
  required = true 
}: GstinCompanySelectProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [gstinInput, setGstinInput] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const { fetchGstinDetails, loading } = useGstinLookup();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name, gstin, trade_name')
      .order('created_at', { ascending: false });

    if (data) {
      setCompanies(data);
    }
  };

  const handleGstinSearch = async () => {
    if (!gstinInput || gstinInput.length !== 15) {
      toast.error('Please enter a valid 15-digit GSTIN');
      return;
    }

    // First check if company exists in our database
    const existingCompany = companies.find(c => c.gstin === gstinInput);
    if (existingCompany) {
      onValueChange(existingCompany.id);
      setSearchMode(false);
      setGstinInput('');
      toast.success('Company found in database');
      return;
    }

    // If not found, fetch from GSTN API
    const gstinData = await fetchGstinDetails(gstinInput);
    
    if (gstinData) {
      // Company data fetched, but not saved yet
      toast.info('Company found. Please create this company first from the Companies page.');
      setSearchMode(false);
      setGstinInput('');
    }
  };

  const getCompanyDisplay = (company: Company) => {
    const name = company.trade_name || company.name;
    return company.gstin ? `${company.gstin} - ${name}` : name;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="company-select">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      
      {!searchMode ? (
        <div className="flex gap-2">
          <Select value={value} onValueChange={onValueChange} required={required}>
            <SelectTrigger id="company-select" className="flex-1">
              <SelectValue placeholder="Select company or search by GSTIN" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {getCompanyDisplay(company)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setSearchMode(true)}
            title="Search by GSTIN"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={gstinInput}
            onChange={(e) => setGstinInput(e.target.value.toUpperCase())}
            placeholder="Enter 15-digit GSTIN"
            maxLength={15}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleGstinSearch}
            disabled={loading || gstinInput.length !== 15}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Search'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearchMode(false);
              setGstinInput('');
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};
