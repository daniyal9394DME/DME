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
