-- =====================================================================
--  RIC DME Management System — Phase 1 schema (PGTs + Faculty)
--  Rawalpindi Institute of Cardiology · Medical Education & Training
--  Run once in Supabase → SQL Editor on a NEW, separate project.
-- =====================================================================
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- 1. STAFF USERS  (DME office only; PGTs never log in)
-- ---------------------------------------------------------------------
create type staff_role as enum ('admin','editor','viewer');

create table staff (
  user_id    uuid primary key references auth.users on delete cascade,
  full_name  text not null,
  role       staff_role not null default 'viewer',
  created_at timestamptz not null default now()
);

create or replace function is_staff(min_role staff_role default 'viewer')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff s where s.user_id = auth.uid()
      and case min_role when 'viewer' then true
                        when 'editor' then s.role in ('editor','admin')
                        when 'admin'  then s.role = 'admin' end);
$$;

-- ---------------------------------------------------------------------
-- 2. REFERENCE TABLES  (replace the Settings tab; editable in the app)
-- ---------------------------------------------------------------------
create table specialties (
  id                     smallint generated always as identity primary key,
  name                   text not null unique,
  rotation_category      text not null default 'All RIC' check (rotation_category in ('Rotational','All RIC')),
  fcps_initial_elsewhere numeric(3,1),   -- years
  fcps_final_ric         numeric(3,1),
  uhs_initial_ric        numeric(3,1),
  uhs_middle_elsewhere   numeric(3,1),
  uhs_final_ric          numeric(3,1),
  official_title         text,
  level                  text check (level in ('Level 3','Level 4')),
  level_order            smallint,
  beds                   text,
  councils               text,
  notes                  text,
  is_teaching            boolean not null default true,   -- false = faculty-only (Nephrology, Pulmonology)
  sort_order             smallint not null default 99
);

create type program_type as enum ('FCPS','UHS (MS)','UHS (MD)');

-- Default programme duration per specialty + program (editable; used to prefill)
create table program_durations (
  specialty_id smallint references specialties on delete cascade,
  program      program_type,
  years        numeric(3,1) not null,
  primary key (specialty_id, program)
);

create table leave_types (
  id     smallint generated always as identity primary key,
  name   text not null unique,
  active boolean not null default true
);

create table rotation_sites (
  id     smallint generated always as identity primary key,
  name   text not null unique,         -- e.g. Holy Family Hospital
  short  text not null unique,         -- e.g. HFH
  active boolean not null default true
);

create table settings (
  key   text primary key,
  value jsonb not null,
  label text
);

-- ---------------------------------------------------------------------
-- 3. FACULTY
-- ---------------------------------------------------------------------
create type designation as enum ('Professor','Associate Professor','Assistant Professor','Senior Registrar');
create type credential_type as enum ('PMDC Faculty Registration','CPSP Supervisory Certificate','UHS Supervisory Certificate');

