-- =====================================================================
-- RIC DME Office · pilot database setup for Supabase
-- Run once in Supabase: SQL Editor → New query → paste all → Run.
-- Safe to run again: it only creates what is missing and replaces functions.
--
-- What it creates
--   dme_records   one row per record (PGT, faculty member, workshop, exam, task…)
--   dme_staff     who may sign in, with their role (filled from Settings → DME team)
--   dme_public_form / dme_submit_*   the only doors the public forms can use
--   storage bucket "dme-uploads" for PGT documents and payment receipts
-- =====================================================================

create table if not exists public.dme_records (
  coll        text        not null,            -- pgts, faculty, workshops, exams, tasks, meta …
  id          text        not null,
  ord         integer     not null default 0,  -- position in the list
  data        jsonb,
  deleted     boolean     not null default false,
  updated_at  timestamptz not null default clock_timestamp(),
  updated_by  text,
  primary key (coll, id)
);
create index if not exists dme_records_updated_at on public.dme_records (updated_at);

create table if not exists public.dme_staff (
  email    text primary key,
  name     text,
  role     text    not null default 'Viewer' check (role in ('Admin','Editor','Viewer')),
  conduct  boolean not null default false,     -- may see conduct / disciplinary records
  owner    boolean not null default false,     -- the Director; never removed by the app
  active   boolean not null default true
);
-- each person claims their place once with the invite code the Director gives them
alter table public.dme_staff add column if not exists invite text;
alter table public.dme_staff add column if not exists uid uuid;

-- The Director's sign-in email. Change it here if the Director will sign in with another address.
insert into public.dme_staff (email, name, role, conduct, owner, active)
values ('daniyal9394@gmail.com', 'Dr. Daniyal Ahmad Kamal', 'Admin', true, true, true)
on conflict (email) do update set role = 'Admin', owner = true, active = true, conduct = true;

-- ---------- helpers ----------
create or replace function public.dme_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.dme_role() returns text
language sql stable security definer set search_path = public as $$
  select role from dme_staff where email = public.dme_email() and active and uid = auth.uid() $$;

create or replace function public.dme_can_conduct() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select conduct or role = 'Admin' from dme_staff where email = public.dme_email() and active and uid = auth.uid()), false) $$;

create or replace function public.dme_now() returns text
language sql stable as $$ select to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') $$;

create or replace function public.dme_uid(p text) returns text
language sql volatile as $$ select p || substr(md5(random()::text || clock_timestamp()::text), 1, 8) $$;

-- every write gets the server time and the writer's email
create or replace function public.dme_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  new.updated_by := coalesce(nullif(public.dme_email(), ''), 'public form');
  return new;
end $$;
drop trigger if exists dme_touch on public.dme_records;
create trigger dme_touch before insert or update on public.dme_records
for each row execute function public.dme_touch();

-- the team list in the app (Settings → DME team) decides who can sign in
create or replace function public.dme_staff_sync() returns trigger
language plpgsql security definer set search_path = public as $$
declare s jsonb;
begin
  if new.coll = 'meta' and new.id = 'staff' and not new.deleted and jsonb_typeof(new.data) = 'array' then
    update dme_staff set active = false where not owner;
    for s in select * from jsonb_array_elements(new.data) loop
      if coalesce(s ->> 'email', '') like '%@%' then
        insert into dme_staff (email, name, role, conduct, active, invite)
        values (lower(trim(s ->> 'email')), s ->> 'name',
                case when s ->> 'role' in ('Admin','Editor','Viewer') then s ->> 'role' else 'Viewer' end,
                coalesce((s ->> 'conduct')::boolean, false) or s ->> 'role' = 'Admin', true, nullif(upper(trim(s ->> 'invite')), ''))
        on conflict (email) do update
          set name = excluded.name,
              role = case when dme_staff.owner then 'Admin' else excluded.role end,
              conduct = excluded.conduct or dme_staff.owner,
              active = true,
              -- a new invite code from the Director resets the person's sign-in
              uid = case when dme_staff.owner or excluded.invite is not distinct from dme_staff.invite or excluded.invite is null then dme_staff.uid else null end,
              invite = case when dme_staff.owner then null else excluded.invite end;
      end if;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists dme_staff_sync on public.dme_records;
create trigger dme_staff_sync after insert or update on public.dme_records
for each row execute function public.dme_staff_sync();

-- ---------- row level security ----------
alter table public.dme_records enable row level security;
alter table public.dme_staff   enable row level security;

drop policy if exists rec_read   on public.dme_records;
drop policy if exists rec_insert on public.dme_records;
drop policy if exists rec_update on public.dme_records;
create policy rec_read on public.dme_records for select to authenticated
  using (public.dme_role() is not null and (coll <> 'conduct' or public.dme_can_conduct()));
create policy rec_insert on public.dme_records for insert to authenticated
  with check (public.dme_role() in ('Admin','Editor')
              and (coll <> 'meta' or id <> 'staff' or public.dme_role() = 'Admin')
              and (coll <> 'conduct' or public.dme_can_conduct()));
create policy rec_update on public.dme_records for update to authenticated
  using (public.dme_role() in ('Admin','Editor') and (coll <> 'conduct' or public.dme_can_conduct()))
  with check (public.dme_role() in ('Admin','Editor')
              and (coll <> 'meta' or id <> 'staff' or public.dme_role() = 'Admin')
              and (coll <> 'conduct' or public.dme_can_conduct()));
-- no delete policy: the app marks rows as deleted instead, so history is kept

drop policy if exists staff_read on public.dme_staff;
create policy staff_read on public.dme_staff for select to authenticated
  using (email = public.dme_email() or public.dme_role() is not null);

