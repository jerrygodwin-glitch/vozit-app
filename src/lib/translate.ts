// @ts-nocheck
// On-demand report translation — reuses the same Anthropic API key already
// configured for 5W analysis, rather than adding a separate translation
// service (Google/DeepL) that would need its own signup, key, and billing.
export interface TranslatedFields {
  title: string
  who: string
  what: string
  where_text: string
  why: string
  transcript: string
}

export async function translateReportContent(
  fields: { title: string; who: string; what: string; where_text: string; why: string; transcript: string },
  targetLang: string
): Promise<TranslatedFields | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `Translate each field in the provided JSON into the language with ISO 639-1 code "${targetLang}". This is citizen journalism — preserve meaning and tone exactly, do not summarize, embellish, or add anything not in the source. Leave a field as an empty string if its input was empty. Respond ONLY with valid JSON in this exact format, no other text:
{"title":"...","who":"...","what":"...","where_text":"...","why":"...","transcript":"..."}`,
        messages: [{ role: 'user', content: JSON.stringify(fields) }],
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) return null
    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

// Translates an arbitrary flat dictionary of UI copy (button labels,
// headings, help text) into the given language, keeping the same keys —
// used for the small set of website pages a Telegram-bot reporter gets
// sent to (payouts, settings), where the reporter may have done their
// entire account setup in a language other than English and never see an
// English screen otherwise. See src/app/api/translate-ui/route.ts, which
// wraps this with a cache so the same (page, language) pair isn't
// re-translated on every visit.
export async function translateUIStrings(
  strings: Record<string, string>,
  targetLang: string
): Promise<Record<string, string> | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (targetLang === 'en') return strings

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: `Translate each value in the provided JSON object into the language with ISO 639-1 code "${targetLang}". Keep the exact same keys. This is interface copy (buttons, headings, short help text) for a citizen-journalism app — keep translations short and natural, the way a real app's UI would phrase them in that language, not a literal word-for-word translation. Never translate a value that is purely a brand name, currency code, or placeholder token. Respond ONLY with valid JSON using the exact same keys, no other text.`,
        messages: [{ role: 'user', content: JSON.stringify(strings) }],
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) return null
    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}
