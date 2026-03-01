
-- Remove overly permissive insert policy on profiles (trigger uses SECURITY DEFINER, bypasses RLS)
DROP POLICY "Service role can insert profiles" ON public.profiles;
