import youtube from '~/data/generated/youtube.json'
import { stats as baseStats, type StatId } from '~/site.config'

/**
 * Declared rather than inferred from the JSON: a refresh that could not reach
 * the statistics endpoint writes `{}`, and inferring the type from the file
 * would turn that into a compile error rather than the intended fallback.
 */
type ChannelStats = { subscriberCount?: number; viewCount?: number; videoCount?: number }

/**
 * The stat tiles, with the two YouTube figures replaced by the real channel
 * numbers when a refresh has fetched them.
 *
 * Falls back per-field rather than wholesale: a refresh that got the video list
 * but not the statistics (no API key, quota exhausted) still leaves the tiles
 * showing the hand-set floor rather than a zero.
 */
export function getStats() {
  const channel = (youtube.stats ?? {}) as ChannelStats
  const live: Partial<Record<StatId, number | undefined>> = {
    'yt-views': channel.viewCount,
    'yt-subs': channel.subscriberCount,
  }

  return baseStats.map((s) => {
    const fetched = live[s.id]
    return typeof fetched === 'number' && fetched > 0 ? { ...s, value: fetched } : s
  })
}
