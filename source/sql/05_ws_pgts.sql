
-- =====================================================================
-- Workshop registration: RIC PGTs pick their name from a list; their
-- specialty, mobile and email on file are filled in (Nov 2026)
-- =====================================================================
-- names for the picker, only while that workshop's registration is open; no contact details, only the last 4 digits of the mobile
create or replace function public.dme_ws_pgts(p_id text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from dme_records where coll = 'workshops' and id = p_id and not deleted and coalesce((data ->> 'regOpen')::boolean, false)) then
    return jsonb_build_object('error', 'closed'); end if;
  return jsonb_build_object('list', coalesce((select jsonb_agg(jsonb_build_object(
      'id', p.id, 'n', p.data ->> 'name', 's', p.data ->> 'spec', 'prog', p.data ->> 'program', 'code', p.data ->> 'code',
      'sup', (select trim(coalesce(f.data ->> 'title', '') || ' ' || (f.data ->> 'name')) from dme_records v join dme_records f on f.coll = 'faculty' and f.id = v.data ->> 'fid'
               where v.coll = 'sups' and not v.deleted and v.data ->> 'pid' = p.id order by (v.data ->> 'to') is null desc, v.data ->> 'from' desc limit 1),
      'm4', nullif(right(dme_digits(coalesce(nullif(p.data ->> 'mobile', ''), p.data ->> 'mobile2')), 4), ''),
      'e', coalesce(p.data ->> 'email', '') <> '') order by p.data ->> 'name')
    from dme_records p
    where p.coll = 'pgts' and not p.deleted and p.data ->> 'reg' = 'Verified'
      and coalesce((select s.data ->> 'status' from dme_records s where s.coll = 'status' and not s.deleted and s.data ->> 'pid' = p.id
                    order by s.data ->> 'date' desc nulls last, s.ord desc limit 1), 'Active') in ('Active', 'Frozen', 'Maternity Leave')), '[]'::jsonb));
end $$;
revoke all on function public.dme_ws_pgts(text) from public;
grant execute on function public.dme_ws_pgts(text) to anon, authenticated;

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
