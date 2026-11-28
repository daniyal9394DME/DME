-- =====================================================================
-- 08 · Workshop registration: closing date and "close when full"
-- Safe to run more than once. Run it in Supabase → SQL Editor → Run.
--   * w.regClose  "YYYY-MM-DDTHH:MM" (Pakistan time): after this the form refuses new registrations.
--   * w.whenFull  "close" (default) or "wait": when every seat is taken, the form closes,
--                 or (if "wait") new people go on the waiting list as before.
--   * the public form also returns these two fields, so the page can show them.
-- Changes only these two functions; everything else is as in 05_ws_pgts.sql.
-- =====================================================================

create or replace function public.dme_public_form(p_kind text, p_id text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare w jsonb; held int; waiting int;
begin
  select data into w from dme_records where coll = 'workshops' and id = p_id and not deleted;
  if w is null then return jsonb_build_object('error', 'not_found'); end if;
  select count(*) filter (where r ->> 'status' in ('Confirmed','Payment to verify','Awaiting payment')),
         count(*) filter (where r ->> 'status' = 'Waiting list')
    into held, waiting
    from jsonb_array_elements(coalesce(w -> 'regs', '[]'::jsonb)) r;
  return jsonb_build_object(
    'w', jsonb_build_object(
      'id', w -> 'id', 'title', w -> 'title', 'dept', w -> 'dept', 'month', w -> 'month', 'date', w -> 'date',
      'venue', w -> 'venue', 'fee', w -> 'fee', 'payMode', w -> 'payMode', 'payInfo', w -> 'payInfo',
      'holdHours', w -> 'holdHours', 'seats', w -> 'seats', 'regOpen', w -> 'regOpen', 'regDesc', w -> 'regDesc',
      'fbOpen', w -> 'fbOpen', 'stage', w -> 'stage', 'focal', w -> 'focal', 'director', w -> 'director',
      'returned', w -> 'returned', 'regClose', w -> 'regClose', 'whenFull', w -> 'whenFull',
      'rgq', case when p_kind = 'reg'  then w -> 'rgq' end,
      'fbq', case when p_kind = 'fb'   then w -> 'fbq' end,
      'pfq', case when p_kind = 'prop' then w -> 'pfq' end,
      'held', held, 'waiting', waiting),
    'faculty', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', data -> 'title', 'name', data -> 'name', 'spec', data -> 'spec') order by data ->> 'name'), '[]'::jsonb)
                  from dme_records where coll = 'faculty' and not deleted and coalesce((data ->> 'active')::boolean, true)),
    'specs', coalesce((select data from dme_records where coll = 'meta' and id = 'specs' and not deleted), '[]'::jsonb),
    'settings', coalesce((select data from dme_records where coll = 'meta' and id = 'settings' and not deleted), '{}'::jsonb));
end $$;


revoke all on function public.dme_public_form(text, text) from public;
grant execute on function public.dme_public_form(text, text) to anon, authenticated;

