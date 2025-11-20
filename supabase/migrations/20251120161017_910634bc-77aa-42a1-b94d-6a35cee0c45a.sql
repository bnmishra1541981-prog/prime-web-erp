-- Add currency field to companies table
ALTER TABLE public.companies 
ADD COLUMN currency character varying(3) DEFAULT 'INR';

COMMENT ON COLUMN public.companies.currency IS 'Currency code (INR, USD, EUR, etc.)';
