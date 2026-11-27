-- RIC DME Office · START AGAIN FROM EMPTY
-- Deletes all DME records and the team list in this Supabase project. Logins (Authentication → Users)
-- and uploaded files are kept. Run 02_pilot_setup.sql straight after this.
drop table if exists public.dme_records cascade;
drop table if exists public.dme_staff cascade;
drop function if exists public.dme_public_form(text, text);
drop function if exists public.dme_public_lists();
drop function if exists public.dme_submit_reg(text, jsonb, text, text);
drop function if exists public.dme_submit_fb(text, jsonb);
drop function if exists public.dme_submit_prop(text, jsonb);
drop function if exists public.dme_submit_pgt(jsonb);
drop function if exists public.dme_submit_rot(jsonb);
drop function if exists public.dme_att_info(text);
drop function if exists public.dme_checkin(text, text);
drop function if exists public.dme_public_bio(text);
drop function if exists public.dme_submit_bio(text, jsonb, text, text);
drop function if exists public.dme_claim(text);
drop function if exists public.dme_staff_sync() cascade;
drop function if exists public.dme_touch() cascade;
drop function if exists public.dme_role() cascade;
drop function if exists public.dme_can_conduct() cascade;
drop function if exists public.dme_submit_sur(text, text, jsonb) cascade;
drop function if exists public.dme_sur_who(text, text) cascade;
drop function if exists public.dme_sur_list() cascade;
drop function if exists public.dme_sur_closed() cascade;
drop function if exists public.dme_sur_find(text, text) cascade;
drop function if exists public.dme_mob(text) cascade;
drop function if exists public.dme_ws_pgts(text);
drop function if exists public.dme_submit_obs(jsonb);
