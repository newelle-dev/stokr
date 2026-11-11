-- Unit 10 follow-up: 20261111120000_owner_onboarding revoked INSERT on branches by mistake.
-- Owners add branches through the app (createBranchAction) with their own session, so
-- authenticated needs INSERT on branches again. Row rules still come from RLS and the
-- branch triggers; only the table grant is restored here (owner approved 2026-11-11).
grant insert on public.branches to authenticated;
