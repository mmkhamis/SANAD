-- 026_atomic_balance_adjust.sql
-- Atomic account balance adjustment function.
--
-- Eliminates the read-modify-write race condition in the client-side
-- balance update. The client calls this RPC which performs a single
-- atomic UPDATE inside Postgres — no TOCTOU window.
--
-- Usage from Supabase JS client:
--   const { error } = await supabase.rpc('adjust_account_balance', {
--     p_account_id: accountId,
--     p_delta: roundedDelta,   -- already rounded to 2 decimals client-side
--   });
--
-- Note: Uses numeric arithmetic throughout to avoid floating-point drift.
-- The accounts.current_balance column is numeric(12, 2).

create or replace function public.adjust_account_balance(
  p_account_id uuid,
  p_delta numeric
)
returns void
language sql
security definer
as $$
  update public.accounts
     set current_balance = round(current_balance + p_delta, 2),
         updated_at = now()
   where id = p_account_id;
$$;

-- Grant execute to authenticated users
grant execute on function public.adjust_account_balance(uuid, numeric) to authenticated;
