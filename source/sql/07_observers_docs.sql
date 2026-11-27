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
