-- Add capacity and maintenance fields to machines table
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS capacity NUMERIC,
ADD COLUMN IF NOT EXISTS maintenance_schedule TEXT,
ADD COLUMN IF NOT EXISTS next_maintenance_date DATE;