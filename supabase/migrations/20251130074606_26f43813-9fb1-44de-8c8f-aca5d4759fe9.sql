-- Add size field to production_entries table
ALTER TABLE public.production_entries
ADD COLUMN size text;

-- Add index for better query performance
CREATE INDEX idx_production_entries_size ON public.production_entries(size);
CREATE INDEX idx_production_entries_entry_date ON public.production_entries(entry_date);

-- Add comment for documentation
COMMENT ON COLUMN public.production_entries.size IS 'Size/dimension of the produced items';