-- Add additional fields for GSTN data to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS legal_name text,
ADD COLUMN IF NOT EXISTS trade_name text,
ADD COLUMN IF NOT EXISTS registration_date date,
ADD COLUMN IF NOT EXISTS business_nature text,
ADD COLUMN IF NOT EXISTS taxpayer_type text,
ADD COLUMN IF NOT EXISTS constitution_of_business text,
ADD COLUMN IF NOT EXISTS state_jurisdiction text,
ADD COLUMN IF NOT EXISTS central_jurisdiction text,
ADD COLUMN IF NOT EXISTS gstn_status text,
ADD COLUMN IF NOT EXISTS last_updated_date date,
ADD COLUMN IF NOT EXISTS pincode text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS building_name text,
ADD COLUMN IF NOT EXISTS building_no text,
ADD COLUMN IF NOT EXISTS floor_no text,
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS locality text,
ADD COLUMN IF NOT EXISTS district text;

-- Add index on gstin for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_gstin ON companies(gstin);

-- Comment on new fields
COMMENT ON COLUMN companies.legal_name IS 'Legal name of business as per GSTN';
COMMENT ON COLUMN companies.trade_name IS 'Trade name of business as per GSTN';
COMMENT ON COLUMN companies.registration_date IS 'GST registration date';
COMMENT ON COLUMN companies.business_nature IS 'Nature of business activities';
COMMENT ON COLUMN companies.taxpayer_type IS 'Type of taxpayer (Regular, Composition, etc.)';
COMMENT ON COLUMN companies.constitution_of_business IS 'Constitution like Proprietorship, Partnership, etc.';
COMMENT ON COLUMN companies.gstn_status IS 'Status of GSTN registration (Active, Cancelled, etc.)';
COMMENT ON COLUMN companies.last_updated_date IS 'Last updated date in GSTN records';