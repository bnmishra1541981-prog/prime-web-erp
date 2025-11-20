-- Step 1: Enhance voucher_notifications table for complete workflow
ALTER TABLE voucher_notifications
ADD COLUMN IF NOT EXISTS approval_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
ADD COLUMN IF NOT EXISTS action_details JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;

-- Step 2: Create notification logs table for audit trail
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES voucher_notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'in_app')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_logs
CREATE POLICY "Users can view logs of their notifications"
ON notification_logs FOR SELECT
USING (
  notification_id IN (
    SELECT id FROM voucher_notifications 
    WHERE to_user_email IN (
      SELECT email FROM profiles WHERE id = auth.uid()
    )
    OR from_company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  )
);

-- Step 3: Create function to auto-create mirror voucher entry when accepted
CREATE OR REPLACE FUNCTION create_mirror_voucher_entry()
RETURNS TRIGGER AS $$
DECLARE
  original_voucher RECORD;
  mirror_voucher_id UUID;
  receiver_company_id UUID;
  entry RECORD;
BEGIN
  -- Only proceed if status changed to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    
    -- Get the original voucher details
    SELECT * INTO original_voucher 
    FROM vouchers 
    WHERE id = NEW.voucher_id;
    
    -- Find receiver's company (the company that matches the to_user_email)
    SELECT c.id INTO receiver_company_id
    FROM companies c
    JOIN profiles p ON c.user_id = p.id
    WHERE p.email = NEW.to_user_email
    LIMIT 1;
    
    IF receiver_company_id IS NULL THEN
      RAISE EXCEPTION 'No company found for user email: %', NEW.to_user_email;
    END IF;
    
    -- Create mirror voucher with swapped type
    INSERT INTO vouchers (
      voucher_number,
      voucher_date,
      company_id,
      party_ledger_id,
      total_amount,
      narration,
      created_by,
      voucher_type
    ) VALUES (
      'MIR-' || original_voucher.voucher_number,
      original_voucher.voucher_date,
      receiver_company_id,
      original_voucher.party_ledger_id,
      original_voucher.total_amount,
      COALESCE(original_voucher.narration, '') || ' [Auto-synced from ' || NEW.from_company_id || ']',
      (SELECT id FROM profiles WHERE email = NEW.to_user_email LIMIT 1),
      CASE 
        WHEN original_voucher.voucher_type = 'sales' THEN 'purchase'
        WHEN original_voucher.voucher_type = 'purchase' THEN 'sales'
        WHEN original_voucher.voucher_type = 'payment' THEN 'receipt'
        WHEN original_voucher.voucher_type = 'receipt' THEN 'payment'
        ELSE original_voucher.voucher_type
      END
    ) RETURNING id INTO mirror_voucher_id;
    
    -- Copy voucher entries with swapped debit/credit
    FOR entry IN 
      SELECT * FROM voucher_entries WHERE voucher_id = NEW.voucher_id
    LOOP
      INSERT INTO voucher_entries (
        voucher_id,
        ledger_id,
        debit_amount,
        credit_amount,
        narration
      ) VALUES (
        mirror_voucher_id,
        entry.ledger_id,
        entry.credit_amount,  -- Swap debit and credit
        entry.debit_amount,
        entry.narration
      );
    END LOOP;
    
    -- Store mirror voucher ID in action_details
    NEW.action_details = jsonb_set(
      COALESCE(NEW.action_details, '{}'::jsonb),
      '{mirror_voucher_id}',
      to_jsonb(mirror_voucher_id)
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_create_mirror_voucher ON voucher_notifications;
CREATE TRIGGER trigger_create_mirror_voucher
  BEFORE UPDATE ON voucher_notifications
  FOR EACH ROW
  EXECUTE FUNCTION create_mirror_voucher_entry();