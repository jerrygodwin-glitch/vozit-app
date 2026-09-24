// @ts-nocheck
import type { ReporterTier } from '@/types'

// ── ALL PAYOUT PROVIDERS ─────────────────────────────────────────────
export const PAYOUT_PROVIDERS = {
  stripe: {
    name: 'Stripe',
    minPayout: 10,
    currencies: ['USD','EUR','GBP','CAD','AUD','JPY','CHF','SEK','NOK','DKK'],
    regions: ['US','CA','GB','EU','AU','NZ','JP','SG','HK'],
    methods: ['bank_transfer','debit_card'],
    description: 'Bank transfer or debit card. 46+ countries.',
    icon: '🏦',
  },
  payoneer: {
    name: 'Payoneer',
    minPayout: 10,
    currencies: ['USD','EUR','GBP','JPY','AUD','CAD','CNY'],
    regions: ['global'],
    methods: ['bank_transfer','payoneer_card'],
    description: 'Global bank transfer or Payoneer prepaid card. 200+ countries.',
    icon: '🌐',
  },
  flutterwave: {
    name: 'Flutterwave',
    minPayout: 5,
    currencies: ['USD','NGN','KES','GHS','ZAR','TZS','UGX','RWF','XOF','XAF','EGP'],
    regions: ['NG','KE','GH','ZA','TZ','UG','RW','CI','SN','CM','EG'],
    methods: ['bank_transfer','mobile_money'],
    description: 'Bank or mobile money (M-Pesa, MTN, Airtel). Africa-focused.',
    icon: '📱',
  },
  wise: {
    name: 'Wise',
    minPayout: 10,
    currencies: ['USD','EUR','GBP','INR','BRL','MXN','PHP','IDR','THB','MYR','PLN','CZK','HUF','RON','BGN','TRY','ARS','CLP','COP','PEN'],
    regions: ['global'],
    methods: ['bank_transfer'],
    description: 'Low-fee bank transfers. 80+ countries, real exchange rate.',
    icon: '💸',
  },
  paypal: {
    name: 'PayPal',
    minPayout: 10,
    currencies: ['USD','EUR','GBP','CAD','AUD','JPY','BRL','MXN','PHP','INR','ILS','PLN','CZK','HUF','SGD','HKD','TWD','THB'],
    regions: ['global'],
    methods: ['paypal_balance','bank_transfer'],
    description: 'PayPal balance or linked bank. 200+ countries.',
    icon: '🅿️',
  },
  crypto: {
    name: 'Crypto (USDC)',
    minPayout: 5,
    currencies: ['USDC','USDT'],
    regions: ['global'],
    methods: ['crypto_wallet'],
    description: 'USDC/USDT to any wallet. No bank needed. Instant, global.',
    icon: '₿',
  },
  chipper: {
    name: 'Chipper Cash',
    minPayout: 5,
    currencies: ['USD','NGN','KES','GHS','ZAR','TZS','UGX','RWF'],
    regions: ['NG','KE','GH','ZA','TZ','UG','RW'],
    methods: ['chipper_wallet','mobile_money'],
    description: 'Chipper wallet or mobile money. Africa-focused, zero fees.',
    icon: '🐦',
  },
  worldremit: {
    name: 'WorldRemit',
    minPayout: 10,
    currencies: ['USD','EUR','GBP'],
    regions: ['global'],
    methods: ['bank_transfer','mobile_money','cash_pickup'],
    description: 'Bank, mobile money, or cash pickup. 130+ countries.',
    icon: '🌍',
  },
} as const

export type PayoutProvider = keyof typeof PAYOUT_PROVIDERS

// Revenue share by tier
const REVENUE_SHARE: Record<ReporterTier, number> = {
  starter: 0.50,
  silver: 0.55,
  gold: 0.65,
  platinum: 0.70,
}

// 7-DAY HOLD: Calculate available balance
export function calculateAvailableBalance(earnings: Array<{
  id: string; amount: number; created_at: string; paid_out: boolean
}>): { available: number; pending: number; total: number } {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  let available = 0, pending = 0, total = 0
  for (const e of earnings) {
    if (e.paid_out) continue
    const earnedAt = new Date(e.created_at)
    total += e.amount
    if (earnedAt < sevenDaysAgo) { available += e.amount } else { pending += e.amount }
  }
  return { available: Math.round(available * 100) / 100, pending: Math.round(pending * 100) / 100, total: Math.round(total * 100) / 100 }
}

export function calculateReporterShare(grossRevenue: number, tier: ReporterTier): number {
  return Math.round(grossRevenue * (REVENUE_SHARE[tier] || 0.50) * 100) / 100
}

