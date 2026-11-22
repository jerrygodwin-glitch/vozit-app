-- Records the real moment a user agreed to the Terms/Privacy/Cookie Policy
-- at signup, server-side — not just a client-side checkbox, which alone
-- wouldn't stop a direct call to /api/auth/register and wouldn't give a
-- clickwrap agreement a timestamp to point to if it's ever relied on.
-- See src/app/api/auth/register/route.ts.
alter table public.users add column if not exists terms_accepted_at timestamptz;
