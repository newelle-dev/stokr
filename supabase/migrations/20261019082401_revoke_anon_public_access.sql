-- Migration: revoke_anon_public_access
-- Revoke all table, view, sequence, and routine privileges from anon in schema public.
-- In Stokr, all data access requires authentication (authenticated role). There are no public pages or public API endpoints that read or write database data.

-- 1. Revoke existing privileges on all tables and views in public
revoke all on all tables in schema public from anon;

-- 2. Revoke existing privileges on all sequences in public
revoke all on all sequences in schema public from anon;

-- 3. Revoke existing privileges on all routines/functions in public
revoke all on all routines in schema public from anon;

-- 4. Alter default privileges so future tables, sequences, and routines created in public do not grant privileges to anon
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on routines from anon;
