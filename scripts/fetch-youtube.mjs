/**
 * Refreshes data/generated/youtube.json from the community channel.
 *
 * Two sources, deliberately:
 *
 *   videos  — the public Atom feed. No key, no quota, works in a fork and on a
 *             laptop with no configuration at all.
 *   stats   — Data API v3, which needs a key. This half is a strict enhancement:
 *             without YOUTUBE_API_KEY the committed numbers simply stay.
 *
 * The key is read here and nowhere else. In a static export anything a client
 * component can reach is published, so a key used at render time is a leaked
 * key; what crosses into `next build` is two integers in a JSON file.
 */
import { XMLParser } from 'fast-xml-parser'
import { get, log, quantise, readJson, writeJsonIfChanged } from './lib/net.mjs'

const OUT = 'data/generated/youtube.json'
const CHANNEL_ID = 'UCKX8X4NwhP9Qb4g13SCa84Q'
/** Keep well under the ~15 the feed returns; more is noise on the site. */
const MAX_VIDEOS = 12

const previous = readJson(OUT, { channelId: CHANNEL_ID, stats: {}, videos: [] })

async function fetchVideos() {
  const xml = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`)
  if (!xml) return null

  let entries
  try {
    const feed = new XMLParser({ ignoreAttributes: false }).parse(xml)?.feed
    entries = feed?.entry ? [].concat(feed.entry) : []
  } catch (err) {
    log.warn(`could not parse the Atom feed: ${err.message}`)
    return null
  }

  const videos = entries
    .map((e) => ({
      id: String(e['yt:videoId'] ?? ''),
      title: String(e.title ?? '').trim(),
      published: new Date(e.published).toISOString(),
    }))
    .filter((v) => v.id && v.title)
    // Newest first, id as the tiebreak so the order never depends on feed order.
    .sort((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id))
    .slice(0, MAX_VIDEOS)

  // A 200 with an empty feed is a failure, not a truth about the channel.
  if (videos.length === 0) {
    log.warn('feed parsed but contained no videos — keeping the committed list')
    return null
  }
  return videos
}

async function fetchStats() {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) {
    log.info('YOUTUBE_API_KEY not set — skipping channel statistics, keeping committed values')
    return null
  }

  const body = await get(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${CHANNEL_ID}&key=${key}`,
  )
  if (!body) return null

  let s
  try {
    s = JSON.parse(body)?.items?.[0]?.statistics
  } catch (err) {
    log.warn(`could not parse the statistics response: ${err.message}`)
    return null
  }
  if (!s) {
    log.warn('statistics missing from the response — keeping committed values')
    return null
  }

  // hiddenSubscriberCount omits the field entirely; YouTube also rounds the
  // subscriber figure to three significant digits, which is fine for a "3,000+"
  // tile but is not an exact number.
  return {
    subscriberCount: quantise(Number(s.subscriberCount)) ?? previous.stats?.subscriberCount,
    viewCount: quantise(Number(s.viewCount)) ?? previous.stats?.viewCount,
    videoCount: Number(s.videoCount) || previous.stats?.videoCount,
  }
}

const [videos, stats] = await Promise.all([fetchVideos(), fetchStats()])

writeJsonIfChanged(OUT, {
  channelId: CHANNEL_ID,
  stats: stats ?? previous.stats ?? {},
  videos: videos ?? previous.videos ?? [],
})

// Always succeed. A refresh failure is a stale site, not a broken one.
process.exit(0)
