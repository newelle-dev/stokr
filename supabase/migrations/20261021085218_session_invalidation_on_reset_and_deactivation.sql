-- Migration: Invalidate active sessions on staff password reset and profile deactivation

-- 1. Update begin_staff_password_reset to delete all active sessions for target staff
create or replace function public.begin_staff_password_reset(p_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_shop_id uuid;
  v_staff_shop_id uuid;
  v_staff_role text;
  v_staff_username text;
  v_staff_is_active boolean;
  v_auth_hash text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  -- Caller must be an active owner
  select shop_id into v_caller_shop_id
  from public.profiles
  where id = v_caller_id
    and is_active = true
    and role = 'owner';

  if v_caller_shop_id is null then
    raise exception 'Caller must be an active shop owner.';
  end if;

  -- Target must be an active staff member of the same shop
  select shop_id, role, username, is_active
  into v_staff_shop_id, v_staff_role, v_staff_username, v_staff_is_active
  from public.profiles
  where id = p_staff_id;

  if v_staff_shop_id is null or v_staff_shop_id <> v_caller_shop_id then
    raise exception 'Staff member not found in your shop.';
  end if;

  if v_staff_role <> 'staff' then
    raise exception 'Only staff passwords can be reset via this function.';
  end if;

  if not v_staff_is_active then
    raise exception 'Cannot reset password for deactivated staff member.';
  end if;

  -- Fetch current auth encrypted password
  select encrypted_password into v_auth_hash
  from auth.users
  where id = p_staff_id;

  if v_auth_hash is null or v_auth_hash = '' then
    raise exception 'Auth user record or password hash not found.';
  end if;

  -- Refresh snapshot in profile_security (ALWAYS refreshes, regardless of flag state)
  insert into public.profile_security (shop_id, profile_id, temp_password_hash, created_at)
  values (v_caller_shop_id, p_staff_id, v_auth_hash, now())
  on conflict (profile_id) do update
  set temp_password_hash = excluded.temp_password_hash,
      created_at = now();

  -- Allow trigger to update must_change_password
  perform set_config('stokr.allow_password_flag_change', 'true', true);

  -- Set must_change_password = true
  update public.profiles
  set must_change_password = true
  where id = p_staff_id;

  perform set_config('stokr.allow_password_flag_change', 'false', true);

  -- Invalidate existing sessions for target staff member
  delete from auth.sessions where user_id = p_staff_id;

  -- Record in activity log
  insert into public.activity_log (
    shop_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    details,
    created_at
  ) values (
    v_caller_shop_id,
    v_caller_id,
    'staff_password_reset_initiated',
    'profile',
    p_staff_id::text,
    jsonb_build_object('username', v_staff_username),
    now()
  );
end;
$$;

revoke all on function public.begin_staff_password_reset(uuid) from public, anon;
grant execute on function public.begin_staff_password_reset(uuid) to authenticated;

-- 2. Trigger on profiles to terminate all sessions on profile deactivation
create or replace function public.terminate_sessions_on_profile_deactivation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_active = true and new.is_active = false then
    delete from auth.sessions where user_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.terminate_sessions_on_profile_deactivation() from public, anon, authenticated;

drop trigger if exists trg_terminate_sessions_on_profile_deactivation on public.profiles;
create trigger trg_terminate_sessions_on_profile_deactivation
after update of is_active on public.profiles
for each row
when (old.is_active = true and new.is_active = false)
execute function public.terminate_sessions_on_profile_deactivation();
