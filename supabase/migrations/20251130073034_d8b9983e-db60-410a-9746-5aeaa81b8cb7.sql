-- Add customer contact fields to sales_orders table
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

COMMENT ON COLUMN public.sales_orders.customer_email IS 'Customer email for dispatch notifications';
COMMENT ON COLUMN public.sales_orders.customer_phone IS 'Customer phone for SMS notifications';

-- Create dispatch_notifications table to track sent notifications
CREATE TABLE IF NOT EXISTS public.dispatch_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_entry_id UUID NOT NULL REFERENCES public.dispatch_entries(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'sms', 'both')),
  recipient_email TEXT,
  recipient_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dispatch_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing notifications
CREATE POLICY "Users can view dispatch notifications"
ON public.dispatch_notifications
FOR SELECT
USING (
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'dispatch'::app_role)
);

-- Create policy for inserting notifications
CREATE POLICY "Dispatch team can create notifications"
ON public.dispatch_notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'dispatch'::app_role)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_dispatch_notifications_dispatch_entry 
ON public.dispatch_notifications(dispatch_entry_id);

CREATE INDEX IF NOT EXISTS idx_dispatch_notifications_status 
ON public.dispatch_notifications(status);

-- Add trigger to update updated_at
CREATE TRIGGER update_dispatch_notifications_updated_at
  BEFORE UPDATE ON public.dispatch_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();