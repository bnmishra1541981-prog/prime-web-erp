
-- Add cbm column to store original CBM from Excel
ALTER TABLE sawmill_logs ADD COLUMN IF NOT EXISTS cbm numeric DEFAULT 0;
