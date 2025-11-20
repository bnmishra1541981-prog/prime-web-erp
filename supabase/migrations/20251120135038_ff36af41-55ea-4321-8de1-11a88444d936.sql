-- Add 'hold' and 'ignored' to notification_status enum
ALTER TYPE notification_status ADD VALUE IF NOT EXISTS 'hold';
ALTER TYPE notification_status ADD VALUE IF NOT EXISTS 'ignored';

-- Add trigger to send notification automatically when sales voucher is created  
CREATE OR REPLACE FUNCTION public.send_sales_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  party_email TEXT;
  company_name TEXT;
BEGIN
  -- Only trigger for sales vouchers
  IF NEW.voucher_type = 'sales' AND NEW.party_ledger_id IS NOT NULL THEN
    
    -- Get party ledger email
    SELECT email INTO party_email
    FROM ledgers
    WHERE id = NEW.party_ledger_id AND email IS NOT NULL;
    
    -- Get company name
    SELECT name INTO company_name
    FROM companies
    WHERE id = NEW.company_id;
    
    -- If party has email, create notification
    IF party_email IS NOT NULL THEN
      INSERT INTO voucher_notifications (
        voucher_id,
        from_company_id,
        to_user_email,
        message,
        status
      ) VALUES (
        NEW.id,
        NEW.company_id,
        party_email,
        'New sales invoice ' || NEW.voucher_number || ' from ' || company_name || ' for ₹' || NEW.total_amount::TEXT,
        'pending'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on vouchers table
DROP TRIGGER IF EXISTS on_sales_voucher_created ON vouchers;
CREATE TRIGGER on_sales_voucher_created
AFTER INSERT ON vouchers
FOR EACH ROW
EXECUTE FUNCTION public.send_sales_notification();