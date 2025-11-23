-- Add ledger_type to companies table to categorize them
ALTER TABLE companies 
ADD COLUMN ledger_type public.ledger_type DEFAULT 'sundry_debtors';

-- Add comment to explain the column
COMMENT ON COLUMN companies.ledger_type IS 'Categorizes company under accounting groups for financial reports';