create table faculty (
  id                 uuid primary key default gen_random_uuid(),
  title_prefix       text not null default 'Dr.' check (title_prefix in ('Dr.','Prof. Dr.')),
  full_name          text not null,           -- stored WITHOUT prefix
  pmdc_no            text unique,
  faculty_reg_no     text,
  designation        designation not null,
  specialty_id       smallint not null references specialties,
  unit               text check (unit in ('Unit 1','Unit 2','Unit 3','Unit 4')),
  cpsp_supervisor    boolean not null default false,
  uhs_supervisor     boolean not null default false,
  mobile             text,
  email              text,
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index faculty_name_uq on faculty (lower(full_name));

create table faculty_credentials (
  id          uuid primary key default gen_random_uuid(),
  faculty_id  uuid not null references faculty on delete cascade,
  type        credential_type not null,
  issue_date  date,
  expiry_date date,
  file_path   text,                           -- storage: faculty-docs/<faculty_id>/...
  created_at  timestamptz not null default now(),
  check (expiry_date is null or issue_date is null or expiry_date >= issue_date)
);
-- latest certificate per type is the current one; older rows are kept as history

-- ---------------------------------------------------------------------
-- 4. PGTs
-- ---------------------------------------------------------------------
create type registration_state as enum ('Pending','Verified','Rejected');

create sequence pgt_code_seq start 1;

create table pgts (
  id                  uuid primary key default gen_random_uuid(),
  pgt_code            text unique,                         -- RIC-PGT-0001, assigned on verification
  registration        registration_state not null default 'Pending',
  full_name           text not null,                       -- without "Dr."
  father_name         text not null,
  cnic                text not null unique check (cnic ~ '^\d{5}-\d{7}-\d$'),
  pmdc_no             text not null unique,
  mobile              text not null check (mobile ~ '^03\d{2}-\d{7}$'),
  email               text,
  domicile            text not null,
  program             program_type not null,
  specialty_id        smallint not null references specialties,
  training_start      date not null,
  duration_years      numeric(3,1) not null check (duration_years between 1 and 7),
  completion_override date,          -- set by DME when completion differs (leave, freeze, extension)
  -- as declared by the PGT at registration (kept for verification; DME confirms)
  declared_year       smallint check (declared_year between 1 and 7),
  declared_completion date,
  -- registration uploads (storage bucket: pgt-docs/<id>/...)
  photo_path          text,
  cnic_path           text,
  pmdc_path           text,
  joining_letter_path text,
  submitted_at        timestamptz not null default now(),
  verified_at         timestamptz,
  verified_by         uuid references auth.users,
  rejection_reason    text,
  notes               text,
  updated_at          timestamptz not null default now()
);

-- Expected completion = start + duration − 1 day, unless overridden by DME
create or replace function pgt_expected_completion(p pgts) returns date language sql immutable as $$
  select coalesce(p.completion_override,
    (p.training_start + make_interval(months => (p.duration_years*12)::int) - interval '1 day')::date);
$$;

-- ---------------------------------------------------------------------
-- 5. HISTORY TABLES  (nothing is overwritten; current state = latest row)
-- ---------------------------------------------------------------------
create type pgt_status as enum ('Active','Frozen','Maternity Leave','Completed','Resigned','Terminated');

create table pgt_status_history (
  id             uuid primary key default gen_random_uuid(),
  pgt_id         uuid not null references pgts on delete cascade,
  status         pgt_status not null,
  effective_date date not null,
  notes          text,
  document_path  text,
  created_by     uuid references auth.users default auth.uid(),
  created_at     timestamptz not null default now()
);
create index on pgt_status_history (pgt_id, effective_date desc, created_at desc);

create table pgt_leaves (
  id            uuid primary key default gen_random_uuid(),
  pgt_id        uuid not null references pgts on delete cascade,
  leave_type_id smallint not null references leave_types,
  start_date    date not null,
  end_date      date not null,
  reason        text,
  notes         text,
  document_path text,
  created_by    uuid references auth.users default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_date >= start_date),
  -- one PGT cannot have two overlapping leave periods
  exclude using gist (pgt_id with =, daterange(start_date, end_date, '[]') with &&)
);

create table pgt_rotations (
  id             uuid primary key default gen_random_uuid(),
  pgt_id         uuid not null references pgts on delete cascade,
  site_id        smallint not null references rotation_sites,
  start_date     date not null,
  return_date    date,
  notes          text,
  created_by     uuid references auth.users default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (return_date is null or return_date >= start_date)
);
-- If a PGT has no rotation row, the view uses the expected dates from specialty rules.

create table pgt_supervisors (
  id         uuid primary key default gen_random_uuid(),
  pgt_id     uuid not null references pgts on delete cascade,
  faculty_id uuid not null references faculty,
  from_date  date not null,
  to_date    date,
  notes      text,
  created_by uuid references auth.users default auth.uid(),
  created_at timestamptz not null default now(),
  check (to_date is null or to_date >= from_date)
);
create unique index one_current_supervisor on pgt_supervisors (pgt_id) where to_date is null;

-- ---------------------------------------------------------------------
-- 6. AUDIT LOG  (who changed what, when — every edit on every table)
-- ---------------------------------------------------------------------
create table audit_log (
  id         bigint generated always as identity primary key,
  table_name text not null,
  record_id  uuid,
  action     text not null,
  old_data   jsonb,
  new_data   jsonb,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);

create or replace function audit_trigger() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (table_name, record_id, action, old_data, new_data)
  values (tg_table_name,
          coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(old)->>'id')::uuid),
          tg_op,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['faculty','faculty_credentials','pgts','pgt_status_history','pgt_leaves','pgt_rotations','pgt_supervisors'] loop
    execute format('create trigger audit_%1$s after insert or update or delete on %1$I for each row execute function audit_trigger()', t);
  end loop;
  foreach t in array array['faculty','pgts','pgt_leaves','pgt_rotations'] loop
    execute format('create trigger touch_%1$s before update on %1$I for each row execute function touch_updated_at()', t);
  end loop;
