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
