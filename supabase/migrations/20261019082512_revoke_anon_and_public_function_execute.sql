-- Migration: revoke_anon_and_public_function_execute
-- In Postgres, functions grant EXECUTE to PUBLIC by default.
-- Revoke EXECUTE from PUBLIC and anon on all public functions and routines to prevent any unauthenticated execution via inheritance.
-- Grant EXECUTE explicitly to authenticated.

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

alter default privileges in schema public revoke execute on routines from public, anon;
alter default privileges in schema public grant execute on routines to authenticated;
