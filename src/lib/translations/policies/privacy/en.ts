import type { PolicyContent } from '../types'

export const content: PolicyContent = {
  title: 'Privacy Policy',
  updatedLabel: 'Last updated: November 2026',
  intro: [
    'VozIt! ("VozIt," "we," "us") operates a citizen journalism platform where reporters capture and share eyewitness video, and viewers read, watch, and support that reporting. This policy explains what information we collect, why we collect it, and how it’s used — including for the advertising that helps fund VozIt and pay reporters.',
  ],
  sections: [
    {
      heading: 'Information we collect',
      paragraphs: [
        { label: 'Account information.', text: 'Email address, username, display name, and password (stored securely, never in plain text) when you register. If you sign in with Google or Facebook, we receive your name, email, and profile photo from that provider instead.' },
        { label: 'Report content and verification data.', text: 'When you submit a report, we collect the video itself along with location (GPS coordinates), device orientation (compass bearing and tilt), altitude, and timezone — read directly from your device’s own sensors at the moment of capture. This "ground-truth" data is core to how VozIt verifies that a report was genuinely filmed where and when it claims to be, and is shown alongside published reports as part of their credibility signals.' },
        { label: 'Payment information.', text: 'If you receive payouts or make a payment (e.g. licensing a report), payment details are collected and processed by our payment partners (including Stripe and our payout providers) — VozIt does not store your full card or bank account numbers on its own servers.' },
        { label: 'Usage and device information.', text: 'IP address, browser/device type, and similar technical data, used for security (for example, detecting fraudulent voting patterns) and to keep the service reliable.' },
        { label: 'Cookies.', text: 'We use cookies to keep you signed in and to remember your preferences. If advertising is active on VozIt, Google and its advertising partners may also use cookies and similar technologies to serve and measure ads — see "Advertising" below.' },
      ],
    },
    {
      heading: 'How we use information',
      list: [
        'To operate the platform — publishing reports, processing payouts, and showing you relevant content',
        'To verify the authenticity of reports using device-sourced location and sensor data',
        'To moderate content for safety and legal compliance before publication',
        'To detect and prevent fraud, including fake accounts and manipulated voting',
        'To communicate with you — account verification, password resets, and service updates',
        'To comply with legal obligations, including sanctions and payment-compliance screening on payouts',
      ],
    },
    {
      heading: 'Advertising',
      paragraphs: [
        'VozIt uses Google AdSense to show ads that help fund the platform and pay reporters their share of revenue. Google and its partners use cookies to serve ads based on your visits to VozIt and other sites, and to measure how ads perform. You can learn more about how Google uses this data, and control your ad personalization settings, via Google’s Partner Sites policy and Google Ads Settings (linked from the English version of this page). If you’re in the European Economic Area, additional consent is required before personalized ads are shown; without it, you’ll see non-personalized ads instead.',
      ],
    },
    {
      heading: 'Who we share information with',
      paragraphs: [
        'We share information with the service providers that make VozIt work, each only for the purpose of providing their specific service:',
      ],
      list: [
        'Supabase — account data, report data, and authentication',
        'Mux — video hosting, streaming, and processing',
        'Stripe and our payout providers — payments and reporter payouts',
        'Hive — automated content moderation',
        'Anthropic (Claude) — analyzing report text for the 5W summary shown with each report, and translating report content and chat-based submissions between languages. Anthropic processes this text to perform these functions and does not use it to train its models.',
        'Resend — transactional email (account verification, password resets)',
        'Google (AdSense) — advertising, as described above',
        'Telegram — if you submit a report by chatting with VozIt’s Telegram bot instead of the website, Telegram carries that conversation (including your video and any location you share) to our servers the same way it carries any other message you send on its platform',
      ],
    },
    {
      heading: 'Published reports are public',
      paragraphs: [
        'Published reports — including their title, description, video, and location — are public by design: that’s the point of citizen journalism. We do not sell your personal account information (email, password, payment details) to third parties.',
      ],
    },
    {
      heading: 'Your choices',
      paragraphs: [
        'You can update your account information from Settings at any time. You can delete your own account at any time from Settings, or by contacting us at the email below — note that published reports may remain available as part of the public record, consistent with how journalism archives work, even after an account is deleted.',
      ],
    },
    {
      heading: 'Children’s privacy',
      paragraphs: [
        'VozIt is not directed to children under 13, and you must be at least 13 to create an account — consistent with the U.S. Children’s Online Privacy Protection Act (COPPA) and similar laws elsewhere. We do not knowingly collect personal information from anyone under 13. If we learn that we’ve collected information from a child under 13 without a parent or guardian’s consent, we’ll delete that account and its data. If you believe a child has created an account or appears in a report, contact us at the email below and we’ll look into it promptly.',
      ],
    },
    {
      heading: 'Changes to this policy',
      paragraphs: [
        'We may update this policy as VozIt evolves. We’ll update the "Last updated" date above when we do.',
      ],
    },
  ],
  contactLabel: 'Questions about this policy or your data? Email',
}
