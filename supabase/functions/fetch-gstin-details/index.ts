import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { gstin } = await req.json();

    if (!gstin || gstin.length !== 15) {
      return new Response(
        JSON.stringify({ error: 'Invalid GSTIN format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First check if company exists in database
    const { data: existingCompany, error: dbError } = await supabase
      .from('companies')
      .select('*')
      .eq('gstin', gstin)
      .single();

    if (existingCompany && !dbError) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          source: 'database',
          data: existingCompany 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return dummy data for now - API integration to be added later
    console.log('Returning dummy data for GSTIN:', gstin);
    
    // Extract state code from GSTIN (first 2 digits)
    const stateCode = gstin.substring(0, 2);
    const stateMap: Record<string, string> = {
      '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
      '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
      '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
      '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
      '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
      '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
      '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
      '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
      '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra', '29': 'Karnataka',
      '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala',
      '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar',
      '36': 'Telangana', '37': 'Andhra Pradesh'
    };
    
    const mappedData = {
      gstin: gstin,
      legal_name: `Demo Company (${gstin})`,
      trade_name: `Demo Trade Name`,
      name: `Demo Company`,
      registration_date: '2020-01-01',
      business_nature: 'Wholesale Business',
      taxpayer_type: 'Regular',
      constitution_of_business: 'Private Limited Company',
      state_jurisdiction: 'State Office',
      gstn_status: 'Active',
      state: stateMap[stateCode] || 'Unknown',
      address: '123 Demo Street, Demo Area',
      building_name: 'Demo Building',
      building_no: '123',
      floor_no: '1st Floor',
      street: 'Demo Street',
      locality: 'Demo Locality',
      city: 'Demo City',
      district: 'Demo District',
      pincode: '380001',
      gstin_state_code: stateCode,
      last_updated_date: new Date().toISOString().split('T')[0],
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        source: 'dummy',
        data: mappedData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-gstin-details:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