end $$;

-- Assign PGT code on verification
create or replace function assign_pgt_code() returns trigger language plpgsql as $$
begin
  if new.registration = 'Verified' and new.pgt_code is null then
    new.pgt_code := 'RIC-PGT-' || lpad(nextval('pgt_code_seq')::text, 4, '0');
    new.verified_at := now(); new.verified_by := auth.uid();
  end if;
  return new;
end $$;
create trigger pgt_code before insert or update on pgts for each row execute function assign_pgt_code();

-- On verification, a PGT-declared completion date that differs from the calculated one is kept as the override
create or replace function accept_declared_completion() returns trigger language plpgsql as $$
begin
  if new.registration = 'Verified' and old.registration is distinct from 'Verified'
     and new.completion_override is null and new.declared_completion is not null
     and new.declared_completion <> (new.training_start + make_interval(months => (new.duration_years*12)::int) - interval '1 day')::date then
    new.completion_override := new.declared_completion;
  end if;
  return new;
end $$;
create trigger pgt_accept_completion before update on pgts for each row execute function accept_declared_completion();

-- ---------------------------------------------------------------------
-- 7. CURRENT-STATE VIEW  (replaces "Trainee Analysis")
-- ---------------------------------------------------------------------
create or replace view pgt_current with (security_invoker = true) as
with st as (
  select distinct on (pgt_id) pgt_id, status, effective_date
  from pgt_status_history where effective_date <= current_date
  order by pgt_id, effective_date desc, created_at desc
), lv as (
  select distinct on (l.pgt_id) l.pgt_id, t.name as leave_type, l.start_date, l.end_date
  from pgt_leaves l join leave_types t on t.id = l.leave_type_id
  where current_date between l.start_date and l.end_date
  order by l.pgt_id, l.start_date desc
), lv_recent as (
  select pgt_id, max(end_date) as last_end
  from pgt_leaves where end_date < current_date group by pgt_id
), rot as (
  select distinct on (r.pgt_id) r.pgt_id, s.short as site, r.start_date, r.return_date
  from pgt_rotations r join rotation_sites s on s.id = r.site_id
  order by r.pgt_id, r.start_date desc
), sup as (
  select ps.pgt_id, f.id as faculty_id, f.title_prefix || ' ' || f.full_name as supervisor
  from pgt_supervisors ps join faculty f on f.id = ps.faculty_id where ps.to_date is null
), base as (
  select p.*, sp.name as specialty, sp.rotation_category,
         pgt_expected_completion(p) as expected_completion,
         case when sp.rotation_category = 'Rotational' then
           coalesce(rot.start_date,
             case when p.program = 'FCPS' then p.training_start
                  else (p.training_start + make_interval(months => (coalesce(sp.uhs_initial_ric,0.5)*12)::int))::date end)
         end as rotation_start,
         case when sp.rotation_category = 'Rotational' then
           coalesce(rot.return_date,
             (p.training_start + interval '24 months')::date)
         end as return_to_ric,
         rot.site as rotation_site,
         coalesce(st.status, 'Active') as status, st.effective_date as status_date,
         lv.leave_type, lv.start_date as leave_start, lv.end_date as leave_end,
         lv_recent.last_end as last_leave_end,
         sup.faculty_id as supervisor_id, sup.supervisor,
         case when p.program = 'FCPS' then 'CPSP' else 'UHS' end as approving_body
  from pgts p
  join specialties sp on sp.id = p.specialty_id
  left join st on st.pgt_id = p.id
  left join lv on lv.pgt_id = p.id
  left join lv_recent on lv_recent.pgt_id = p.id
  left join rot on rot.pgt_id = p.id
  left join sup on sup.pgt_id = p.id
  where p.registration = 'Verified'
)
select b.*,
  case
    when b.status in ('Completed','Resigned','Terminated') then b.status::text
    when b.status in ('Frozen','Maternity Leave') then 'Training paused (' || b.status::text || ')'
    when b.rotation_category = 'All RIC' then 'At RIC (entire training)'
    when current_date >= b.expected_completion then 'Past expected completion'
    when current_date < b.rotation_start then 'RIC - pre-rotation'
    when current_date < b.return_to_ric then 'On rotation'
    else 'RIC - final phase'
  end as phase,
  case when b.return_to_ric > current_date then b.return_to_ric - current_date end as days_to_return,
  greatest(b.expected_completion - current_date, 0) as days_to_completion,
  case when b.leave_end is not null then 'On Leave'
       when b.last_leave_end >= current_date - coalesce((select (value)::int from settings where key='leave_recent_days'), 7) then 'Leave Ended Recently'
  end as leave_state,
  case when b.leave_end is not null then b.leave_end - current_date end as leave_days_left,
  b.status not in ('Completed','Resigned','Terminated') as is_active,
  -- Jan/Jul induction session labels
  (case when extract(month from b.training_start) <= 6 then 'Jan ' else 'Jul ' end) || to_char(b.training_start,'YY') as induction_session,
  (case when extract(month from b.expected_completion) <= 6 then 'Jan ' else 'Jul ' end) || to_char(b.expected_completion,'YY') as completion_session
