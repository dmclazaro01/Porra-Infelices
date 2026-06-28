-- RPC to expose the current server time to the frontend.
-- Used to evaluate lock deadlines without trusting the client's clock.
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS timestamptz
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT now();
$$;

-- Grant execute to authenticated users (the app calls this after login).
GRANT EXECUTE ON FUNCTION public.get_server_time() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_server_time() TO anon;
