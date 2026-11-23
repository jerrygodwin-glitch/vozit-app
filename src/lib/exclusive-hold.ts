// A report under an active exclusive license is pulled from every public
// listing — feed, homepage, search, sitemap — while the hold lasts, so the
// buyer who paid a premium for "exclusive" isn't undercut by the same
// footage still sitting free (with VozIt's own ads) on vozit.net itself.
// The hold lifts itself automatically once exclusive_hold_until passes —
// nothing needs to actively "republish" a report, every query here just
// stops excluding it once the timestamp is in the past.
export function excludeExclusiveHoldFilter(): string {
  return `exclusive_hold_until.is.null,exclusive_hold_until.lte.${new Date().toISOString()}`
}

export function isExclusivelyHeld(exclusiveHoldUntil: string | null | undefined): boolean {
  return !!exclusiveHoldUntil && new Date(exclusiveHoldUntil) > new Date()
}

// Which tier's active exclusivity blocks which other tier's new requests.
// Wire Service redistributes to an entire subscriber network, so a wire
// exclusive blocks every other tier too — there's no real scarcity left for
// anyone else to usefully buy into once wire has it. A broadcast exclusive
// only protects direct-to-public/broadcast use (broadcast itself, and
// digital — a digital license still lets the buyer publish it online,
// which undermines a TV exclusive just as much as another broadcaster
// would); it does NOT block a wire deal, since wire is a fundamentally
// different, much larger distribution channel a single broadcaster isn't
// paying enough to control.
export function exclusiveBlocksTier(activeExclusiveTier: string, candidateTier: string): boolean {
  if (activeExclusiveTier === 'wire') return true
  if (activeExclusiveTier === 'broadcast') return candidateTier !== 'wire'
  return true
}
