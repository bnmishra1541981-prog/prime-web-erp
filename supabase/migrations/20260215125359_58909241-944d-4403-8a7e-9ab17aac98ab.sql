
-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Users can manage logs in own companies" ON public.sawmill_logs;

CREATE POLICY "Users can manage logs in own companies"
ON public.sawmill_logs
FOR ALL
TO authenticated
USING (company_id IN (SELECT companies.id FROM companies WHERE companies.user_id = auth.uid()))
WITH CHECK (company_id IN (SELECT companies.id FROM companies WHERE companies.user_id = auth.uid()));
