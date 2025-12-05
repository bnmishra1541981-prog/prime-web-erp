-- Create table for storing MSME credit reports
CREATE TABLE public.msme_credit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gstin TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_data JSONB NOT NULL,
  selected_reports TEXT[] NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.msme_credit_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only access their own reports
CREATE POLICY "Users can view own credit reports"
ON public.msme_credit_reports
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit reports"
ON public.msme_credit_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own credit reports"
ON public.msme_credit_reports
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_msme_credit_reports_user_id ON public.msme_credit_reports(user_id);
CREATE INDEX idx_msme_credit_reports_gstin ON public.msme_credit_reports(gstin);