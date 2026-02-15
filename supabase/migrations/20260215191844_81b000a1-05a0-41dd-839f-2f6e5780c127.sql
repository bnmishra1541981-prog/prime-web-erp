
CREATE OR REPLACE FUNCTION public.get_sawmill_logs_stats(p_company_id uuid, p_mill_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT json_build_object(
    'total_count', COUNT(*),
    'total_cft', COALESCE(SUM(COALESCE(cft, 0)), 0),
    'available_count', COUNT(*) FILTER (WHERE status = 'available'),
    'available_cft', COALESCE(SUM(CASE WHEN status = 'available' THEN COALESCE(cft, 0) ELSE 0 END), 0),
    'in_process_count', COUNT(*) FILTER (WHERE status = 'in_process'),
    'in_process_cft', COALESCE(SUM(CASE WHEN status = 'in_process' THEN COALESCE(cft, 0) ELSE 0 END), 0),
    'processed_count', COUNT(*) FILTER (WHERE status = 'processed'),
    'processed_cft', COALESCE(SUM(CASE WHEN status = 'processed' THEN COALESCE(cft, 0) ELSE 0 END), 0)
  )
  FROM sawmill_logs
  WHERE company_id = p_company_id
    AND (p_mill_id IS NULL OR saw_mill_id = p_mill_id);
$$;
