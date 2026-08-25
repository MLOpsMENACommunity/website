/**
 * Unit tests for the session state machine.
 *
 * Run with `npm test` (node --test, built into Node 20 — no test framework).
 * The logic is duplicated here rather than imported because the source is TS
 * and Node 20 cannot strip types; the duplication is deliberate and small, and
 * the assertions below are the specification.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Guard against the copy below drifting from the real implementation.
const src = readFileSync(new URL('../src/lib/sessions.ts', import.meta.url), 'utf8')
test('implementation still has the shape these tests assume', () => {
  assert.match(src, /DEFAULT_DURATION_MINUTES = 120/)
  assert.match(src, /if \(now < sessionStartsAt\(s\)\) return 'upcoming'/)
  assert.match(src, /if \(now < sessionEndsAt\(s\)\) return 'live'/)
  assert.match(src, /return recordingUrl\(s\) \? 'archived' : 'ended'/)
})

const DEFAULT_DURATION_MINUTES = 120
const startsAt = (s) => new Date(s.startsAt).getTime()
const endsAt = (s) => startsAt(s) + (s.durationMinutes ?? DEFAULT_DURATION_MINUTES) * 60_000
const recordingUrl = (s) =>
  s.recordingUrl ?? (s.youtubeId ? `https://www.youtube.com/watch?v=${s.youtubeId}` : undefined)
const sessionState = (s, now) => {
  if (now < startsAt(s)) return 'upcoming'
  if (now < endsAt(s)) return 'live'
  return recordingUrl(s) ? 'archived' : 'ended'
}

const at = (iso) => new Date(iso).getTime()
const base = { slug: 'x', startsAt: '2026-08-22T20:00:00+03:00' }

test('before the start time it is upcoming', () => {
  assert.equal(sessionState(base, at('2026-08-22T19:59:59+03:00')), 'upcoming')
})

test('the start instant itself is live, not upcoming', () => {
  assert.equal(sessionState(base, at('2026-08-22T20:00:00+03:00')), 'live')
})

test('inside the window it is live', () => {
  assert.equal(sessionState(base, at('2026-08-22T21:30:00+03:00')), 'live')
})

test('the end instant flips it out of live', () => {
  assert.equal(sessionState(base, at('2026-08-22T22:00:00+03:00')), 'ended')
})

test('over with no recording is ended, not archived', () => {
  assert.equal(sessionState(base, at('2026-08-25T00:00:00+03:00')), 'ended')
})

test('over with a youtubeId is archived', () => {
  const s = { ...base, youtubeId: '0ta-roIGJWc' }
  assert.equal(sessionState(s, at('2026-08-25T00:00:00+03:00')), 'archived')
})

test('an explicit recordingUrl also archives it', () => {
  const s = { ...base, recordingUrl: 'https://example.com/v' }
  assert.equal(sessionState(s, at('2026-08-25T00:00:00+03:00')), 'archived')
})

test('durationMinutes overrides the default window', () => {
  const s = { ...base, durationMinutes: 30 }
  assert.equal(sessionState(s, at('2026-08-22T20:45:00+03:00')), 'ended')
  assert.equal(sessionState(base, at('2026-08-22T20:45:00+03:00')), 'live')
})

test('the offset in startsAt is respected, not the runner timezone', () => {
  // 20:00+03:00 is 17:00Z. At 17:30Z the session is live regardless of TZ.
  assert.equal(sessionState(base, at('2026-08-22T17:30:00Z')), 'live')
  assert.equal(sessionState(base, at('2026-08-22T16:30:00Z')), 'upcoming')
})
