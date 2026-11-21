import { Top, Nav } from '@/lib/ui'

export const metadata = {
  title: 'Correction & Moderation Policy — VozIt!',
  description: 'How VozIt reviews, removes, and corrects reports, and how to flag or dispute something.',
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#fff', paddingBottom: 72 },
  wrap: { maxWidth: 760, margin: '0 auto', padding: '28px 20px' },
  back: { fontSize: 13, color: '#0a8fe8', textDecoration: 'none', display: 'inline-block', marginBottom: 14 },
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  updated: { fontSize: 12, color: '#999', marginBottom: 28 },
  h2: { fontSize: 17, fontWeight: 700, marginTop: 28, marginBottom: 8, color: '#1a1a1a' },
  p: { fontSize: 14, color: '#333', lineHeight: 1.7, marginBottom: 10 },
  li: { fontSize: 14, color: '#333', lineHeight: 1.7, marginBottom: 6 },
  ul: { paddingLeft: 20, marginBottom: 10 },
}

export default function ModerationPolicyPage() {
  return (
    <div style={S.page}>
      <Top />
      <div style={S.wrap}>
        <a href="/policies" style={S.back}>&larr; Terms and Policies</a>
        <h1 style={S.h1}>Correction & Moderation Policy</h1>
        <p style={S.updated}>Last updated: November 2026</p>

        <p style={S.p}>
          VozIt carries eyewitness footage from breaking news, conflict zones, and
          protests — content where minutes matter. This policy explains how a
          report is reviewed before and after it's published, what gets removed
          and why, and how to flag or dispute something.
        </p>

        <h2 style={S.h2}>Every report is scanned before it publishes</h2>
        <p style={S.p}>
          When a report is submitted, VozIt runs it through automated AI
          moderation (visual, audio, and text) and a 5W analysis (who, what,
          where, when, why) before it appears anywhere on the platform. This
          happens in seconds, not days, so that time-sensitive footage doesn't
          sit waiting. The scan checks for:
        </p>
        <ul style={S.ul}>
          <li style={S.li}>Sexual content, nudity, and content involving minors</li>
          <li style={S.li}>Hate speech and hate symbols</li>
          <li style={S.li}>Drug use and self-harm depictions</li>
          <li style={S.li}>AI-generated or deepfake video and synthetic/cloned voice audio</li>
          <li style={S.li}>Spam, and metadata that's internally inconsistent (for example, a claimed time that's in the future, or a location name with no GPS to support it)</li>
        </ul>

        <h2 style={S.h2}>What happens when something is flagged by the scan</h2>
        <p style={S.p}>
          A report that trips one of these checks with high confidence is
          removed automatically, immediately, without waiting on a person to
          look at it first — this keeps the platform safe at the speed breaking
          content moves. A small number of categories (content sexually
          exploiting minors) result in an immediate, permanent account ban
          rather than just a removal.
        </p>
        <p style={S.p}>
          Content that's merely borderline, rather than clearly violating,
          publishes as normal — it isn't held in a review queue. Instead it's
          backstopped by the community tools below, and by VozIt's own ongoing
          spot-checks of published reports.
        </p>

        <h2 style={S.h2}>Violent and graphic news footage is not auto-removed</h2>
        <p style={S.p}>
          Combat footage, weapons, and injury are core to what VozIt exists to
          carry — war and protest footage routinely contains exactly this. These
          categories are never automatically removed no matter how the scan
          scores them. Graphic (gory) moments are instead marked for the player
          to blur, so viewers can choose to see the unblurred footage rather
          than having the report pulled outright.
        </p>

        <h2 style={S.h2}>Self-harm content is handled differently</h2>
        <p style={S.p}>
          Footage that may depict self-harm can trigger a crisis-resource panel
          shown to viewers, localized to them, even when the content otherwise
          publishes normally. Only a high-confidence match is removed outright
          — and when it is, the person who submitted it is not issued a strike,
          since they may be the person who needs support, not someone to
          penalize.
        </p>

        <h2 style={S.h2}>Community flagging</h2>
        <p style={S.p}>
          Any signed-in viewer can flag a report as fake or AI-generated,
          recycled footage, wrong location or time, explicit, hateful, or for
          another reason. A flag doesn't remove a report by itself — it's a
          visible public signal (shown once enough people raise the same
          concern) and a prompt for VozIt to take a closer look. Flag counts are
          shown anonymously; who flagged something is never made public.
        </p>

        <h2 style={S.h2}>Corrections, removal, and account strikes</h2>
        <p style={S.p}>
          When a report is removed — whether by the automated scan or after a
          closer look — the reporter responsible receives a strike on their
          account. Strikes escalate: a first strike is a warning, a second adds
          a 7-day restriction, a third a 30-day suspension, and a fourth is a
          permanent ban. Severe violations (such as AI-generated content
          presented as real, or exploitation of minors) skip straight to a
          permanent ban and forfeit any pending earnings, regardless of strike
          history.
        </p>
        <p style={S.p}>
          A report can also be restored if it was removed in error, and strike
          decisions can be reversed on review.
        </p>

        <h2 style={S.h2}>Disputing a decision or reporting an error</h2>
        <p style={S.p}>
          If your report was removed and you believe that was a mistake, or you
          spot an error in a published report (wrong location, outdated
          footage, a factual mistake in the 5W summary), email{' '}
          <a href="mailto:vozitnews@gmail.com" style={{ color: '#0a8fe8' }}>vozitnews@gmail.com</a>{' '}
          with the report link and what you believe is wrong. We review every
          correction request.
        </p>

        <h2 style={S.h2}>Changes to this policy</h2>
        <p style={S.p}>
          As VozIt's moderation tools evolve, this policy will be updated to
          match. We'll update the "Last updated" date above whenever that
          happens. See the full list of VozIt's governing documents on the{' '}
          <a href="/policies" style={{ color: '#0a8fe8' }}>Terms and Policies</a> page.
        </p>
      </div>
      <Nav />
    </div>
  )
}