export function validatePayoutRequest(amount: number, provider: PayoutProvider, availableBalance: number): { valid: boolean; error?: string } {
  const config = PAYOUT_PROVIDERS[provider]
  if (!config) return { valid: false, error: 'Invalid provider' }
  if (amount > availableBalance) return { valid: false, error: 'Insufficient available balance (7-day hold may apply)' }
  if (amount < config.minPayout) return { valid: false, error: `Minimum payout is $${config.minPayout} for ${config.name}` }
  return { valid: true }
}

// ── PROVIDER EXECUTION ───────────────────────────────────────────────
// payoutId is OUR stable payout_records/payouts row id — used as the
// idempotency key/reference with every provider so a retried or
// double-submitted request can't move money twice for the same payout.
export async function executePayout(
  provider: PayoutProvider, amount: number, accountDetails: any, payoutId: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  switch (provider) {

    // ── STRIPE CONNECT ───────────────────────────────────────────────
    case 'stripe': {
      if (!process.env.STRIPE_SECRET_KEY) return { success: false, error: 'Stripe not configured' }
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
        const transfer = await stripe.transfers.create({
          amount: Math.round(amount * 100), currency: 'usd',
          destination: accountDetails.stripe_account_id,
          description: 'VozIt reporter payout',
        }, { idempotencyKey: `vz_payout_${payoutId}` })
        return { success: true, transactionId: transfer.id }
      } catch (e: any) { return { success: false, error: e.message } }
    }

    // ── PAYONEER ─────────────────────────────────────────────────────
    case 'payoneer': {
      if (!process.env.PAYONEER_API_KEY) return { success: false, error: 'Payoneer not configured' }
      try {
        const res = await fetch(`https://api.payoneer.com/v4/programs/${process.env.PAYONEER_PROGRAM_ID}/payouts`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.PAYONEER_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ payee_id: accountDetails.payoneer_id, amount, currency: 'USD', description: 'VozIt payout', client_reference_id: `VZ_${payoutId}` }),
        })
        const data = await res.json()
        return { success: res.ok, transactionId: data.payout_id, error: data.error }
      } catch (e: any) { return { success: false, error: e.message } }
    }

    // ── FLUTTERWAVE ──────────────────────────────────────────────────
    case 'flutterwave': {
      if (!process.env.FLUTTERWAVE_SECRET_KEY) return { success: false, error: 'Flutterwave not configured' }
      try {
        const res = await fetch('https://api.flutterwave.com/v3/transfers', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account_bank: accountDetails.bank_code,
            account_number: accountDetails.account_number || accountDetails.mobile_number,
            amount, currency: accountDetails.currency || 'USD',
            narration: 'VozIt payout', reference: `VZ_FW_${payoutId}`,
          }),
        })
        const data = await res.json()
        return { success: data.status === 'success', transactionId: data.data?.id?.toString(), error: data.message }
      } catch (e: any) { return { success: false, error: e.message } }
    }

    // ── WISE (TRANSFERWISE) ──────────────────────────────────────────
    case 'wise': {
      if (!process.env.WISE_API_KEY) return { success: false, error: 'Wise not configured' }
      const baseUrl = 'https://api.transferwise.com'
      const headers = { 'Authorization': `Bearer ${process.env.WISE_API_KEY}`, 'Content-Type': 'application/json' }
      try {
        // 1. Create quote
        const quoteRes = await fetch(`${baseUrl}/v3/profiles/${process.env.WISE_PROFILE_ID}/quotes`, {
          method: 'POST', headers,
          body: JSON.stringify({
            sourceCurrency: 'USD', targetCurrency: accountDetails.currency || 'USD',
            sourceAmount: amount, payOut: 'BANK_TRANSFER',
          }),
        })
        const quote = await quoteRes.json()
        if (!quote.id) return { success: false, error: 'Failed to create Wise quote' }

        // 2. Create recipient (if not already created)
        let recipientId = accountDetails.wise_recipient_id
        if (!recipientId) {
          const recipRes = await fetch(`${baseUrl}/v1/accounts`, {
            method: 'POST', headers,
            body: JSON.stringify({
              profile: process.env.WISE_PROFILE_ID,
              accountHolderName: accountDetails.name,
              currency: accountDetails.currency || 'USD',
              type: accountDetails.account_type || 'checking',
              details: accountDetails.bank_details,
            }),
          })
          const recip = await recipRes.json()
          recipientId = recip.id
        }

        // 3. Create transfer
        const transferRes = await fetch(`${baseUrl}/v1/transfers`, {
          method: 'POST', headers,
          body: JSON.stringify({
            targetAccount: recipientId, quoteUuid: quote.id,
            customerTransactionId: `VZ_WISE_${payoutId}`,
            details: { reference: 'VozIt reporter payout' },
          }),
        })
        const transfer = await transferRes.json()

        // 4. Fund transfer
        await fetch(`${baseUrl}/v3/profiles/${process.env.WISE_PROFILE_ID}/transfers/${transfer.id}/payments`, {
          method: 'POST', headers,
          body: JSON.stringify({ type: 'BALANCE' }),
        })

        return { success: true, transactionId: transfer.id?.toString() }
      } catch (e: any) { return { success: false, error: e.message } }
    }

    // ── PAYPAL ────────────────────────────────────────────────────────
    case 'paypal': {
      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) return { success: false, error: 'PayPal not configured' }
      const baseUrl = process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
      try {
        // 1. Get access token
        const authRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials',
        })
        const auth = await authRes.json()

        // 2. Create payout batch
        const payoutRes = await fetch(`${baseUrl}/v1/payments/payouts`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${auth.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_batch_header: {
              sender_batch_id: `VZ_PP_${payoutId}`,
              email_subject: 'VozIt Reporter Payout',
              email_message: 'Your VozIt earnings are here!',
            },
            items: [{
              recipient_type: 'EMAIL',
              amount: { value: amount.toFixed(2), currency: 'USD' },
              receiver: accountDetails.paypal_email,
              note: 'VozIt reporter payout',
              sender_item_id: `VZ_${payoutId}`,
            }],
          }),
        })
        const payout = await payoutRes.json()
        return {
          success: payout.batch_header?.batch_status !== 'DENIED',
          transactionId: payout.batch_header?.payout_batch_id,
          error: payout.batch_header?.batch_status === 'DENIED' ? 'Payout denied' : undefined,
        }
      } catch (e: any) { return { success: false, error: e.message } }
    }

    // ── CRYPTO (USDC/USDT via Coinbase Commerce or Circle) ───────────
    case 'crypto': {
      if (!process.env.CIRCLE_API_KEY) return { success: false, error: 'Crypto payouts not configured' }
      try {
        // Circle Payouts API for USDC. Sandbox must be opted into explicitly —
        // previously this always hit the sandbox regardless of environment,
        // so a "successful" payout never actually moved real money.
        const circleBaseUrl = process.env.CIRCLE_MODE === 'sandbox'
          ? 'https://payout-sandbox.circle.com' : 'https://api.circle.com'
        const res = await fetch(`${circleBaseUrl}/v1/payouts`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idempotencyKey: payoutId,
            source: { type: 'wallet', id: process.env.CIRCLE_WALLET_ID },
            destination: {
              type: 'blockchain',
              chain: accountDetails.chain || 'ETH',
              address: accountDetails.wallet_address,
            },
            amount: { amount: amount.toFixed(2), currency: 'USD' },
            metadata: { beneficiaryEmail: accountDetails.email },
          }),
        })
        const data = await res.json()
        return { success: !!data.data?.id, transactionId: data.data?.id, error: data.message }
      } catch (e: any) { return { success: false, error: e.message } }
    }

    // ── CHIPPER CASH ─────────────────────────────────────────────────
    case 'chipper': {
      if (!process.env.CHIPPER_API_KEY) return { success: false, error: 'Chipper Cash not configured' }
      try {
        const res = await fetch('https://api.chipper.cash/v1/transfers', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.CHIPPER_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: accountDetails.chipper_tag || accountDetails.phone_number,
            amount, currency: accountDetails.currency || 'USD',
            narration: 'VozIt reporter payout',
            reference: `VZ_CH_${payoutId}`,
          }),
        })
        const data = await res.json()
        return { success: data.status === 'success', transactionId: data.data?.id?.toString(), error: data.message }
      } catch (e: any) { return { success: false, error: e.message } }
    }

    // ── WORLDREMIT ───────────────────────────────────────────────────
    case 'worldremit': {
      if (!process.env.WORLDREMIT_API_KEY) return { success: false, error: 'WorldRemit not configured' }
      try {
        const res = await fetch('https://api.worldremit.com/v1/transfers', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.WORLDREMIT_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sendAmount: amount, sendCurrency: 'USD',
            receiveCurrency: accountDetails.currency || 'USD',
            receiveCountry: accountDetails.country,
            payoutMethod: accountDetails.method || 'bank_transfer',
            recipient: {
              firstName: accountDetails.first_name,
              lastName: accountDetails.last_name,
              mobile: accountDetails.phone_number,
              bankAccount: accountDetails.bank_account,
            },
            reference: `VZ_WR_${payoutId}`,
          }),
        })
        const data = await res.json()
        return { success: !!data.id, transactionId: data.id?.toString(), error: data.error }
      } catch (e: any) { return { success: false, error: e.message } }
    }

    default:
      return { success: false, error: 'Unknown provider' }
  }
}
