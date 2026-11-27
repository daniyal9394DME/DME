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
