-- Allow authenticated users (and PostgREST RPC) to call generate_daily_pack.
-- Without this, the Edge Function's internal RPC call can fail with permission denied.

grant execute on function public.generate_daily_pack(date) to authenticated;
grant execute on function public.generate_daily_pack(date) to service_role;