create or replace function public.dme_submit_reg(p_id text, p_answers jsonb, p_txn text default null, p_receipt text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare w jsonb; regs jsonb; pg jsonb; ppid text; held int; seats int; pay boolean; mode text; st text; r jsonb; nm text; pos int; hold text;
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or length(p_answers::text) > 20000 then
    return jsonb_build_object('error', 'invalid'); end if;
  select data into w from dme_records where coll = 'workshops' and id = p_id and not deleted for update;
  if w is null then return jsonb_build_object('error', 'not_found'); end if;
  if not coalesce((w ->> 'regOpen')::boolean, false) then return jsonb_build_object('error', 'closed'); end if;
  if coalesce(w ->> 'date', '') ~ '^\d{4}-\d{2}-\d{2}$' and (w ->> 'date')::date < (now() at time zone 'Asia/Karachi')::date then
    return jsonb_build_object('error', 'closed'); end if;
  -- closing date and time set by the DME office (Pakistan time); a date alone closes at the end of that day
  if coalesce(w ->> 'regClose', '') ~ '^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$'
     and (case when length(w ->> 'regClose') = 10 then (w ->> 'regClose') || 'T23:59' else w ->> 'regClose' end)::timestamp
         <= (now() at time zone 'Asia/Karachi') then
    return jsonb_build_object('error', 'closed'); end if;
  regs := coalesce(w -> 'regs', '[]'::jsonb);
  -- an RIC PGT picked from the list: take the mobile and email on file when left blank
  ppid := nullif(p_answers ->> 'pid', '');
  if ppid is not null then
    select data into pg from dme_records where coll = 'pgts' and id = ppid and not deleted and data ->> 'reg' = 'Verified';
    if pg is null then p_answers := p_answers - 'pid'; ppid := null;
    else
      if exists (select 1 from jsonb_array_elements(regs) x where x ->> 'status' <> 'Cancelled' and x ->> 'pid' = ppid) then
        return jsonb_build_object('error', 'duplicate'); end if;
      if dme_digits(p_answers ->> 'mobile') = '' then p_answers := p_answers || jsonb_build_object('mobile', coalesce(nullif(pg ->> 'mobile', ''), pg ->> 'mobile2', '')); end if;
      if coalesce(p_answers ->> 'email', '') = '' and coalesce(pg ->> 'email', '') <> '' then p_answers := p_answers || jsonb_build_object('email', pg ->> 'email'); end if;
      p_answers := p_answers || jsonb_build_object('pgtCode', pg ->> 'code', 'spec', pg ->> 'spec', 'program', pg ->> 'program');
    end if;
  end if;
  if exists (select 1 from jsonb_array_elements(regs) x where x ->> 'status' <> 'Cancelled' and (
        (dme_digits(p_answers ->> 'mobile') <> '' and dme_digits(x -> 'a' ->> 'mobile') = dme_digits(p_answers ->> 'mobile'))
     or (coalesce(p_answers ->> 'email', '') <> '' and lower(x -> 'a' ->> 'email') = lower(p_answers ->> 'email')))) then
    return jsonb_build_object('error', 'duplicate'); end if;
  if coalesce(p_txn, '') <> '' and exists (select 1 from jsonb_array_elements(regs) x where lower(x ->> 'txn') = lower(trim(p_txn))) then
    return jsonb_build_object('error', 'txn_used'); end if;
  select count(*) into held from jsonb_array_elements(regs) x where x ->> 'status' in ('Confirmed','Payment to verify','Awaiting payment');
  seats := coalesce((w ->> 'seats')::int, 0);
  mode := coalesce(w ->> 'payMode', 'free');
  pay := coalesce((w ->> 'fee')::numeric, 0) > 0 and mode <> 'free';
  -- all seats taken: the form closes, unless the office chose a waiting list for this workshop
  if held >= seats and coalesce(w ->> 'whenFull', 'close') <> 'wait' then
    return jsonb_build_object('error', 'full'); end if;
  if held < seats then
    if pay and mode = 'proof' and (length(coalesce(trim(p_txn), '')) < 5 or coalesce(p_receipt, '') = '') then
      return jsonb_build_object('error', 'payment_required'); end if;
    st := case when not pay then 'Confirmed' when coalesce(p_txn, '') <> '' then 'Payment to verify' else 'Awaiting payment' end;
  else
    st := 'Waiting list';
  end if;
  nm := coalesce(nullif(regexp_replace(p_answers ->> 'name', '^Other:?\s*', ''), ''), 'Participant');
  r := jsonb_build_object('id', dme_uid('RG'), 'at', dme_now(), 'a', p_answers - 'pid', 'paid', false, 'status', st);
  if ppid is not null then r := r || jsonb_build_object('pid', ppid); end if;
  if st <> 'Waiting list' and coalesce(p_txn, '') <> '' then r := r || jsonb_build_object('txn', trim(p_txn), 'receipt', 'receipt attached', 'receiptPath', p_receipt); end if;
  if st = 'Awaiting payment' then
    hold := to_char((clock_timestamp() + make_interval(hours => coalesce((w ->> 'holdHours')::int, 48))) at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    r := r || jsonb_build_object('holdUntil', hold);
  end if;
  w := jsonb_set(w, '{regs}', regs || jsonb_build_array(r));
  w := jsonb_set(w, '{log}', coalesce(w -> 'log', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('at', dme_now(), 'by', nm, 'what', 'Registered: ' || st)));
  if st = 'Confirmed' then w := jsonb_set(w, '{reg,registered}', to_jsonb(coalesce((w #>> '{reg,registered}')::int, 0) + 1), true); end if;
  update dme_records set data = w where coll = 'workshops' and id = p_id;
  select count(*) into pos from jsonb_array_elements(w -> 'regs') x where x ->> 'status' = 'Waiting list';
  return jsonb_build_object('status', st, 'position', case when st = 'Waiting list' then pos end, 'holdUntil', hold,
                            'title', w -> 'title', 'date', w -> 'date', 'fee', w -> 'fee', 'payInfo', w -> 'payInfo');
end $$;
revoke all on function public.dme_submit_reg(text, jsonb, text, text) from public;
grant execute on function public.dme_submit_reg(text, jsonb, text, text) to anon, authenticated;
