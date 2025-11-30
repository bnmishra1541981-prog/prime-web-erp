import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { dispatchEntryId, orderDetails, customerEmail, customerPhone } = await req.json();

    console.log('Processing dispatch notification:', {
      dispatchEntryId,
      orderDetails,
      customerEmail,
      customerPhone
    });

    // Simulate email sending (replace with actual Resend integration later)
    let emailStatus = 'skipped';
    let emailError = null;
    
    if (customerEmail) {
      console.log(`[DUMMY] Would send email to: ${customerEmail}`);
      console.log(`[DUMMY] Email content: Order ${orderDetails.order_no} dispatched - ${orderDetails.dispatched_quantity} units`);
      emailStatus = 'sent';
      
      // Create notification log for email
      await supabaseClient.from('dispatch_notifications').insert({
        dispatch_entry_id: dispatchEntryId,
        notification_type: 'email',
        recipient_email: customerEmail,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    }

    // Simulate SMS sending (replace with actual Twilio integration later)
    let smsStatus = 'skipped';
    let smsError = null;
    
    if (customerPhone) {
      console.log(`[DUMMY] Would send SMS to: ${customerPhone}`);
      console.log(`[DUMMY] SMS content: Your order ${orderDetails.order_no} has been dispatched. ${orderDetails.dispatched_quantity} units on the way.`);
      smsStatus = 'sent';
      
      // Create notification log for SMS
      await supabaseClient.from('dispatch_notifications').insert({
        dispatch_entry_id: dispatchEntryId,
        notification_type: 'sms',
        recipient_phone: customerPhone,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        email: { status: emailStatus, error: emailError },
        sms: { status: smsStatus, error: smsError },
        message: 'Notifications processed (dummy mode)',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in send-dispatch-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