-- first sign-in: link this login to the person's place on the team (invite code; the Director needs none)
create or replace function public.dme_claim(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r dme_staff;
begin
  select * into r from dme_staff where email = public.dme_email() and active for update;
  if r.email is null then return jsonb_build_object('error', 'not_staff'); end if;
  if r.uid = auth.uid() then return jsonb_build_object('ok', true, 'role', r.role); end if;
  if r.uid is not null and not r.owner then return jsonb_build_object('error', 'claimed'); end if;
  if not r.owner and (r.invite is null or upper(trim(coalesce(p_code, ''))) <> r.invite) then return jsonb_build_object('error', 'bad_code'); end if;
  update dme_staff set uid = auth.uid() where email = r.email;
  return jsonb_build_object('ok', true, 'role', r.role);
end $$;
revoke all on function public.dme_claim(text) from public;
grant execute on function public.dme_claim(text) to authenticated;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.dme_records to authenticated;
grant select on public.dme_staff to authenticated;
revoke all on public.dme_records from anon;
revoke all on public.dme_staff from anon;

-- =====================================================================
-- Public forms. People filling a form never see the database; they can
-- only call these functions, and each checks the form is open.
-- =====================================================================

-- what a form needs to draw itself: the workshop's form and a few lists
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
      'returned', w -> 'returned',
      'rgq', case when p_kind = 'reg'  then w -> 'rgq' end,
      'fbq', case when p_kind = 'fb'   then w -> 'fbq' end,
      'pfq', case when p_kind = 'prop' then w -> 'pfq' end,
      'held', held, 'waiting', waiting),
    'faculty', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', data -> 'title', 'name', data -> 'name', 'spec', data -> 'spec') order by data ->> 'name'), '[]'::jsonb)
                  from dme_records where coll = 'faculty' and not deleted and coalesce((data ->> 'active')::boolean, true)),
    'specs', coalesce((select data from dme_records where coll = 'meta' and id = 'specs' and not deleted), '[]'::jsonb),
    'settings', coalesce((select data from dme_records where coll = 'meta' and id = 'settings' and not deleted), '{}'::jsonb));
end $$;

-- lists for the PGT registration form
create or replace function public.dme_public_lists() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    -- one entry per specialty a faculty member is approved to supervise in
    'faculty', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'n', trim(coalesce(r.data ->> 'title', '') || ' ' || (r.data ->> 'name')),
                       's', e ->> 'spec', 'c', coalesce((e ->> 'cpsp')::boolean, false), 'u', coalesce((e ->> 'uhs')::boolean, false))
                       order by r.data ->> 'name'), '[]'::jsonb)
                from dme_records r
                cross join lateral jsonb_array_elements(case when jsonb_typeof(r.data -> 'sups') = 'array' and jsonb_array_length(r.data -> 'sups') > 0
                     then r.data -> 'sups'
                     else jsonb_build_array(jsonb_build_object('spec', r.data -> 'spec', 'cpsp', r.data -> 'cpsp', 'uhs', r.data -> 'uhs')) end) e
                where r.coll = 'faculty' and not r.deleted and coalesce((r.data ->> 'active')::boolean, true)),
    'specs', coalesce((select data from dme_records where coll = 'meta' and id = 'specs' and not deleted), '[]'::jsonb),
    'sites', coalesce((select data from dme_records where coll = 'meta' and id = 'sites' and not deleted), '[]'::jsonb),
    'forms', coalesce((select data -> 'forms' from dme_records where coll = 'meta' and id = 'settings' and not deleted), '{}'::jsonb)) $$;

create or replace function public.dme_digits(t text) returns text
language sql immutable as $$ select right(regexp_replace(coalesce(t, ''), '\D', '', 'g'), 10) $$;

-- workshop registration: seats, waiting list and payment rules, decided in one locked step
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

