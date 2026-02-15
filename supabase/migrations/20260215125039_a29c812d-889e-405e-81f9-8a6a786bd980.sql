-- Fix the CFT computed column to use girth in CM directly
ALTER TABLE public.sawmill_logs 
DROP COLUMN cft;

ALTER TABLE public.sawmill_logs 
ADD COLUMN cft numeric GENERATED ALWAYS AS ((girth_cm * girth_cm * length_meter * 2.2072) / 10000) STORED;