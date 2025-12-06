-- Add height and width columns to sawmill_output_entries for CFT calculation
ALTER TABLE public.sawmill_output_entries 
ADD COLUMN IF NOT EXISTS height numeric,
ADD COLUMN IF NOT EXISTS width numeric,
ADD COLUMN IF NOT EXISTS weight numeric; -- For firewood/sawdust in kgs

-- Add a junction table for employee-mill assignments (one employee can work at multiple mills)
CREATE TABLE IF NOT EXISTS public.sawmill_employee_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.sawmill_employees(id) ON DELETE CASCADE,
  saw_mill_id UUID NOT NULL REFERENCES public.saw_mills(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, saw_mill_id)
);

-- Enable RLS on the new table
ALTER TABLE public.sawmill_employee_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for employee assignments
CREATE POLICY "Users can manage employee assignments in own companies" 
ON public.sawmill_employee_assignments 
FOR ALL 
USING (
  employee_id IN (
    SELECT se.id FROM sawmill_employees se 
    JOIN companies c ON se.company_id = c.id 
    WHERE c.user_id = auth.uid()
  )
);