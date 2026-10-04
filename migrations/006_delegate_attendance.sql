-- Migration 006: one attendance row per delegate (wide table) instead of one row per delegate per scan checkpoint.
-- First scan creates the row (name, committee, portfolio, college); every later scan only fills in its own
-- column (day1_entry, day1_lunch, day2_entry, ...). Allocation rows stay in delegate_checkpoints (admin portal).
-- Idempotent. Additive: no existing table is changed or dropped.

create table if not exists public.delegate_attendance (
  id               bigint generated always as identity primary key,
  record_type      text    not null check (record_type in ('individual','delegation')),
  record_id        text    not null,
  member_index     integer not null default 0,
  allocation_id    text,
  delegate_name    text,
  committee        text,
  portfolio        text,
  college          text,

  day1_entry       boolean generated always as (day1_entry_at is not null) stored,
  day1_entry_at    timestamptz,
  day1_entry_by    text,
  day1_lunch       boolean generated always as (day1_lunch_at is not null) stored,
  day1_lunch_at    timestamptz,
  day1_lunch_by    text,
  day1_refreshment boolean generated always as (day1_refreshment_at is not null) stored,
  day1_refreshment_at timestamptz,
  day1_refreshment_by text,
  day2_entry       boolean generated always as (day2_entry_at is not null) stored,
  day2_entry_at    timestamptz,
  day2_entry_by    text,
  day2_lunch       boolean generated always as (day2_lunch_at is not null) stored,
  day2_lunch_at    timestamptz,
  day2_lunch_by    text,
  day2_refreshment boolean generated always as (day2_refreshment_at is not null) stored,
  day2_refreshment_at timestamptz,
  day2_refreshment_by text,

  notes            text,
  scan_history     jsonb       not null default '[]'::jsonb,  -- every scan/override/undo, so nothing is ever lost
  first_scanned_at timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint uq_delegate_attendance unique (record_type, record_id, member_index)
);

alter table public.delegate_attendance enable row level security;  -- server (service role) only
revoke all on public.delegate_attendance from anon, authenticated;

-- Atomic stamp: creates the delegate's row on first scan, then only fills the requested checkpoint column.
create or replace function public.stamp_attendance(
  p_record_type  text,
  p_record_id    text,
  p_member_index integer,
  p_checkpoint   text,
  p_by           text,
  p_force        boolean default false,
  p_redeem       boolean default true,
  p_name         text default null,
  p_committee    text default null,
  p_portfolio    text default null,
  p_college      text default null,
  p_allocation_id text default null,
  p_notes        text default null
) returns jsonb
language plpgsql
as $$
declare
  v_valid   text[] := array['day1_entry','day1_lunch','day1_refreshment','day2_entry','day2_lunch','day2_refreshment'];
  v_new_id  bigint;
  v_prev_at timestamptz;
  v_prev_by text;
  v_row     public.delegate_attendance;
  v_action  text;
begin
  if not (p_checkpoint = any (v_valid)) then
    raise exception 'Invalid checkpoint: %', p_checkpoint;
  end if;

  -- First scan of this delegate creates their row; later scans find it.
  insert into public.delegate_attendance
    (record_type, record_id, member_index, allocation_id, delegate_name, committee, portfolio, college)
  values
    (p_record_type, p_record_id, coalesce(p_member_index, 0), p_allocation_id, p_name, p_committee, p_portfolio, p_college)
  on conflict (record_type, record_id, member_index) do nothing
  returning id into v_new_id;

  -- Lock the row so two staff scanning the same pass at once cannot both "win".
  execute format('select %I, %I from public.delegate_attendance where record_type = $1 and record_id = $2 and member_index = $3 for update',
                 p_checkpoint || '_at', p_checkpoint || '_by')
    into v_prev_at, v_prev_by
    using p_record_type, p_record_id, coalesce(p_member_index, 0);

  if v_prev_at is not null and p_redeem and not p_force then
    select * into v_row from public.delegate_attendance
      where record_type = p_record_type and record_id = p_record_id and member_index = coalesce(p_member_index, 0);
    return jsonb_build_object('duplicate', true, 'created', false,
                              'redeemed_at', v_prev_at, 'redeemed_by', v_prev_by, 'row', to_jsonb(v_row));
  end if;

  v_action := case when not p_redeem then 'undo' when v_prev_at is not null then 'override' else 'stamp' end;

  execute format(
    'update public.delegate_attendance set
        %1$I = case when $1 then now() else null end,
        %2$I = case when $1 then $2 else null end,
        delegate_name = coalesce($3, delegate_name),
        committee     = coalesce($4, committee),
        portfolio     = coalesce($5, portfolio),
        college       = coalesce($6, college),
        allocation_id = coalesce($7, allocation_id),
        notes         = coalesce($8, notes),
        scan_history  = scan_history || jsonb_build_array(jsonb_build_object(''checkpoint'', $9, ''action'', $10, ''at'', now(), ''by'', $2)),
        updated_at    = now()
      where record_type = $11 and record_id = $12 and member_index = $13
      returning *',
    p_checkpoint || '_at', p_checkpoint || '_by')
  into v_row
  using p_redeem, p_by, p_name, p_committee, p_portfolio, p_college, p_allocation_id, p_notes,
        p_checkpoint, v_action, p_record_type, p_record_id, coalesce(p_member_index, 0);

  return jsonb_build_object('duplicate', false, 'created', v_new_id is not null, 'action', v_action, 'row', to_jsonb(v_row));
end;
$$;

revoke all on function public.stamp_attendance(text,text,integer,text,text,boolean,boolean,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.stamp_attendance(text,text,integer,text,text,boolean,boolean,text,text,text,text,text,text) to service_role;
