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

    // If not in database, fetch from GSTN API
    // Using Masters India API as example - user needs to configure GSTIN_API_KEY secret
    const gstinApiKey = Deno.env.get('GSTIN_API_KEY');
    const gstinClientId = Deno.env.get('GSTIN_CLIENT_ID');
    
    if (!gstinApiKey || !gstinClientId) {
      return new Response(
        JSON.stringify({ 
          error: 'GSTIN API credentials not configured. Please add GSTIN_API_KEY and GSTIN_CLIENT_ID secrets.',
          configRequired: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Call GSTIN API with required headers
    console.log('Calling Masters India API for GSTIN:', gstin);
    const apiResponse = await fetch(`https://commonapi.mastersindia.co/commonapis/searchgstin?gstin=${gstin}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${gstinApiKey}`,
        'client_id': gstinClientId,
        'Content-Type': 'application/json',
      },
    });

    if (!apiResponse.ok) {
      throw new Error('Failed to fetch GSTIN details from API');
    }

    const apiData = await apiResponse.json();

    if (apiData.error) {
      return new Response(
        JSON.stringify({ error: 'GSTIN not found or invalid', details: apiData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Map API response to our database schema
    const gstData = apiData.data;
    const mappedData = {
      gstin: gstin,
      legal_name: gstData.lgnm || '',
      trade_name: gstData.tradeNam || '',
      name: gstData.tradeNam || gstData.lgnm || '',
      registration_date: gstData.rgdt ? new Date(gstData.rgdt.split('/').reverse().join('-')).toISOString().split('T')[0] : null,
      business_nature: gstData.nba?.[0] || '',
      taxpayer_type: gstData.dty || '',
      constitution_of_business: gstData.ctb || '',
      state_jurisdiction: gstData.stj || '',
      gstn_status: gstData.sts || '',
      state: gstData.pradr?.addr?.stcd || '',
      address: [
        gstData.pradr?.addr?.bno,
        gstData.pradr?.addr?.bnm,
        gstData.pradr?.addr?.flno,
        gstData.pradr?.addr?.st,
        gstData.pradr?.addr?.loc,
        gstData.pradr?.addr?.dst,
        gstData.pradr?.addr?.stcd,
      ].filter(Boolean).join(', '),
      building_name: gstData.pradr?.addr?.bnm || '',
      building_no: gstData.pradr?.addr?.bno || '',
      floor_no: gstData.pradr?.addr?.flno || '',
      street: gstData.pradr?.addr?.st || '',
      locality: gstData.pradr?.addr?.loc || '',
      city: gstData.pradr?.addr?.city || gstData.pradr?.addr?.loc || '',
      district: gstData.pradr?.addr?.dst || '',
      pincode: gstData.pradr?.addr?.pncd?.toString() || '',
      gstin_state_code: gstin.substring(0, 2),
      last_updated_date: gstData.lstupdt ? new Date(gstData.lstupdt.split('/').reverse().join('-')).toISOString().split('T')[0] : null,
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        source: 'api',
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
