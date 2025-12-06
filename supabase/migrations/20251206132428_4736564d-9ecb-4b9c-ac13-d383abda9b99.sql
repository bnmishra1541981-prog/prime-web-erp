-- Create enum for sawmill user roles
DO $$ BEGIN
  CREATE TYPE public.sawmill_role AS ENUM ('admin', 'production_team', 'accounts_team', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create saw_mills table for multiple mill support
CREATE TABLE public.saw_mills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create contractors table
CREATE TABLE public.sawmill_contractors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  saw_mill_id UUID REFERENCES public.saw_mills(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  opening_balance NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sawmill employees table
CREATE TABLE public.sawmill_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  saw_mill_id UUID REFERENCES public.saw_mills(id) ON DELETE SET NULL,
  user_id UUID,
  name TEXT NOT NULL,
  phone TEXT,
  role sawmill_role NOT NULL DEFAULT 'production_team',
  daily_wage NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create production entries (round log input)
CREATE TABLE public.sawmill_production_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  saw_mill_id UUID REFERENCES public.saw_mills(id) ON DELETE SET NULL,
  contractor_id UUID REFERENCES public.sawmill_contractors(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  girth NUMERIC NOT NULL,
  length NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  cft NUMERIC NOT NULL,
  rate_per_cft NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create output entries (finished goods)
CREATE TABLE public.sawmill_output_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  saw_mill_id UUID REFERENCES public.saw_mills(id) ON DELETE SET NULL,
  production_entry_id UUID REFERENCES public.sawmill_production_entries(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  output_type TEXT NOT NULL, -- 'main_material', 'off_side', 'firewood', 'sawdust'
  size TEXT,
  length NUMERIC,
  quantity NUMERIC NOT NULL DEFAULT 1,
  cft NUMERIC NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create contractor payments table (linked to vouchers)
CREATE TABLE public.sawmill_contractor_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.sawmill_contractors(id) ON DELETE CASCADE,
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  payment_mode TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.sawmill_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  saw_mill_id UUID REFERENCES public.saw_mills(id) ON DELETE SET NULL,
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.saw_mills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sawmill_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sawmill_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sawmill_production_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sawmill_output_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sawmill_contractor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sawmill_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saw_mills
CREATE POLICY "Users can manage saw mills in own companies" ON public.saw_mills
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- RLS Policies for contractors
CREATE POLICY "Users can manage contractors in own companies" ON public.sawmill_contractors
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- RLS Policies for employees
CREATE POLICY "Users can manage employees in own companies" ON public.sawmill_employees
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- RLS Policies for production entries
CREATE POLICY "Users can manage production entries in own companies" ON public.sawmill_production_entries
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- RLS Policies for output entries
CREATE POLICY "Users can manage output entries in own companies" ON public.sawmill_output_entries
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- RLS Policies for payments
CREATE POLICY "Users can manage payments in own companies" ON public.sawmill_contractor_payments
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- RLS Policies for expenses
CREATE POLICY "Users can manage expenses in own companies" ON public.sawmill_expenses
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Function to update contractor balance on production entry
CREATE OR REPLACE FUNCTION public.update_contractor_balance_on_production()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE sawmill_contractors 
    SET current_balance = current_balance + NEW.total_amount,
        updated_at = now()
    WHERE id = NEW.contractor_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE sawmill_contractors 
    SET current_balance = current_balance - OLD.total_amount,
        updated_at = now()
    WHERE id = OLD.contractor_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE sawmill_contractors 
    SET current_balance = current_balance - OLD.total_amount + NEW.total_amount,
        updated_at = now()
    WHERE id = NEW.contractor_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for contractor balance update on production
CREATE TRIGGER update_contractor_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.sawmill_production_entries
FOR EACH ROW EXECUTE FUNCTION public.update_contractor_balance_on_production();

-- Function to reduce contractor balance on payment
CREATE OR REPLACE FUNCTION public.reduce_contractor_balance_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE sawmill_contractors 
    SET current_balance = current_balance - NEW.amount,
        updated_at = now()
    WHERE id = NEW.contractor_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE sawmill_contractors 
    SET current_balance = current_balance + OLD.amount,
        updated_at = now()
    WHERE id = OLD.contractor_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for contractor balance update on payment
CREATE TRIGGER reduce_contractor_balance_trigger
AFTER INSERT OR DELETE ON public.sawmill_contractor_payments
FOR EACH ROW EXECUTE FUNCTION public.reduce_contractor_balance_on_payment();