-- Phase 2 schema additions (run AFTER the base schema)

-- Add vote weighting and sybil detection columns to votes
ALTER TABLE votes ADD COLUMN IF NOT EXISTS weight DECIMAL(3,1) DEFAULT 1.0;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Add trending score and content hash to reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS trending_score DECIMAL(10,2) DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

-- Add tier and earnings tracking to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'starter' CHECK (tier IN ('starter','silver','gold','platinum'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS available_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payout_provider TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payout_account JSONB;

-- Earnings ledger for 7-day hold
CREATE TABLE IF NOT EXISTS earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('ad_revenue','licensing','tip','bounty')),
  created_at TIMESTAMPTZ DEFAULT now(),
  hold_until TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  paid_out BOOLEAN DEFAULT false,
  payout_id UUID,
  payout_at TIMESTAMPTZ
);

-- Payout history
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  provider TEXT NOT NULL,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Index for trending score queries
CREATE INDEX IF NOT EXISTS idx_reports_trending ON reports(trending_score DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_reports_content_hash ON reports(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votes_fingerprint ON votes(device_fingerprint, report_id);
CREATE INDEX IF NOT EXISTS idx_votes_ip ON votes(ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_earnings_user_hold ON earnings(user_id, hold_until) WHERE paid_out = false;

-- Auto-increment report count trigger
CREATE OR REPLACE FUNCTION increment_user_report_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET report_count = report_count + 1 WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_report_count ON reports;
CREATE TRIGGER trg_increment_report_count
  AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION increment_user_report_count();

-- RLS for earnings
ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own earnings" ON earnings FOR SELECT USING (auth.uid() = user_id);

-- RLS for payouts
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own payouts" ON payouts FOR SELECT USING (auth.uid() = user_id);


-- OFAC screening audit trail (required for compliance)
CREATE TABLE IF NOT EXISTS ofac_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  payout_id UUID REFERENCES payouts(id) ON DELETE SET NULL,
  screening_id TEXT NOT NULL UNIQUE,
  cleared BOOLEAN NOT NULL,
  blocked BOOLEAN NOT NULL DEFAULT false,
  match_type TEXT CHECK (match_type IN ('country_blocked','region_blocked','sdn_match','fuzzy_match')),
  match_details TEXT,
  requires_review BOOLEAN DEFAULT false,
  reason TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_decision TEXT CHECK (review_decision IN ('approved','denied')),
  screened_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for compliance queries
CREATE INDEX IF NOT EXISTS idx_ofac_user ON ofac_screenings(user_id, screened_at DESC);
CREATE INDEX IF NOT EXISTS idx_ofac_blocked ON ofac_screenings(blocked) WHERE blocked = true;
CREATE INDEX IF NOT EXISTS idx_ofac_review ON ofac_screenings(requires_review) WHERE requires_review = true AND review_decision IS NULL;

-- RLS: users see own screenings, admins see all
ALTER TABLE ofac_screenings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own screenings" ON ofac_screenings FOR SELECT USING (auth.uid() = user_id);

-- Add country field to users if not present
ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS revenue_enabled BOOLEAN DEFAULT false;

-- Phase 3: Moderation scans (Hive AI results)
CREATE TABLE IF NOT EXISTS moderation_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  scan_id TEXT NOT NULL UNIQUE,
  passed BOOLEAN NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('safe','low','medium','high','critical')),
  auto_action TEXT NOT NULL CHECK (auto_action IN ('publish','flag_review','auto_remove','auto_ban')),
  flags JSONB DEFAULT '[]',
  processing_ms INTEGER,
  scanned_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 3: C2PA provenance chain
CREATE TABLE IF NOT EXISTS provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL UNIQUE,
  manifest_id TEXT NOT NULL UNIQUE,
  manifest JSONB NOT NULL,
  signature TEXT NOT NULL,
  content_hash TEXT,
  assertion_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 3: Add geo-risk and moderation columns to reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS geo_risk TEXT DEFAULT 'low' CHECK (geo_risk IN ('low','moderate','elevated','high','critical'));
ALTER TABLE reports ADD COLUMN IF NOT EXISTS moderation_flags TEXT[] DEFAULT '{}';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mod_scans_report ON moderation_scans(report_id);
CREATE INDEX IF NOT EXISTS idx_mod_scans_action ON moderation_scans(auto_action) WHERE auto_action != 'publish';
CREATE INDEX IF NOT EXISTS idx_provenance_report ON provenance(report_id);
CREATE INDEX IF NOT EXISTS idx_provenance_hash ON provenance(content_hash);
CREATE INDEX IF NOT EXISTS idx_reports_geo_risk ON reports(geo_risk) WHERE geo_risk IN ('high','critical');

-- RLS
ALTER TABLE moderation_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE provenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins see moderation scans" ON moderation_scans FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Anyone can verify provenance" ON provenance FOR SELECT USING (true);

-- Social media connected accounts
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('youtube','tiktok','instagram','facebook','x')),
  account_id TEXT NOT NULL DEFAULT '',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  username TEXT,
  connected BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Social distribution history (cross-posts)
CREATE TABLE IF NOT EXISTS social_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  post_id TEXT,
  post_url TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  distributed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Social analytics (views, engagement, revenue per platform per report)
CREATE TABLE IF NOT EXISTS social_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  post_id TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  watch_time_seconds INTEGER DEFAULT 0,
  estimated_revenue DECIMAL(10,4) DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(report_id, platform)
);