from base b;

-- Faculty current view (replaces "Faculty Analysis")
create or replace view faculty_current with (security_invoker = true) as
with cred as (
  select distinct on (faculty_id, type) faculty_id, type, issue_date, expiry_date, file_path
  from faculty_credentials order by faculty_id, type, issue_date desc nulls last, created_at desc
), warn as (select coalesce((select (value)::int from settings where key='cert_expiry_warning_days'), 90) as d)
select f.*, sp.name as specialty,
  case when f.cpsp_supervisor and f.uhs_supervisor then 'CPSP & UHS'
       when f.cpsp_supervisor then 'CPSP' when f.uhs_supervisor then 'UHS' end as supervisor_type,
  (select count(*) from pgt_current pc where pc.supervisor_id = f.id and pc.is_active) as pgt_count,
  (select count(*) from pgt_current pc where pc.supervisor_id = f.id and pc.is_active and pc.program = 'FCPS') as pgt_count_cpsp,
  (select count(*) from pgt_current pc where pc.supervisor_id = f.id and pc.is_active and pc.program <> 'FCPS') as pgt_count_uhs,
  pm.issue_date as pmdc_issue, pm.expiry_date as pmdc_expiry,
  case when pm.faculty_id is null then 'Not Registered' when pm.expiry_date < current_date then 'Expired'
       when pm.expiry_date <= current_date + warn.d then 'Expiring Soon' else 'Registered' end as pmdc_status,
  cp.issue_date as cpsp_cert_issue, cp.expiry_date as cpsp_cert_expiry,
  case when cp.faculty_id is null then 'Not Certified' when cp.expiry_date < current_date then 'Expired'
       when cp.expiry_date <= current_date + warn.d then 'Expiring Soon' else 'Certified' end as cpsp_cert_status,
  uh.issue_date as uhs_cert_issue, uh.expiry_date as uhs_cert_expiry,
  case when uh.faculty_id is null then 'Not Certified' when uh.expiry_date < current_date then 'Expired'
       when uh.expiry_date <= current_date + warn.d then 'Expiring Soon' else 'Certified' end as uhs_cert_status
from faculty f
join specialties sp on sp.id = f.specialty_id
cross join warn
left join cred pm on pm.faculty_id = f.id and pm.type = 'PMDC Faculty Registration'
left join cred cp on cp.faculty_id = f.id and cp.type = 'CPSP Supervisory Certificate'
left join cred uh on uh.faculty_id = f.id and uh.type = 'UHS Supervisory Certificate';

-- ---------------------------------------------------------------------
-- 8. PUBLIC REGISTRATION  (no login; PGT submits → Pending)
-- ---------------------------------------------------------------------
-- Lists the public form needs (specialties, supervisors) without exposing other data
create or replace function public_form_options() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'specialties', (select jsonb_agg(jsonb_build_object('id',id,'name',name) order by sort_order, name) from specialties where is_teaching),
    'durations',   (select jsonb_agg(jsonb_build_object('specialty_id',specialty_id,'program',program,'years',years)) from program_durations),
    'supervisors', (select jsonb_agg(jsonb_build_object('id',id,'name',title_prefix||' '||full_name,'specialty_id',specialty_id,'cpsp',cpsp_supervisor,'uhs',uhs_supervisor) order by full_name)
                    from faculty where active and (cpsp_supervisor or uhs_supervisor)));