-- anonymous workshop feedback
create or replace function public.dme_submit_fb(p_id text, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare w jsonb;
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or length(p_answers::text) > 20000 then return jsonb_build_object('error', 'invalid'); end if;
  select data into w from dme_records where coll = 'workshops' and id = p_id and not deleted for update;
  if w is null then return jsonb_build_object('error', 'not_found'); end if;
  if not coalesce((w ->> 'fbOpen')::boolean, false) then return jsonb_build_object('error', 'closed'); end if;
  w := jsonb_set(w, '{fbResp}', coalesce(w -> 'fbResp', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('at', dme_now(), 'a', p_answers)));
  update dme_records set data = w where coll = 'workshops' and id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- workshop proposal from the focal person (form F-06)
create or replace function public.dme_submit_prop(p_id text, p_values jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare w jsonb; n int; nm text; at text := dme_now(); aid text := dme_uid('A');
begin
  if p_values is null or jsonb_typeof(p_values) <> 'object' or length(p_values::text) > 40000 then return jsonb_build_object('error', 'invalid'); end if;
  select data into w from dme_records where coll = 'workshops' and id = p_id and not deleted for update;
  if w is null then return jsonb_build_object('error', 'not_found'); end if;
  if coalesce((w ->> 'stage')::int, 0) >= 3 then return jsonb_build_object('error', 'approved'); end if;
  n := coalesce((w #>> '{proposal,versions}')::int, 0) + 1;
  nm := coalesce(nullif(regexp_replace(coalesce(p_values ->> 'focal', ''), '^Other:?\s*', ''), ''), w ->> 'focal', 'Focal person');
  w := jsonb_set(w, '{proposal}', jsonb_build_object('submitted', jsonb_build_object('values', p_values, 'at', at, 'by', nm), 'final', p_values, 'versions', n));
  w := jsonb_set(w, '{returned}', 'null'::jsonb);
  if coalesce((w ->> 'stage')::int, 0) < 2 then w := jsonb_set(w, '{stage}', '2'::jsonb); end if;
  w := jsonb_set(w, '{log}', coalesce(w -> 'log', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('at', at, 'by', nm,
         'what', 'Proposal submitted' || case when n > 1 then ' (version ' || n || ')' else '' end)));
  update dme_records set data = w where coll = 'workshops' and id = p_id;
  insert into dme_records (coll, id, data) values ('audit', aid,
    jsonb_build_object('id', aid, 'at', at, 'by', nm, 'what', (w ->> 'title') || ': proposal submitted by ' || nm, 'ref', 'ws-' || p_id));
  return jsonb_build_object('ok', true, 'version', n);
end $$;

-- PGT self-registration: creates the PGT (pending verification) and reserves the PGT ID
create or replace function public.dme_submit_pgt(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pid text := dme_uid('P'); st date; pre text; nxt int; code text; fid text; at text := dme_now(); o int; rec jsonb; aid text := dme_uid('A');
begin
  if p is null or length(p::text) > 40000 or length(coalesce(trim(p ->> 'name'), '')) < 3
     or coalesce(p ->> 'spec', '') = '' or coalesce(p ->> 'program', '') = '' or coalesce(p ->> 'start', '') !~ '^\d{4}-\d{2}-\d{2}$' then
    return jsonb_build_object('error', 'invalid'); end if;
  if exists (select 1 from dme_records where coll = 'meta' and id = 'settings' and not deleted
             and ((data -> 'forms' -> 'pgt' ->> 'open') = 'false'
                  or coalesce(data -> 'forms' -> 'pgt' ->> 'close', '') between '2000-01-01' and to_char((now() at time zone 'Asia/Karachi')::date - 1, 'YYYY-MM-DD'))) then
    return jsonb_build_object('error', 'closed'); end if;
  if exists (select 1 from dme_records where coll = 'pgts' and not deleted
             and (regexp_replace(data ->> 'cnic', '\D', '', 'g') = regexp_replace(coalesce(p ->> 'cnic', 'x'), '\D', '', 'g'))) then
    return jsonb_build_object('error', 'duplicate'); end if;
  st := (p ->> 'start')::date;
  pre := 'PGT/' || to_char(st, 'YY') || '/' || case when extract(month from st) <= 6 then '1' else '7' end || '/';
  perform pg_advisory_xact_lock(hashtext('dme_pgt_code'));
  select coalesce(max(nullif(split_part(data ->> 'code', '/', 4), '')::int), 0) + 1 into nxt
    from dme_records where coll = 'pgts' and data ->> 'code' like pre || '%';
  code := pre || lpad(nxt::text, 2, '0');
  select coalesce(max(ord), 0) + 1 into o from dme_records where coll = 'pgts';
  rec := jsonb_build_object('id', pid, 'code', code, 'name', regexp_replace(trim(p ->> 'name'), '^(dr\.?\s*)', '', 'i'),
    'program', p ->> 'program', 'spec', p ->> 'spec', 'domicile', p ->> 'domicile', 'start', p ->> 'start',
    'dur', (p ->> 'dur')::numeric, 'declComp', p ->> 'comp', 'override', null, 'reg', 'Pending',
    'submitted', left(at, 10), 'regAt', at, 'notes', '', 'duty', p ->> 'duty',
    'father', p ->> 'father', 'cnic', p ->> 'cnic', 'pmdc', upper(p ->> 'pmdc'), 'mobile', p ->> 'mobile', 'email', p ->> 'email',
    'docs', coalesce(p -> 'docs', '{}'::jsonb),
    'mobile2', nullif(p ->> 'mobile2', ''), 'passport', nullif(p -> 'bio' ->> 'passport', ''),
    'bio', case when jsonb_typeof(p -> 'bio') = 'object' then p -> 'bio' else null end);
  -- supervisor: match the name chosen on the form to a faculty record
  select id into fid from dme_records where coll = 'faculty' and not deleted
    and lower(trim(coalesce(data ->> 'title', '') || ' ' || (data ->> 'name'))) = lower(trim(coalesce(p ->> 'sup', ''))) limit 1;
  if fid is null and coalesce(p ->> 'sup', '') <> '' then
    rec := rec || jsonb_build_object('notes', 'Supervisor given on the form: ' || coalesce(nullif(p ->> 'supOther', ''), p ->> 'sup') || ' (not matched to a faculty record)');
  end if;
  insert into dme_records (coll, id, ord, data) values ('pgts', pid, o, rec);
  insert into dme_records (coll, id, ord, data) values ('status', 'S' || substr(pid, 2), 0,
    jsonb_build_object('id', 'S' || substr(pid, 2), 'pid', pid, 'status', 'Active', 'date', p ->> 'start', 'notes', 'Self-registration', 'by', 'Registration form'));
  if p ->> 'duty' = 'Frozen' and coalesce(p ->> 'frozenSince', '') <> '' then
    insert into dme_records (coll, id, ord, data) values ('status', 'SF' || substr(pid, 2), 0,
      jsonb_build_object('id', 'SF' || substr(pid, 2), 'pid', pid, 'status', 'Frozen', 'date', p ->> 'frozenSince', 'notes', 'Declared at registration', 'by', 'Registration form'));
  end if;
  if p ->> 'duty' = 'Rotation' then
    insert into dme_records (coll, id, ord, data) values ('rots', 'R' || substr(pid, 2), 0,
      jsonb_build_object('id', 'R' || substr(pid, 2), 'pid', pid, 'site', case when p ->> 'site' = 'Other' then p ->> 'siteOther' else p ->> 'site' end,
        'start', p ->> 'rotStart', 'ret', nullif(p ->> 'ret', ''), 'notes', 'Declared at registration', 'by', 'Registration form'));
  end if;
  if fid is not null then
    insert into dme_records (coll, id, ord, data) values ('sups', 'V' || substr(pid, 2), 0,
      jsonb_build_object('id', 'V' || substr(pid, 2), 'pid', pid, 'fid', fid, 'from', p ->> 'start', 'to', null));
  end if;
  insert into dme_records (coll, id, data) values ('audit', aid,
    jsonb_build_object('id', aid, 'at', at, 'by', 'Registration form', 'what', 'New PGT registration: Dr. ' || (rec ->> 'name') || ', ' || (p ->> 'spec') || ' (' || (p ->> 'program') || '); PGT ID ' || code || ' reserved', 'ref', 'pgt-' || pid));
  return jsonb_build_object('ok', true, 'ref', code);
end $$;

revoke all on function public.dme_public_form(text, text) from public;
revoke all on function public.dme_public_lists() from public;
revoke all on function public.dme_submit_reg(text, jsonb, text, text) from public;
revoke all on function public.dme_submit_fb(text, jsonb) from public;
revoke all on function public.dme_submit_prop(text, jsonb) from public;
revoke all on function public.dme_submit_pgt(jsonb) from public;
grant execute on function public.dme_public_form(text, text), public.dme_public_lists(),
  public.dme_submit_reg(text, jsonb, text, text), public.dme_submit_fb(text, jsonb),
  public.dme_submit_prop(text, jsonb), public.dme_submit_pgt(jsonb) to anon, authenticated;

-- =====================================================================
-- Rotating trainees (PGTs from other institutes): online registration
-- =====================================================================
create or replace function public.dme_submit_rot(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare vid text := dme_uid('V'); at text := dme_now(); pin text := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
        rec jsonb; o int; aid text := dme_uid('A'); cn text := regexp_replace(coalesce(p ->> 'cnic', ''), '\D', '', 'g');
begin
  if p is null or length(p::text) > 10000 or length(coalesce(trim(p ->> 'name'), '')) < 3
     or coalesce(trim(p ->> 'inst'), '') = '' or coalesce(trim(p ->> 'unit'), '') = ''
     or coalesce(p ->> 'start', '') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(p ->> 'end', '') !~ '^\d{4}-\d{2}-\d{2}$'
     or (p ->> 'end') < (p ->> 'start') or (p ->> 'end')::date > (p ->> 'start')::date + 400
     or coalesce(p -> 'docs' ->> 'movement', '') !~ '^rotating/' then
    return jsonb_build_object('error', 'invalid'); end if;
  if exists (select 1 from dme_records where coll = 'meta' and id = 'settings' and not deleted
             and ((data -> 'forms' -> 'rot' ->> 'open') = 'false'
                  or coalesce(data -> 'forms' -> 'rot' ->> 'close', '') between '2000-01-01' and to_char((now() at time zone 'Asia/Karachi')::date - 1, 'YYYY-MM-DD'))) then
    return jsonb_build_object('error', 'closed'); end if;
  if length(cn) = 13 and exists (select 1 from dme_records where coll = 'visitors' and not deleted
       and regexp_replace(coalesce(data ->> 'cnic', ''), '\D', '', 'g') = cn
       and (data ->> 'start') <= (p ->> 'end') and coalesce(data ->> 'left', data ->> 'end') >= (p ->> 'start')) then
    return jsonb_build_object('error', 'duplicate'); end if;
  select coalesce(max(ord), 0) + 1 into o from dme_records where coll = 'visitors';
  rec := jsonb_build_object('id', vid, 'name', regexp_replace(trim(p ->> 'name'), '^(dr\.?\s*)', '', 'i'),
    'father', p ->> 'father', 'cnic', case when length(cn) = 13 then substr(cn,1,5) || '-' || substr(cn,6,7) || '-' || substr(cn,13,1) else p ->> 'cnic' end,
    'pmdc', upper(coalesce(p ->> 'pmdc', '')), 'mobile', p ->> 'mobile', 'email', lower(coalesce(p ->> 'email', '')),
    'inst', trim(p ->> 'inst'), 'program', p ->> 'program', 'spec', p ->> 'spec', 'year', p ->> 'year',
    'unit', trim(p ->> 'unit'), 'sup', '', 'supName', p ->> 'supName', 'start', p ->> 'start', 'end', p ->> 'end',
    'letter', p ->> 'letter', 'notes', '', 'pin', pin, 'att', '{}'::jsonb,
    'docs', jsonb_build_object('movement', p -> 'docs' ->> 'movement', 'pmdc', p -> 'docs' ->> 'pmdc'),
    'src', 'form', 'checked', false, 'regAt', at);
  if coalesce(p ->> 'supName', '') <> '' then
    rec := rec || jsonb_build_object('sup', coalesce((select id from dme_records where coll = 'faculty' and not deleted
      and lower(trim(coalesce(data ->> 'title', '') || ' ' || (data ->> 'name'))) = lower(trim(p ->> 'supName')) limit 1), ''));
  end if;
  insert into dme_records (coll, id, ord, data) values ('visitors', vid, o, rec);
  insert into dme_records (coll, id, data) values ('audit', aid, jsonb_build_object('id', aid, 'at', at, 'by', 'Registration form',
    'what', 'Rotating trainee registered online: Dr. ' || (rec ->> 'name') || ', ' || (rec ->> 'inst') || ', ' || (rec ->> 'unit') || ' (' || (p ->> 'start') || ' to ' || (p ->> 'end') || ')', 'ref', 'rot-' || vid));
  return jsonb_build_object('ok', true, 'pin', pin);
end $$;
revoke all on function public.dme_submit_rot(jsonb) from public;
grant execute on function public.dme_submit_rot(jsonb) to anon, authenticated;


-- =====================================================================
-- Workshop check-in by QR: participants confirm attendance with the
-- mobile number they registered with, while check-in is open
-- =====================================================================
create or replace function public.dme_att_info(p_id text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('title', data -> 'title', 'date', data -> 'date', 'venue', data -> 'venue',
           'open', coalesce((data ->> 'attOpen')::boolean, false))
         from dme_records where coll = 'workshops' and id = p_id and not deleted), jsonb_build_object('error', 'not_found')) $$;

create or replace function public.dme_checkin(p_id text, p_mobile text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare w jsonb; regs jsonb; i int; r jsonb; d text := dme_digits(p_mobile); n int;
begin
  if length(d) < 10 then return jsonb_build_object('error', 'invalid'); end if;
  select data into w from dme_records where coll = 'workshops' and id = p_id and not deleted for update;
  if w is null then return jsonb_build_object('error', 'not_found'); end if;
  if not coalesce((w ->> 'attOpen')::boolean, false) then return jsonb_build_object('error', 'closed'); end if;
  regs := coalesce(w -> 'regs', '[]'::jsonb);
  for i in 0 .. jsonb_array_length(regs) - 1 loop
    r := regs -> i;
    if r ->> 'status' = 'Confirmed' and dme_digits(r -> 'a' ->> 'mobile') = d then
      if coalesce((r ->> 'present')::boolean, false) then
        return jsonb_build_object('ok', true, 'already', true, 'name', regexp_replace(r -> 'a' ->> 'name', '^Other:?\s*', ''), 'at', r ->> 'presentAt'); end if;
      regs := jsonb_set(regs, array[i::text], r || jsonb_build_object('present', true, 'presentAt', dme_now(), 'presentBy', 'QR check-in'));
      select count(*) into n from jsonb_array_elements(regs) x where coalesce((x ->> 'present')::boolean, false);
      w := jsonb_set(jsonb_set(w, '{regs}', regs), '{reg,attended}', to_jsonb(n), true);
      update dme_records set data = w where coll = 'workshops' and id = p_id;
      return jsonb_build_object('ok', true, 'name', regexp_replace(r -> 'a' ->> 'name', '^Other:?\s*', ''));
    end if;
  end loop;
  return jsonb_build_object('error', 'not_registered');
end $$;

-- =====================================================================
-- Bio data from PGTs already in the register: each gets a personal link
-- (a random token on their record) that works until they submit
-- =====================================================================
create or replace function public.dme_public_bio(p_t text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('name', data -> 'name', 'father', data -> 'father', 'cnic', data -> 'cnic', 'domicile', data -> 'domicile',
           'mobile', data -> 'mobile', 'mobile2', data -> 'mobile2', 'email', data -> 'email', 'spec', data -> 'spec', 'code', data -> 'code', 'bio', data -> 'bio')
         from dme_records where coll = 'pgts' and not deleted and length(coalesce(p_t, '')) >= 16 and data ->> 'bioToken' = p_t limit 1),
         jsonb_build_object('error', 'not_found')) $$;

create or replace function public.dme_submit_bio(p_t text, p_bio jsonb, p_mobile2 text default null, p_photo text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare rid text; d jsonb; aid text := dme_uid('A');
begin
  if p_bio is null or jsonb_typeof(p_bio) <> 'object' or length(p_bio::text) > 15000 or length(coalesce(p_t, '')) < 16 then
    return jsonb_build_object('error', 'invalid'); end if;
  select id, data into rid, d from dme_records where coll = 'pgts' and not deleted and data ->> 'bioToken' = p_t limit 1 for update;
  if rid is null then return jsonb_build_object('error', 'not_found'); end if;
  d := (d - 'bioToken') || jsonb_build_object('bio', p_bio, 'bioAt', dme_now());
  if coalesce(p_bio ->> 'passport', '') <> '' then d := d || jsonb_build_object('passport', p_bio ->> 'passport'); end if;
  if dme_digits(p_mobile2) <> '' then d := d || jsonb_build_object('mobile2', p_mobile2); end if;
  if coalesce(p_photo, '') ~ '^pgt/' then d := jsonb_set(d, '{docs}', coalesce(d -> 'docs', '{}'::jsonb) || jsonb_build_object('photo', p_photo)); end if;
  update dme_records set data = d where coll = 'pgts' and id = rid;
  insert into dme_records (coll, id, data) values ('audit', aid, jsonb_build_object('id', aid, 'at', dme_now(), 'by', 'Bio data link',
    'what', 'Bio data submitted by Dr. ' || (d ->> 'name'), 'ref', 'pgt-' || rid));
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.dme_att_info(text) from public;
revoke all on function public.dme_checkin(text, text) from public;
revoke all on function public.dme_public_bio(text) from public;
revoke all on function public.dme_submit_bio(text, jsonb, text, text) from public;
grant execute on function public.dme_att_info(text), public.dme_checkin(text, text), public.dme_public_bio(text),
  public.dme_submit_bio(text, jsonb, text, text) to anon, authenticated;

-- =====================================================================
-- File storage: PGT documents and payment receipts (private bucket)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dme-uploads', 'dme-uploads', false, 5242880,
        array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','application/pdf'];

drop policy if exists "dme forms upload" on storage.objects;
drop policy if exists "dme staff read"   on storage.objects;
drop policy if exists "dme staff upload" on storage.objects;
create policy "dme forms upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'dme-uploads' and (storage.foldername(name))[1] in ('pgt', 'receipts', 'rotating'));
create policy "dme staff read" on storage.objects for select to authenticated
  using (bucket_id = 'dme-uploads' and public.dme_role() is not null);
create policy "dme staff upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'dme-uploads' and public.dme_role() in ('Admin','Editor'));
-- =====================================================================
-- Training status form (QR at the internal exam): a PGT identifies
-- with their PGT ID / roll number plus their mobile number or CNIC,
-- then reports registration certificate, ACLS / BLS and research stage
-- =====================================================================
create or replace function public.dme_mob(t text) returns text
language sql immutable as $$
  select case when d ~ '^92\d{10}$' then '0' || substr(d, 3) when d ~ '^3\d{9}$' then '0' || d else d end
  from (select regexp_replace(coalesce(t, ''), '\D', '', 'g') d) x $$;

create or replace function public.dme_sur_find(p_code text, p_key text) returns text
language sql stable security definer set search_path = public as $$
  select id from dme_records
   where coll = 'pgts' and not deleted and length(dme_digits(p_code)) >= 4
     and dme_digits(data ->> 'code') = dme_digits(p_code)
     and length(dme_digits(p_key)) >= 10
     and (dme_mob(p_key) in (dme_mob(data ->> 'mobile'), dme_mob(data ->> 'mobile2'))
          or (length(dme_digits(p_key)) = 13 and dme_digits(p_key) = dme_digits(data ->> 'cnic')))
   limit 1 $$;
revoke all on function public.dme_sur_find(text, text) from public, anon, authenticated;

create or replace function public.dme_sur_closed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from dme_records where coll = 'meta' and id = 'settings' and not deleted
    and ((data -> 'forms' -> 'sur' ->> 'open') = 'false'
         or coalesce(data -> 'forms' -> 'sur' ->> 'close', '') between '2000-01-01' and to_char((now() at time zone 'Asia/Karachi')::date - 1, 'YYYY-MM-DD'))) $$;

create or replace function public.dme_sur_who(p_code text, p_key text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare rid text; d jsonb;
begin
  if dme_sur_closed() then return jsonb_build_object('error', 'closed'); end if;
  rid := dme_sur_find(p_code, p_key);
  if rid is null then return jsonb_build_object('error', 'not_found'); end if;
  select data into d from dme_records where coll = 'pgts' and id = rid;
  return jsonb_build_object('ok', true, 'name', d -> 'name', 'spec', d -> 'spec', 'program', d -> 'program', 'code', d -> 'code', 'survey', d -> 'survey');
end $$;

create or replace function public.dme_submit_sur(p_code text, p_key text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare rid text; d jsonb; aid text := dme_uid('A'); k text; docs jsonb := '{}'::jsonb; s jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'object' or length(p::text) > 20000 then return jsonb_build_object('error', 'invalid'); end if;
  if dme_sur_closed() then return jsonb_build_object('error', 'closed'); end if;
  rid := dme_sur_find(p_code, p_key);
  if rid is null then return jsonb_build_object('error', 'not_found'); end if;
  select data into d from dme_records where coll = 'pgts' and id = rid for update;
  s := p - 'files';
  foreach k in array array['rtmc', 'acls', 'bls'] loop
    if coalesce(p -> 'files' ->> k, '') ~ '^pgt/' then docs := docs || jsonb_build_object(k, p -> 'files' ->> k); end if;
  end loop;
  s := s || jsonb_build_object('at', dme_now());
  if d ? 'survey' then
    d := d || jsonb_build_object('surveyHist', (jsonb_build_array(d -> 'survey') || coalesce(d -> 'surveyHist', '[]'::jsonb)) - 5);
  end if;
  d := d || jsonb_build_object('survey', s, 'docs', coalesce(d -> 'docs', '{}'::jsonb) || docs);
  update dme_records set data = d where coll = 'pgts' and id = rid;
  insert into dme_records (coll, id, data) values ('audit', aid, jsonb_build_object('id', aid, 'at', dme_now(), 'by', 'Training status form',
    'what', 'Training status form submitted by Dr. ' || (d ->> 'name'), 'ref', 'pgt-' || rid));
  return jsonb_build_object('ok', true, 'name', d ->> 'name');
end $$;

revoke all on function public.dme_sur_closed() from public;
revoke all on function public.dme_sur_who(text, text) from public;
revoke all on function public.dme_submit_sur(text, text, jsonb) from public;
grant execute on function public.dme_sur_who(text, text), public.dme_submit_sur(text, text, jsonb) to anon, authenticated;

-- names for the searchable picker on the form: PGTs currently in training (no contact details)
create or replace function public.dme_sur_list() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if dme_sur_closed() then return jsonb_build_object('error', 'closed'); end if;
  return jsonb_build_object('list', coalesce((select jsonb_agg(jsonb_build_object('n', p.data ->> 'name', 's', p.data ->> 'spec', 'c', p.data ->> 'code') order by p.data ->> 'name')
    from dme_records p
    where p.coll = 'pgts' and not p.deleted and p.data ->> 'reg' = 'Verified' and coalesce(p.data ->> 'code', '') <> ''
      and coalesce((select s.data ->> 'status' from dme_records s where s.coll = 'status' and not s.deleted and s.data ->> 'pid' = p.id
                    order by s.data ->> 'date' desc nulls last, s.ord desc limit 1), 'Active') in ('Active', 'Frozen', 'Maternity Leave')), '[]'::jsonb));
end $$;
revoke all on function public.dme_sur_list() from public;
grant execute on function public.dme_sur_list() to anon, authenticated;

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



-- =====================================================================
-- 06 · Observership applications (Nov 2026)
-- Run once in the Supabase SQL editor. Safe to run again (it replaces the
-- earlier version of this file).
--  1. dme_submit_obs: the public observership form (?obs=1) records the
--     application with its degree / letter and CNIC, and issues a fee
--     challan (OBS-YY-####). The observership starts only when the DME
--     office uploads the hospital's office order.
--  2. Uploads from the form may go to the "observers" folder.
--  3. Files up to 10 MB (phone photos and scanned PDFs).
-- =====================================================================
create or replace function public.dme_submit_obs(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare vid text := dme_uid('V'); at text := dme_now(); pin text := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
        rec jsonb; o int; aid text := dme_uid('A'); fid text := dme_uid('F'); cn text := regexp_replace(coalesce(p ->> 'cnic', ''), '\D', '', 'g');
        c jsonb; fee1 int; fee2 int; blk int; maxd int; nb int; amt int; today date := (now() at time zone 'Asia/Karachi')::date;
        yy text := to_char((now() at time zone 'Asia/Karachi')::date, 'YY'); n int; ch text; who text;
begin
  if p is null or length(p::text) > 12000 or length(coalesce(trim(p ->> 'name'), '')) < 3 or length(coalesce(trim(p ->> 'father'), '')) < 3
     or coalesce(trim(p ->> 'inst'), '') = '' or coalesce(trim(p ->> 'unit'), '') = '' or coalesce(trim(p ->> 'cat'), '') = ''
     or coalesce(trim(p ->> 'degree'), '') = '' or coalesce(trim(p ->> 'gender'), '') = '' or length(coalesce(trim(p ->> 'reason'), '')) < 5
     or coalesce(p ->> 'blocks', '') !~ '^\d{1,2}$' or coalesce(p ->> 'mobile', '') !~ '^03\d{2}-\d{7}$' or length(cn) <> 13
     or coalesce(p -> 'docs' ->> 'degree', '') !~ '^observers/' or coalesce(p -> 'docs' ->> 'cnic', '') !~ '^observers/'
     or (coalesce(p -> 'docs' ->> 'cnic2', '') <> '' and (p -> 'docs' ->> 'cnic2') !~ '^observers/') then
    return jsonb_build_object('error', 'invalid'); end if;
  select data -> 'forms' -> 'obs' into c from dme_records where coll = 'meta' and id = 'settings' and not deleted;
  if (c ->> 'open') = 'false' or coalesce(c ->> 'close', '') between '2000-01-01' and to_char(today - 1, 'YYYY-MM-DD') then
    return jsonb_build_object('error', 'closed'); end if;
  fee1 := coalesce(nullif(c ->> 'fee1', '')::int, 5000); fee2 := coalesce(nullif(c ->> 'fee2', '')::int, 3000);
  blk := greatest(coalesce(nullif(c ->> 'block', '')::int, 14), 1); maxd := coalesce(nullif(c ->> 'maxDays', '')::int, 91);
  nb := (p ->> 'blocks')::int;
  if nb < 1 or nb * blk > maxd then return jsonb_build_object('error', 'invalid'); end if;
  amt := fee1 + fee2 * (nb - 1);
  -- one open application per CNIC (not closed, and not yet finished)
  if exists (select 1 from dme_records where coll = 'visitors' and not deleted and data ->> 'kind' = 'obs'
       and regexp_replace(coalesce(data ->> 'cnic', ''), '\D', '', 'g') = cn and data -> 'closed' is null
       and (coalesce(data ->> 'start', '') = '' or coalesce(data ->> 'left', data ->> 'end') >= to_char(today, 'YYYY-MM-DD'))) then
    return jsonb_build_object('error', 'duplicate'); end if;
  -- next challan number for the year
  perform pg_advisory_xact_lock(hashtext('dme_obs_challan'));
  select coalesce(max(substring(f ->> 'challan' from '^OBS-' || yy || '-(\d+)$')::int), 0) + 1 into n
    from dme_records r cross join lateral jsonb_array_elements(case when jsonb_typeof(r.data -> 'fees') = 'array' then r.data -> 'fees' else '[]'::jsonb end) f
    where r.coll = 'visitors' and (f ->> 'challan') ~ ('^OBS-' || yy || '-\d+$');
  ch := 'OBS-' || yy || '-' || lpad(n::text, 4, '0');
  select coalesce(max(ord), 0) + 1 into o from dme_records where coll = 'visitors';
  rec := jsonb_build_object('id', vid, 'kind', 'obs', 'title', coalesce(p ->> 'title', ''),
    'name', regexp_replace(trim(p ->> 'name'), '^((dr|mr|ms|mrs)\.?\s+)+', '', 'i'), 'father', trim(p ->> 'father'), 'gender', p ->> 'gender',
    'cnic', substr(cn,1,5) || '-' || substr(cn,6,7) || '-' || substr(cn,13,1), 'mobile', p ->> 'mobile', 'email', lower(coalesce(p ->> 'email', '')),
    'cat', trim(p ->> 'cat'), 'degree', trim(p ->> 'degree'), 'inst', trim(p ->> 'inst'), 'yearStudy', coalesce(p ->> 'yearStudy', ''),
    'status2', coalesce(p ->> 'status2', ''), 'unit', trim(p ->> 'unit'), 'reason', trim(p ->> 'reason'), 'blocks', nb, 'sup', '', 'notes', '',
    'pin', pin, 'att', '{}'::jsonb,
    'docs', jsonb_strip_nulls(jsonb_build_object('degree', p -> 'docs' ->> 'degree', 'cnic', p -> 'docs' ->> 'cnic', 'cnic2', nullif(p -> 'docs' ->> 'cnic2', ''))),
    'fees', jsonb_build_array(jsonb_build_object('id', fid, 'kind', 'first', 'blocks', nb, 'amt', amt, 'challan', ch, 'at', at, 'by', 'Application form', 'status', 'unpaid')),
    'src', 'form', 'checked', false, 'regAt', at);
  who := trim(coalesce(rec ->> 'title', '') || ' ' || (rec ->> 'name'));
  insert into dme_records (coll, id, ord, data) values ('visitors', vid, o, rec);
  insert into dme_records (coll, id, data) values ('audit', aid, jsonb_build_object('id', aid, 'at', at, 'by', 'Application form',
    'what', 'Observership application: ' || who || ', ' || (rec ->> 'inst') || ', ' || (rec ->> 'unit') || '; challan ' || ch || ', PKR ' || amt || ' unpaid', 'ref', 'obs-' || vid));
  return jsonb_build_object('ok', true, 'challan', ch, 'amt', amt, 'date', to_char(today, 'YYYY-MM-DD'));
end $$;
revoke all on function public.dme_submit_obs(jsonb) from public;
grant execute on function public.dme_submit_obs(jsonb) to anon, authenticated;

drop policy if exists "dme forms upload" on storage.objects;
create policy "dme forms upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'dme-uploads' and (storage.foldername(name))[1] in ('pgt', 'receipts', 'rotating', 'observers'));

update storage.buckets set file_size_limit = 10485760 where id = 'dme-uploads';

-- =====================================================================
-- 07 · Observership application: photograph and institute documents (Nov 2026)
-- Run once in the Supabase SQL editor. Safe to run again, and safe to run
-- whether or not 06_observers.sql was run (it repeats what 06 set up).
--  1. dme_submit_obs: the online form now sends a photograph, the CNIC, and
--     either the institute ID card and the institute's endorsement letter
--     (attached to an institute) or the degree (not attached). Applicants
--     get only the application form; the DME office issues the challan.
--  2. Uploads from the form may go to the "observers" folder.
--  3. Files up to 10 MB (phone photos and scanned PDFs).
-- =====================================================================
create or replace function public.dme_submit_obs(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare vid text := dme_uid('V'); at text := dme_now(); pin text := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
        rec jsonb; o int; aid text := dme_uid('A'); fid text := dme_uid('F'); cn text := regexp_replace(coalesce(p ->> 'cnic', ''), '\D', '', 'g');
        c jsonb; fee1 int; fee2 int; blk int; maxd int; nb int; amt int; today date := (now() at time zone 'Asia/Karachi')::date;
        yy text := to_char((now() at time zone 'Asia/Karachi')::date, 'YY'); n int; ch text; who text;
        att boolean := coalesce(p ->> 'attached', '') = 'true'; d jsonb := coalesce(p -> 'docs', '{}'::jsonb); k text;
begin
  if p is null or length(p::text) > 12000 or length(coalesce(trim(p ->> 'name'), '')) < 3 or length(coalesce(trim(p ->> 'father'), '')) < 3
     or coalesce(trim(p ->> 'inst'), '') = '' or coalesce(trim(p ->> 'unit'), '') = '' or coalesce(trim(p ->> 'cat'), '') = ''
     or coalesce(trim(p ->> 'degree'), '') = '' or coalesce(trim(p ->> 'gender'), '') = '' or length(coalesce(trim(p ->> 'reason'), '')) < 5
     or coalesce(p ->> 'blocks', '') !~ '^\d{1,2}$' or coalesce(p ->> 'mobile', '') !~ '^03\d{2}-\d{7}$' or length(cn) <> 13
     or coalesce(p ->> 'attached', '') not in ('true', 'false')
     or coalesce(d ->> 'photo', '') !~ '^observers/' or coalesce(d ->> 'cnic', '') !~ '^observers/'
     or (att and (coalesce(d ->> 'idcard', '') !~ '^observers/' or coalesce(d ->> 'letter', '') !~ '^observers/'))
     or (not att and coalesce(d ->> 'degree', '') !~ '^observers/') then
    return jsonb_build_object('error', 'invalid'); end if;
  -- every other document given must also be in the observers folder
  foreach k in array array['cnic2', 'idcard', 'letter', 'degree'] loop
    if coalesce(d ->> k, '') <> '' and (d ->> k) !~ '^observers/' then return jsonb_build_object('error', 'invalid'); end if;
  end loop;
  select data -> 'forms' -> 'obs' into c from dme_records where coll = 'meta' and id = 'settings' and not deleted;
  if (c ->> 'open') = 'false' or coalesce(c ->> 'close', '') between '2000-01-01' and to_char(today - 1, 'YYYY-MM-DD') then
    return jsonb_build_object('error', 'closed'); end if;
  fee1 := coalesce(nullif(c ->> 'fee1', '')::int, 5000); fee2 := coalesce(nullif(c ->> 'fee2', '')::int, 3000);
  blk := greatest(coalesce(nullif(c ->> 'block', '')::int, 14), 1); maxd := coalesce(nullif(c ->> 'maxDays', '')::int, 91);
  nb := (p ->> 'blocks')::int;
  if nb < 1 or nb * blk > maxd then return jsonb_build_object('error', 'invalid'); end if;
  amt := fee1 + fee2 * (nb - 1);
  -- one open application per CNIC (not closed, and not yet finished)
  if exists (select 1 from dme_records where coll = 'visitors' and not deleted and data ->> 'kind' = 'obs'
       and regexp_replace(coalesce(data ->> 'cnic', ''), '\D', '', 'g') = cn and data -> 'closed' is null
       and (coalesce(data ->> 'start', '') = '' or coalesce(data ->> 'left', data ->> 'end') >= to_char(today, 'YYYY-MM-DD'))) then
    return jsonb_build_object('error', 'duplicate'); end if;
  -- next challan number for the year
  perform pg_advisory_xact_lock(hashtext('dme_obs_challan'));
  select coalesce(max(substring(f ->> 'challan' from '^OBS-' || yy || '-(\d+)$')::int), 0) + 1 into n
    from dme_records r cross join lateral jsonb_array_elements(case when jsonb_typeof(r.data -> 'fees') = 'array' then r.data -> 'fees' else '[]'::jsonb end) f
    where r.coll = 'visitors' and (f ->> 'challan') ~ ('^OBS-' || yy || '-\d+$');
  ch := 'OBS-' || yy || '-' || lpad(n::text, 4, '0');
  select coalesce(max(ord), 0) + 1 into o from dme_records where coll = 'visitors';
  rec := jsonb_build_object('id', vid, 'kind', 'obs', 'title', coalesce(p ->> 'title', ''),
    'name', regexp_replace(trim(p ->> 'name'), '^((dr|mr|ms|mrs)\.?\s+)+', '', 'i'), 'father', trim(p ->> 'father'), 'gender', p ->> 'gender',
    'cnic', substr(cn,1,5) || '-' || substr(cn,6,7) || '-' || substr(cn,13,1), 'mobile', p ->> 'mobile', 'email', lower(coalesce(p ->> 'email', '')),
    'cat', trim(p ->> 'cat'), 'degree', trim(p ->> 'degree'), 'inst', trim(p ->> 'inst'), 'yearStudy', coalesce(p ->> 'yearStudy', ''),
    'status2', coalesce(p ->> 'status2', ''), 'unit', trim(p ->> 'unit'), 'reason', trim(p ->> 'reason'), 'blocks', nb, 'attached', att, 'sup', '', 'notes', '',
    'pin', pin, 'att', '{}'::jsonb,
    'docs', jsonb_strip_nulls(jsonb_build_object('photo', d ->> 'photo', 'cnic', d ->> 'cnic', 'cnic2', nullif(d ->> 'cnic2', ''),
             'idcard', case when att then d ->> 'idcard' end, 'letter', case when att then d ->> 'letter' end, 'degree', nullif(d ->> 'degree', ''))),
    'fees', jsonb_build_array(jsonb_build_object('id', fid, 'kind', 'first', 'blocks', nb, 'amt', amt, 'challan', ch, 'at', at, 'by', 'Application form', 'status', 'unpaid')),
    'src', 'form', 'checked', false, 'regAt', at);
  who := trim(coalesce(rec ->> 'title', '') || ' ' || (rec ->> 'name'));
  insert into dme_records (coll, id, ord, data) values ('visitors', vid, o, rec);
  insert into dme_records (coll, id, data) values ('audit', aid, jsonb_build_object('id', aid, 'at', at, 'by', 'Application form',
    'what', 'Observership application: ' || who || ', ' || (rec ->> 'inst') || ', ' || (rec ->> 'unit') || '; application ' || ch || ' (fee PKR ' || amt || ', challan to be issued by the DME office)', 'ref', 'obs-' || vid));
  return jsonb_build_object('ok', true, 'challan', ch, 'amt', amt, 'date', to_char(today, 'YYYY-MM-DD'));
end $$;
revoke all on function public.dme_submit_obs(jsonb) from public;
grant execute on function public.dme_submit_obs(jsonb) to anon, authenticated;

drop policy if exists "dme forms upload" on storage.objects;
create policy "dme forms upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'dme-uploads' and (storage.foldername(name))[1] in ('pgt', 'receipts', 'rotating', 'observers'));

update storage.buckets set file_size_limit = 10485760 where id = 'dme-uploads';

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
