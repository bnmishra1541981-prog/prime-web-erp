
-- Add new fields to sawmill_logs for purchase tracking
ALTER TABLE public.sawmill_logs 
ADD COLUMN IF NOT EXISTS purchase_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS supplier_name text,
ADD COLUMN IF NOT EXISTS lot_no text,
ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0;

-- Add team/munsi and machine fields to sawmill_production_entries
ALTER TABLE public.sawmill_production_entries
ADD COLUMN IF NOT EXISTS team_name text,
ADD COLUMN IF NOT EXISTS machine_no text;

-- Add rate and amount to output entries for product value calculation
ALTER TABLE public.sawmill_output_entries
ADD COLUMN IF NOT EXISTS rate_per_unit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;

-- Add machine_no to expenses for machine-specific tracking
ALTER TABLE public.sawmill_expenses
ADD COLUMN IF NOT EXISTS machine_no text;

-- Create product_rates table for rate management per product type
CREATE TABLE IF NOT EXISTS public.product_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  product_type text NOT NULL,
  rate_per_unit numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'CFT',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage product rates in own companies" 
ON public.product_rates
FOR ALL TO authenticated
USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
