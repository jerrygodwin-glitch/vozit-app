import type { PolicyContent } from '../types'

export const content: PolicyContent = {
  title: 'Reporter & Contributor Agreement',
  updatedLabel: 'Last updated: November 2026',
  intro: [
    'This governs your relationship with VozIt as a reporter submitting content — alongside, not instead of, VozIt’s Terms of Service. It applies no matter how you submit: the website, or VozIt’s Telegram bot, and any other submission channel VozIt adds in the future.',
  ],
  sections: [
    {
      heading: 'What you certify when you submit a report',
      paragraphs: ['By submitting a report, you’re certifying all of the following:'],
      list: [
        'You personally captured this footage, at the time and place you’ve indicated',
        'The footage is genuine and unaltered, and was not generated or synthesized by AI',
        'It doesn’t infringe anyone else’s copyright or other intellectual property rights',
        'You have the right to grant VozIt the license described below',
        'You’re not on a government sanctions list (including the U.S. Treasury’s OFAC list, or equivalent EU or UN lists)',
      ],
    },
    {
      heading: 'The license you grant VozIt',
      paragraphs: [
        'You keep full copyright ownership of everything you submit. By submitting, you grant VozIt a worldwide, non-exclusive, sublicensable license to host, display, distribute, watermark, promote, and sublicense your content through VozIt’s platform, its social media channels, and its licensing program — consistent with the revenue-sharing described below.',
      ],
    },
    {
      heading: 'Revenue sharing',
      paragraphs: [
        'You earn a share of ad revenue, licensing fees, and assignment fees your content generates, at the rate tied to your current tier:',
      ],
      table: {
        headers: ['Tier', 'Your share'],
        rows: [
          ['Starter', '40%'],
          ['Silver', '45%'],
          ['Gold', '50%'],
          ['Platinum', '55%'],
        ],
      },
    },
    {
      heading: 'How licensing revenue is actually split',
      paragraphs: [
        'For licensing fees specifically: VozIt retains 30% of the fee as a platform charge covering moderation, distribution, and infrastructure, and your tier percentage then applies to the remaining 70%. Tier rates may be adjusted going forward; changes never apply retroactively to revenue you’ve already earned. Payouts are processed through third-party providers and screened against OFAC sanctions lists before release.',
      ],
    },
    {
      heading: 'Requesting removal',
      paragraphs: [
        'You can ask VozIt to remove your content at any time. Removal doesn’t unwind a license VozIt had already granted to a media organization before your request — that license stays valid for its original duration.',
      ],
    },
    {
      heading: 'VozIt’s rights over your content',
      paragraphs: [
        'VozIt may decline to publish, blur graphic portions of, watermark, or remove content that violates the Terms of Service or applicable law.',
      ],
    },
    {
      heading: 'Indemnification',
      paragraphs: [
        'You agree to indemnify VozIt against claims arising from your content — including copyright infringement, defamation, or privacy-violation claims brought by someone else over what you submitted.',
      ],
    },
  ],
  contactLabel: 'Questions about this agreement: email',
}
