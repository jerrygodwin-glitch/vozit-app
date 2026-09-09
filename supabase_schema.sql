-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  VozIt — Full Database Schema (v2 with Assignments)                    ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL → New Query → Paste → Run ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════════════════════════════════
-- USERS
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.users (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username          TEXT UNIQUE NOT NULL,
  display_name      TEXT NOT NULL,
  avatar_url        TEXT,
  bio               TEXT,
  country           TEXT,
  reporter_type     TEXT CHECK (reporter_type IN ('eyewitness','journalist','activist','hobbyist')),
  tier              TEXT NOT NULL DEFAULT 'starter'
                      CHECK (tier IN ('starter','silver','gold','platinum')),
  credibility_score NUMERIC(5,2) NOT NULL DEFAULT 80.00,
  report_count      INT NOT NULL DEFAULT 0,
  total_earned      NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  pending_payout    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  topics            TEXT[] DEFAULT '{}',
  stripe_account_id TEXT,
  payout_provider   TEXT CHECK (payout_provider IN ('stripe','payoneer','flutterwave','wise')),
  payout_method     TEXT CHECK (payout_method IN ('bank_transfer','mobile_money','debit_card')),
  payout_account_id TEXT,
  revenue_opt_in    BOOLEAN NOT NULL DEFAULT false,
  is_suspended      BOOLEAN NOT NULL DEFAULT false,
  strike_count      INT NOT NULL DEFAULT 0,
  role              TEXT CHECK (role IN ('reporter','moderator','admin')) DEFAULT 'reporter',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════
-- REPORTS
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.reports (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  who               TEXT NOT NULL,
  what              TEXT NOT NULL,
  where_text        TEXT NOT NULL,
  location_name     TEXT NOT NULL,
  when_happened     TIMESTAMPTZ NOT NULL,
  why               TEXT NOT NULL,
  latitude          NUMERIC(10,6),
  longitude         NUMERIC(10,6),
  mux_upload_id     TEXT,
  mux_asset_id      TEXT,
  mux_playback_id   TEXT,
  duration_seconds  NUMERIC(5,1),
  thumbnail_url     TEXT,
  series_id         UUID,
  series_part       INT DEFAULT 1,
  parent_report_id  UUID REFERENCES public.reports(id),
  -- Assignment link
  assignment_id     UUID,  -- FK added after assignments table
  assignment_angle_id UUID,
  assignment_accepted BOOLEAN DEFAULT false,
  assignment_bounty_paid BOOLEAN DEFAULT false,
  --
  status            TEXT NOT NULL DEFAULT 'processing'
                      CHECK (status IN ('processing','published','flagged','removed')),
  removal_reason    TEXT,
  upvotes           INT NOT NULL DEFAULT 0,
  downvotes         INT NOT NULL DEFAULT 0,
  credibility_pct   NUMERIC(5,2) NOT NULL DEFAULT 80.00,
  view_count        INT NOT NULL DEFAULT 0,
  share_count       INT NOT NULL DEFAULT 0,
  is_ai_flagged     BOOLEAN NOT NULL DEFAULT false,
  gps_verified      BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_status ON public.reports(status, created_at DESC);
CREATE INDEX idx_reports_user ON public.reports(user_id);
CREATE INDEX idx_reports_series ON public.reports(series_id);
CREATE INDEX idx_reports_assignment ON public.reports(assignment_id);

-- ══════════════════════════════════════════════════════════════════════════
-- VOTES
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.votes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  report_id  UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  value      SMALLINT NOT NULL CHECK (value IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, report_id)
);

-- ══════════════════════════════════════════════════════════════════════════
-- TASKS (one-shot coverage requests)
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.tasks (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by               UUID NOT NULL REFERENCES public.users(id),
  title                    TEXT NOT NULL,
  description              TEXT NOT NULL,
  location_name            TEXT NOT NULL,
  latitude                 NUMERIC(10,6),
  longitude                NUMERIC(10,6),
  reward_usd               NUMERIC(8,2) NOT NULL CHECK (reward_usd >= 5),
  deadline                 TIMESTAMPTZ NOT NULL,
  status                   TEXT NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open','claimed','submitted','completed','expired')),
  claimed_by               UUID REFERENCES public.users(id),
  report_id                UUID REFERENCES public.reports(id),
  stripe_payment_intent_id TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_status ON public.tasks(status, deadline);

-- ══════════════════════════════════════════════════════════════════════════
-- ASSIGNMENTS (ongoing multi-reporter campaigns)
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.assignments (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by               UUID NOT NULL REFERENCES public.users(id),
  title                    TEXT NOT NULL,
  description              TEXT NOT NULL,
  image_url                TEXT,
  status                   TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','paused','completed','archived')),
  urgency                  TEXT NOT NULL DEFAULT 'medium'
                             CHECK (urgency IN ('critical','high','medium')),
  -- Regions stored as text array for flexible geo targeting
  regions                  TEXT[] NOT NULL DEFAULT '{}',
  -- Bounty
  bounty_pool_usd          NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (bounty_pool_usd >= 0),
  bounty_per_report_usd    NUMERIC(8,2) NOT NULL DEFAULT 10 CHECK (bounty_per_report_usd >= 5),
  bounty_spent_usd         NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Safety
  safety_notes             TEXT,
  allows_anonymous         BOOLEAN NOT NULL DEFAULT false,
  -- Denormalized stats (updated via triggers)
  contributor_count        INT NOT NULL DEFAULT 0,
  report_count             INT NOT NULL DEFAULT 0,
  total_views              INT NOT NULL DEFAULT 0,
  -- Payment
  stripe_payment_intent_id TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignments_status ON public.assignments(status, urgency, created_at DESC);

-- Assignment angles (specific sub-topics / shots requested)
CREATE TABLE public.assignment_angles (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id  UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  report_count   INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_angles_assignment ON public.assignment_angles(assignment_id);

-- Assignment contributors (reporters who joined)
CREATE TABLE public.assignment_contributors (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id  UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reports_filed  INT NOT NULL DEFAULT 0,
  total_earned   NUMERIC(10,2) NOT NULL DEFAULT 0,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);

CREATE INDEX idx_contributors_assignment ON public.assignment_contributors(assignment_id);
CREATE INDEX idx_contributors_user ON public.assignment_contributors(user_id);

-- Assignment bounty pool contributions (anyone can fund)
CREATE TABLE public.assignment_funding (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id            UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  funded_by                UUID NOT NULL REFERENCES public.users(id),
  amount_usd               NUMERIC(10,2) NOT NULL CHECK (amount_usd > 0),
  stripe_payment_intent_id TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Now add FK from reports to assignments
ALTER TABLE public.reports
  ADD CONSTRAINT fk_reports_assignment
  FOREIGN KEY (assignment_id) REFERENCES public.assignments(id);

ALTER TABLE public.reports
  ADD CONSTRAINT fk_reports_assignment_angle
  FOREIGN KEY (assignment_angle_id) REFERENCES public.assignment_angles(id);

-- ══════════════════════════════════════════════════════════════════════════
-- PAYOUT RECORDS
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.payout_records (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.users(id),
  amount_usd          NUMERIC(10,2) NOT NULL,
  source              TEXT NOT NULL
                        CHECK (source IN ('ad_revenue','task_reward','licensing','community_pool','assignment_bounty')),
  report_id           UUID REFERENCES public.reports(id),
  task_id             UUID REFERENCES public.tasks(id),
  assignment_id       UUID REFERENCES public.assignments(id),
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','cleared','paid','failed')),
  stripe_transfer_id  TEXT,
  clears_at           TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════
-- MODERATION LOG
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.moderation_log (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moderator_id      UUID NOT NULL REFERENCES public.users(id),
  report_id         UUID REFERENCES public.reports(id),
  target_user_id    UUID REFERENCES public.users(id),
  action            TEXT NOT NULL
                      CHECK (action IN ('restore','remove','remove_warn','remove_ban','keep_flagged')),
  reason            TEXT,
  notes             TEXT,
  result            TEXT,
  strike_count_after INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_modlog_created ON public.moderation_log(created_at DESC);
CREATE INDEX idx_modlog_target ON public.moderation_log(target_user_id);

-- ══════════════════════════════════════════════════════════════════════════
-- SHARE EVENTS (tracks social media shares for monetization)
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.share_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id  UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  platform   TEXT NOT NULL
               CHECK (platform IN ('x','facebook','tiktok','youtube','instagram','native','copy','whatsapp','telegram')),
  shared_by  UUID REFERENCES public.users(id),
  referrer   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shares_report ON public.share_events(report_id);
CREATE INDEX idx_shares_platform ON public.share_events(platform, created_at DESC);

-- Function to increment share count on a report
CREATE OR REPLACE FUNCTION increment_share_count(rid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.reports SET share_count = share_count + 1 WHERE id = rid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════════
-- TRIGGERS — auto-update denormalized assignment stats
-- ══════════════════════════════════════════════════════════════════════════

-- When a contributor joins an assignment
CREATE OR REPLACE FUNCTION update_assignment_contributor_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.assignments
  SET contributor_count = (
    SELECT COUNT(*) FROM public.assignment_contributors WHERE assignment_id = NEW.assignment_id
  ), updated_at = now()
  WHERE id = NEW.assignment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_assignment_contributor_count
  AFTER INSERT OR DELETE ON public.assignment_contributors
  FOR EACH ROW EXECUTE FUNCTION update_assignment_contributor_count();

-- When a report is published under an assignment
CREATE OR REPLACE FUNCTION update_assignment_report_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignment_id IS NOT NULL AND NEW.status = 'published' THEN
    -- Update assignment report count
    UPDATE public.assignments
    SET report_count = (
      SELECT COUNT(*) FROM public.reports
      WHERE assignment_id = NEW.assignment_id AND status = 'published'
    ), updated_at = now()
    WHERE id = NEW.assignment_id;

    -- Update angle report count if tagged
    IF NEW.assignment_angle_id IS NOT NULL THEN
      UPDATE public.assignment_angles
      SET report_count = (
        SELECT COUNT(*) FROM public.reports
        WHERE assignment_angle_id = NEW.assignment_angle_id AND status = 'published'
      )
      WHERE id = NEW.assignment_angle_id;
    END IF;

    -- Update contributor's reports_filed count
    UPDATE public.assignment_contributors
    SET reports_filed = reports_filed + 1
    WHERE assignment_id = NEW.assignment_id AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_assignment_report_count
  AFTER INSERT OR UPDATE OF status ON public.reports
  FOR EACH ROW EXECUTE FUNCTION update_assignment_report_count();

-- When a report is accepted, pay the bounty
CREATE OR REPLACE FUNCTION pay_assignment_bounty()
RETURNS TRIGGER AS $$
DECLARE
  v_bounty NUMERIC(8,2);
  v_pool   NUMERIC(10,2);
  v_spent  NUMERIC(10,2);
BEGIN
  IF NEW.assignment_id IS NOT NULL
     AND NEW.assignment_accepted = true
     AND (OLD.assignment_accepted IS DISTINCT FROM true)
     AND NEW.assignment_bounty_paid = false
  THEN
    SELECT bounty_per_report_usd, bounty_pool_usd, bounty_spent_usd
      INTO v_bounty, v_pool, v_spent
      FROM public.assignments WHERE id = NEW.assignment_id;

    -- Only pay if pool has funds remaining
    IF v_spent + v_bounty <= v_pool THEN
      -- Mark report as paid
      NEW.assignment_bounty_paid := true;

      -- Debit assignment pool
      UPDATE public.assignments
      SET bounty_spent_usd = bounty_spent_usd + v_bounty, updated_at = now()
      WHERE id = NEW.assignment_id;

      -- Credit contributor
      UPDATE public.assignment_contributors
      SET total_earned = total_earned + v_bounty
      WHERE assignment_id = NEW.assignment_id AND user_id = NEW.user_id;

      -- Create payout record (7-day hold)
      INSERT INTO public.payout_records
        (user_id, amount_usd, source, report_id, assignment_id, clears_at)
      VALUES
        (NEW.user_id, v_bounty, 'assignment_bounty', NEW.id, NEW.assignment_id,
         now() + interval '7 days');

      -- Update user earnings
      UPDATE public.users
      SET pending_payout = pending_payout + v_bounty
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_pay_assignment_bounty
  BEFORE UPDATE OF assignment_accepted ON public.reports
  FOR EACH ROW EXECUTE FUNCTION pay_assignment_bounty();

-- When additional funding is added to an assignment
CREATE OR REPLACE FUNCTION update_assignment_pool()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.assignments
  SET bounty_pool_usd = bounty_pool_usd + NEW.amount_usd, updated_at = now()
  WHERE id = NEW.assignment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_assignment_funding
  AFTER INSERT ON public.assignment_funding
  FOR EACH ROW EXECUTE FUNCTION update_assignment_pool();

-- ══════════════════════════════════════════════════════════════════════════
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_angles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_funding     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_log        ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "Public profiles"    ON public.users FOR SELECT USING (true);
CREATE POLICY "Self update"        ON public.users FOR UPDATE USING (auth.uid() = id);

-- Reports
CREATE POLICY "Public reports"     ON public.reports FOR SELECT
  USING (status = 'published' OR auth.uid() = user_id);
CREATE POLICY "Insert own report"  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own report"  ON public.reports FOR UPDATE
  USING (auth.uid() = user_id);

-- Votes
CREATE POLICY "Insert vote"        ON public.votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own votes"          ON public.votes FOR SELECT USING (auth.uid() = user_id);

-- Tasks
CREATE POLICY "Public tasks"       ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Auth create task"   ON public.tasks FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Update own task"    ON public.tasks FOR UPDATE USING (auth.uid() = created_by);

-- Assignments — public read, auth create
CREATE POLICY "Public assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Auth create assign" ON public.assignments FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator update"     ON public.assignments FOR UPDATE USING (auth.uid() = created_by);

-- Assignment angles — public read
CREATE POLICY "Public angles"      ON public.assignment_angles FOR SELECT USING (true);
CREATE POLICY "Creator add angle"  ON public.assignment_angles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.assignments WHERE id = assignment_id AND created_by = auth.uid()));

-- Assignment contributors — public read, self join
CREATE POLICY "Public contributors" ON public.assignment_contributors FOR SELECT USING (true);
CREATE POLICY "Self join"           ON public.assignment_contributors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Assignment funding — public read, auth fund
CREATE POLICY "Public funding"     ON public.assignment_funding FOR SELECT USING (true);
CREATE POLICY "Auth fund"          ON public.assignment_funding FOR INSERT
  WITH CHECK (auth.uid() = funded_by);

-- Payouts
CREATE POLICY "Own payouts"        ON public.payout_records FOR SELECT USING (auth.uid() = user_id);

-- Share events — public read for analytics, anyone can insert
CREATE POLICY "Public share reads"  ON public.share_events FOR SELECT USING (true);
CREATE POLICY "Anyone can share"    ON public.share_events FOR INSERT WITH CHECK (true);

-- Moderation log — only moderators and admins can read/write
CREATE POLICY "Mod read log"        ON public.moderation_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('moderator','admin')));
CREATE POLICY "Mod write log"       ON public.moderation_log FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('moderator','admin')));

-- ══════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ══════════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('assignment-images', 'assignment-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('videos', 'videos', false, 157286400, ARRAY['video/mp4','video/webm','video/quicktime'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read assignment images" ON storage.objects FOR SELECT USING (bucket_id = 'assignment-images');
CREATE POLICY "Auth upload assignment images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assignment-images' AND auth.role() = 'authenticated');
CREATE POLICY "Auth upload videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');