$$;

-- Duplicate check: answers only yes/no, never returns the existing record
create or replace function registration_exists(p_cnic text, p_pmdc text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from pgts where cnic = p_cnic or lower(pmdc_no) = lower(p_pmdc));
$$;

create or replace function submit_registration(r jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if registration_exists(r->>'cnic', r->>'pmdc_no') then
    raise exception 'A registration with this CNIC or PMDC number already exists. Contact the DME office.';
  end if;
  insert into pgts (full_name, father_name, cnic, pmdc_no, mobile, email, domicile, program, specialty_id,
                    training_start, duration_years, photo_path, cnic_path, pmdc_path, joining_letter_path)
  values (r->>'full_name', r->>'father_name', r->>'cnic', upper(r->>'pmdc_no'), r->>'mobile', nullif(r->>'email',''),
          r->>'domicile', (r->>'program')::program_type, (r->>'specialty_id')::smallint,
          (r->>'training_start')::date, (r->>'duration_years')::numeric,
          r->>'photo_path', r->>'cnic_path', r->>'pmdc_path', r->>'joining_letter_path')
  returning id into new_id;
  -- PGT-declared year and completion; a differing completion date becomes the override once DME verifies
  update pgts set declared_year = nullif(r->>'current_year','')::smallint,
                  declared_completion = nullif(r->>'expected_completion','')::date
   where id = new_id;
  if nullif(r->>'supervisor_id','') is not null then
    insert into pgt_supervisors (pgt_id, faculty_id, from_date, created_by)
    values (new_id, (r->>'supervisor_id')::uuid, (r->>'training_start')::date, null);
  end if;
  insert into pgt_status_history (pgt_id, status, effective_date, notes, created_by)
  values (new_id, 'Active', (r->>'training_start')::date, 'Self-registration', null);
  -- Current posting: RIC | Rotation | Frozen
  if r->>'duty' = 'Rotation' then
    insert into pgt_rotations (pgt_id, site_id, start_date, return_date, notes, created_by)
    values (new_id,
            coalesce((select id from rotation_sites where short = r->>'site'),
                     (select id from rotation_sites where short = 'OTHER')),
            (r->>'rotation_start')::date, nullif(r->>'expected_return','')::date,
            case when r->>'site' = 'Other' then 'Hospital stated by PGT: ' || (r->>'site_other') end, null);
  elsif r->>'duty' = 'Frozen' then
    insert into pgt_status_history (pgt_id, status, effective_date, notes, created_by)
    values (new_id, 'Frozen', (r->>'frozen_since')::date, 'Declared at registration', null);
  end if;
  return 'REG-' || upper(substr(new_id::text, 1, 8));
end $$;

grant execute on function public_form_options(), registration_exists(text,text), submit_registration(jsonb) to anon;

-- ---------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY  (staff only; anon goes through the functions above)
-- ---------------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['staff','specialties','program_durations','leave_types','rotation_sites','settings','faculty',
                           'faculty_credentials','pgts','pgt_status_history','pgt_leaves','pgt_rotations','pgt_supervisors','audit_log'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "%1$s read" on %1$I for select to authenticated using (is_staff(''viewer''))', t);
    if t not in ('audit_log','staff') then
      execute format('create policy "%1$s write" on %1$I for all to authenticated using (is_staff(''editor'')) with check (is_staff(''editor''))', t);
    end if;
  end loop;
end $$;
create policy "staff admin" on staff for all to authenticated using (is_staff('admin')) with check (is_staff('admin'));

-- ---------------------------------------------------------------------
-- 10. STORAGE  (private buckets; registration uploads go to pgt-docs/pending/)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('pgt-docs', 'pgt-docs', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('faculty-docs', 'faculty-docs', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf']);

create policy "anon upload registration docs" on storage.objects for insert to anon
  with check (bucket_id = 'pgt-docs' and (storage.foldername(name))[1] = 'pending');
create policy "staff read docs" on storage.objects for select to authenticated
  using (bucket_id in ('pgt-docs','faculty-docs') and is_staff('viewer'));
create policy "staff write docs" on storage.objects for all to authenticated
  using (bucket_id in ('pgt-docs','faculty-docs') and is_staff('editor'))
  with check (bucket_id in ('pgt-docs','faculty-docs') and is_staff('editor'));

-- ---------------------------------------------------------------------
-- 11. SEED DATA  (from the current DME Live Database → Settings tab)
-- ---------------------------------------------------------------------
insert into specialties (name, rotation_category, fcps_initial_elsewhere, fcps_final_ric, uhs_initial_ric, uhs_middle_elsewhere, uhs_final_ric,
                         official_title, level, level_order, beds, councils, notes, is_teaching, sort_order) values
 ('General Cardiology','Rotational',2,3,0.5,1.5,3,'FCPS / MD General Cardiology','Level 3',1,null,'CPSP, UHS',null,true,1),
 ('Cardiac Surgery','Rotational',2,3,0.5,1.5,3,'FCPS / MS Cardiac Surgery','Level 3',2,null,'CPSP, UHS',null,true,2),
 ('Anaesthesiology','Rotational',2,2,0.5,1.5,3,'FCPS / MS Anaesthesiology','Level 3',3,null,'CPSP, UHS','Only specialty with a shorter 2-yr final RIC phase (FCPS track)',true,3),
 ('Cardiothoracic Anaesthesia','Rotational',2,3,0.5,1.5,3,'FCPS Cardiothoracic Anaesthesia','Level 3',4,null,'CPSP',null,true,4),
 ('Radiology','All RIC',null,null,null,null,null,'FCPS Radiology','Level 3',5,null,'CPSP',null,true,5),
 ('Interventional Cardiology','All RIC',null,null,null,null,null,'FCPS / MS Interventional Cardiology','Level 4',1,'54','CPSP, UHS',null,true,6),
 ('Paediatric Cardiology','All RIC',null,null,null,null,null,'FCPS / MD Paediatric Cardiology','Level 4',2,'36','CPSP, UHS',null,true,7),
 ('Paediatric Cardiac Surgery','All RIC',null,null,null,null,null,'Paediatric and Congenital Cardiac Surgery','Level 4',3,'22','CPSP',null,true,8),
 ('Electrophysiology','All RIC',null,null,null,null,null,'FCPS Clinical Cardiac Electrophysiology','Level 4',4,'24','CPSP',null,true,9),
 ('Nephrology','All RIC',null,null,null,null,null,null,null,null,null,null,'Faculty only',false,20),
 ('Pulmonology','All RIC',null,null,null,null,null,null,null,null,null,null,'Faculty only',false,21);

-- Default durations (from the Specialty Catalog; Radiology listed as 4–5 yr → 4 used, editable per PGT)
insert into program_durations (specialty_id, program, years)
select s.id, d.program::program_type, d.years from (values
 ('General Cardiology','FCPS',5),('General Cardiology','UHS (MD)',5),
 ('Cardiac Surgery','FCPS',5),('Cardiac Surgery','UHS (MS)',5),
 ('Anaesthesiology','FCPS',4),('Anaesthesiology','UHS (MS)',5),
 ('Cardiothoracic Anaesthesia','FCPS',5),
 ('Radiology','FCPS',4),
 ('Interventional Cardiology','FCPS',2),('Interventional Cardiology','UHS (MS)',2),
 ('Paediatric Cardiology','FCPS',3),('Paediatric Cardiology','UHS (MD)',3),
 ('Paediatric Cardiac Surgery','FCPS',3),
 ('Electrophysiology','FCPS',2)
) d(spec, program, years) join specialties s on s.name = d.spec;

insert into leave_types (name) values ('Umrah'),('Casual'),('Sick'),('Study'),('Maternity');

insert into rotation_sites (name, short) values
 ('Holy Family Hospital','HFH'),('Benazir Bhutto Hospital','BBH'),('Combined Military Hospital','CMH'),('District Headquarters Hospital','DHQ'),('Other hospital','OTHER');

insert into settings (key, value, label) values
 ('return_red_days', '14', 'Returning soon: red at ≤ days'),
 ('return_yellow_days', '30', 'Returning soon: amber at ≤ days'),
 ('complete_red_days', '30', 'Completing soon: red at ≤ days'),
 ('complete_yellow_days', '90', 'Completing soon: amber at ≤ days'),
 ('pgt_overload', '10', 'Supervisor overload at ≥ PGTs'),
 ('leave_end_soon_days', '14', 'Leave ending soon: ≤ days'),
 ('leave_recent_days', '7', 'Show "leave ended recently" for days'),
 ('cert_expiry_warning_days', '90', 'Certificate expiry warning: days');
