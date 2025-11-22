import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GstinData {
  gstin: string;
  legal_name?: string;
  trade_name?: string;
  name: string;
  registration_date?: string | null;
  business_nature?: string;
  taxpayer_type?: string;
  constitution_of_business?: string;
  state_jurisdiction?: string;
  gstn_status?: string;
  state?: string;
  address?: string;
  building_name?: string;
  building_no?: string;
  floor_no?: string;
  street?: string;
  locality?: string;
  city?: string;
  district?: string;
  pincode?: string;
  gstin_state_code?: string;
  last_updated_date?: string | null;
}

export const useGstinLookup = () => {
  const [loading, setLoading] = useState(false);

  const fetchGstinDetails = async (gstin: string): Promise<GstinData | null> => {
    if (!gstin || gstin.length !== 15) {
      toast.error('Invalid GSTIN format. Must be 15 characters.');
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-gstin-details', {
        body: { gstin },
      });

      if (error) throw error;

      if (data.error) {
        if (data.configRequired) {
          toast.error('GSTIN API not configured. Please contact administrator.');
        } else {
          toast.error(data.error);
        }
        return null;
      }

      if (data.success) {
        const sourceMsg = data.source === 'database' 
          ? 'Company data loaded from database' 
          : 'Company data fetched from GSTN';
        toast.success(sourceMsg);
        return data.data;
      }

      return null;
    } catch (error: any) {
      console.error('Error fetching GSTIN details:', error);
      toast.error('Failed to fetch GSTIN details');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { fetchGstinDetails, loading };
};