-- Embed tracking (external sites embedding VozIt content)
CREATE TABLE IF NOT EXISTS embed_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  referrer_domain TEXT,
  referrer_url TEXT,
  view_count INTEGER DEFAULT 1,
  is_licensed BOOLEAN DEFAULT false,
  license_fee DECIMAL(10,2),
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  UNIQUE(report_id, referrer_domain)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_dist_report ON social_distributions(report_id);
CREATE INDEX IF NOT EXISTS idx_social_analytics_report ON social_analytics(report_id);
CREATE INDEX IF NOT EXISTS idx_embed_views_report ON embed_views(report_id);

-- RLS
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE embed_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own social accounts" ON social_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own distributions" ON social_distributions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see own analytics" ON social_analytics FOR SELECT USING (
  EXISTS (SELECT 1 FROM reports WHERE reports.id = report_id AND reports.user_id = auth.uid())
);
CREATE POLICY "Public embed tracking" ON embed_views FOR SELECT USING (true);

-- Function to increment share count
CREATE OR REPLACE FUNCTION increment_share_count(rid UUID, amount INTEGER DEFAULT 1)
RETURNS void AS $$
BEGIN
  UPDATE reports SET share_count = share_count + amount WHERE id = rid;
END;
$$ LANGUAGE plpgsql;

-- Add VozIt channel flag to social distributions
ALTER TABLE social_distributions ADD COLUMN IF NOT EXISTS is_vozit_channel BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_social_dist_vozit ON social_distributions(is_vozit_channel) WHERE is_vozit_channel = true;

-- Licenses table (media organizations purchasing footage rights)
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tier TEXT NOT NULL CHECK (tier IN ('embed','digital','broadcast','wire')),
  license_type TEXT NOT NULL,
  licensee_org TEXT NOT NULL,
  licensee_email TEXT NOT NULL,
  licensee_name TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  reporter_share DECIMAL(10,2) NOT NULL DEFAULT 0,
  vozit_share DECIMAL(10,2) NOT NULL DEFAULT 0,
  exclusive BOOLEAN DEFAULT false,
  rights TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','active','expired','revoked')),
  payment_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_licenses_report ON licenses(report_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_licenses_exclusive ON licenses(report_id, exclusive) WHERE exclusive = true AND status = 'active';

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporters see own licenses" ON licenses FOR SELECT USING (reporter_id = auth.uid());
CREATE POLICY "Public can create license requests" ON licenses FOR INSERT WITH CHECK (true);

-- Function to increment embed views
CREATE OR REPLACE FUNCTION increment_embed_views(rid UUID, domain TEXT)
RETURNS void AS $$
BEGIN
  UPDATE embed_views
  SET view_count = view_count + 1, last_seen = now()
  WHERE report_id = rid AND referrer_domain = domain;
END;
$$ LANGUAGE plpgsql;

-- Watermark tracking columns on reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS watermarked_url TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS clean_url TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS watermark_applied BOOLEAN DEFAULT false;

-- ══════════════════════════════════════════════════════════
-- SECURITY HARDENING TABLES
-- ══════════════════════════════════════════════════════════

-- Admin audit log
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_log(action, created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins see audit log" ON admin_audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);

-- Persistent rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  limit_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(limit_key, created_at DESC);

-- Auto-cleanup: delete rate limit entries older than 24 hours
CREATE OR REPLACE FUNCTION cleanup_rate_limits() RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE created_at < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Rate limit check function (called from app)
CREATE OR REPLACE FUNCTION check_rate_limit(
  limit_key TEXT, window_start TIMESTAMPTZ, max_requests INTEGER
) RETURNS TABLE(count BIGINT) AS $$
BEGIN
  -- Insert this request
  INSERT INTO rate_limits (limit_key) VALUES (limit_key);
  -- Count requests in window
  RETURN QUERY SELECT COUNT(*)::BIGINT FROM rate_limits
    WHERE rate_limits.limit_key = check_rate_limit.limit_key
    AND rate_limits.created_at >= window_start;
END;
$$ LANGUAGE plpgsql;

-- Login attempts tracking (persistent)
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(identifier, created_at DESC);

-- Add email_verified enforcement column
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- AI 5W analysis results
CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  suggested_5w JSONB NOT NULL,
  confidence JSONB NOT NULL,
  sources JSONB NOT NULL,
  summary TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_report ON ai_analyses(report_id);
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own analyses" ON ai_analyses FOR SELECT USING (
  EXISTS (SELECT 1 FROM reports WHERE reports.id = report_id AND reports.user_id = auth.uid())
);

-- Add AI metadata columns to reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_enhanced BOOLEAN DEFAULT false;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_tags TEXT[] DEFAULT '{}';

-- Voice-over support
ALTER TABLE reports ADD COLUMN IF NOT EXISTS voice_over_path TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS has_voice_over BOOLEAN DEFAULT false;
