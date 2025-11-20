import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { voucher_id, to_user_email, from_company_id, message } = await req.json();

    console.log('Sending notification:', { voucher_id, to_user_email, from_company_id });

    // Create notification record
    const { data: notification, error: notifError } = await supabaseClient
      .from('voucher_notifications')
      .insert([{
        voucher_id,
        to_user_email,
        from_company_id,
        message,
        status: 'pending',
      }])
      .select()
      .single();

    if (notifError) {
      console.error('Error creating notification:', notifError);
      throw notifError;
    }

    console.log('Notification created:', notification.id);

    // Try to send email if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'ERP System <onboarding@resend.dev>',
            to: [to_user_email],
            subject: 'New Voucher Notification',
            html: `<p>${message}</p><p>Please log in to your ERP system to review and respond.</p>`,
          }),
        });

        const emailData = await emailResponse.json();
        
        // Log the email attempt
        await supabaseClient
          .from('notification_logs')
          .insert([{
            notification_id: notification.id,
            channel: 'email',
            status: emailResponse.ok ? 'sent' : 'failed',
            error_message: emailResponse.ok ? null : JSON.stringify(emailData),
          }]);

        console.log('Email sent:', emailResponse.ok);
      } catch (emailError: any) {
        console.error('Error sending email:', emailError);
        // Log failed email attempt
        await supabaseClient
          .from('notification_logs')
          .insert([{
            notification_id: notification.id,
            channel: 'email',
            status: 'failed',
            error_message: emailError?.message || 'Unknown error',
          }]);
      }
    } else {
      console.log('RESEND_API_KEY not configured, skipping email');
    }

    return new Response(JSON.stringify({ success: true, notification }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in send-voucher-notification:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
