
-- Create sawmill_logs table for log inventory tracking
CREATE TABLE public.sawmill_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  saw_mill_id UUID REFERENCES public.saw_mills(id),
  tag_number TEXT NOT NULL,
  girth_cm NUMERIC NOT NULL,
  girth_inch NUMERIC GENERATED ALWAYS AS (girth_cm / 2.54) STORED,
  length_meter NUMERIC NOT NULL,
  grade TEXT DEFAULT 'A',
  cft NUMERIC GENERATED ALWAYS AS (((girth_cm / 2.54) * (girth_cm / 2.54) * length_meter * 2.2072) / 10000) STORED,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_process', 'processed')),
  qr_data TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, tag_number)
);

-- Enable RLS
ALTER TABLE public.sawmill_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage logs in own companies"
ON public.sawmill_logs
FOR ALL
USING (company_id IN (SELECT companies.id FROM companies WHERE companies.user_id = auth.uid()));

-- Add log_id to sawmill_production_entries to link production to specific logs
ALTER TABLE public.sawmill_production_entries ADD COLUMN log_id UUID REFERENCES public.sawmill_logs(id);

-- Trigger for updated_at
CREATE TRIGGER update_sawmill_logs_updated_at
BEFORE UPDATE ON public.sawmill_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
