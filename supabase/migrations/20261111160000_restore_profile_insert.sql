-- Unit 10 follow-up: 20261111120000_owner_onboarding revoked INSERT on profiles by mistake.
-- Owners add staff through the app (createStaffAction) with their own session, so
-- authenticated needs INSERT on profiles again. Row rules still come from the
-- profiles_insert_owner RLS policy and the tr_validate_profile_mutation trigger;
-- only the table grant is restored here (same fix as 20261111150000 for branches).
grant insert on public.profiles to authenticated;
