// @ts-nocheck
export type ReporterTier = 'starter' | 'silver' | 'gold' | 'platinum'

export type PayoutProvider = 'stripe' | 'payoneer' | 'flutterwave' | 'wise' | 'paypal' | 'crypto' | 'chipper' | 'worldremit'

export type PayoutMethod = 'bank_transfer' | 'mobile_money' | 'debit_card' | 'payoneer_card' | 'paypal_balance' | 'crypto_wallet' | 'chipper_wallet' | 'cash_pickup'

export interface User {
  id: string
  email: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
  reporter_type?: 'eyewitness' | 'journalist' | 'activist' | 'hobbyist'
  topics?: string[]
  country?: string
  tier: ReporterTier
  report_count: number
  credibility_score: number
  total_earned: number
  available_balance: number
  pending_payout: number
  payout_provider?: PayoutProvider
  payout_method?: PayoutMethod
  payout_account_id?: string
  stripe_account_id?: string
  revenue_enabled: boolean
  is_admin: boolean
  is_banned: boolean
  ban_reason?: string
  created_at: string
}

export interface Report {
  id: string
  user_id: string
  title: string
  description?: string
  who?: string
  what?: string
  where_text?: string
  when_happened?: string
  why?: string
  location_name?: string
  location_lat?: number
  location_lng?: number
  mux_upload_id?: string
  mux_asset_id?: string
  playback_id?: string
  thumbnail_url?: string
  duration?: number
  content_hash?: string
  status: 'processing' | 'published' | 'flagged' | 'removed'
  upvotes: number
  downvotes: number
  credibility_pct: number
  trending_score: number
  share_count: number
  assignment_id?: string
  user?: User
  created_at: string
}

export interface Vote {
  id: string
  report_id: string
  user_id: string
  value: 1 | -1
  weight: number
  device_fingerprint?: string
  ip_address?: string
  created_at: string
}

export interface Assignment {
  id: string
  title: string
  description?: string
  regions: string[]
  urgency: 'critical' | 'high' | 'medium' | 'low'
  bounty_amount: number
  bounty_currency: string
  deadline?: string
  reporter_count: number
  report_count: number
  status: 'active' | 'completed' | 'cancelled'
  created_by: string
  created_at: string
}

export interface Earning {
  id: string
  user_id: string
  report_id?: string
  amount: number
  source: 'ad_revenue' | 'licensing' | 'tip' | 'bounty'
  created_at: string
  hold_until: string
  paid_out: boolean
  payout_id?: string
  payout_at?: string
}

export interface PayoutRecord {
  id: string
  user_id: string
  amount: number
  provider: PayoutProvider
  transaction_id?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  completed_at?: string
}

export interface ModerationAction {
  id: string
  report_id: string
  moderator_id: string
  action: 'restore' | 'keep_flagged' | 'remove' | 'remove_ban'
  reason?: string
  result?: string
  created_at: string
}

export interface ShareRecord {
  id: string
  report_id: string
  user_id?: string
  platform: 'x' | 'facebook' | 'tiktok' | 'whatsapp' | 'copy' | 'native'
  created_at: string
}
