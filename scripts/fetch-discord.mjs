/**
 * Refreshes data/generated/discord.json — the member count on the stat tile.
 *
 * Discord answers the invite endpoint anonymously, so this needs no bot, no
 * application and no token: asking about an invite with `with_counts` returns
 * the server's approximate member and online counts. The alternative, the
 * widget endpoint, requires the widget to be switched on in server settings and
 * is currently disabled — the invite route works with the server as it stands.
 *
 * The invite code is read from site.config.ts so the link the site publishes
 * and the server the counter reports on cannot drift apart.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ROOT, get, log, quantise, readJson, writeJsonIfChanged } from './lib/net.mjs'

const OUT = 'data/generated/discord.json'
const SOURCE = 'site.config.ts'

const previous = readJson(OUT, {})

function inviteCode() {
  try {
    const src = readFileSync(path.join(ROOT, SOURCE), 'utf8')
    return src.match(/discord\.gg\/([\w-]+)/)?.[1] ?? null
  } catch (err) {
    log.warn(`could not read ${SOURCE}: ${err.message}`)
    return null
  }
}

async function fetchGuild(code) {
  const body = await get(
    `https://discord.com/api/v10/invites/${code}?with_counts=true&with_expiration=true`,
  )
  if (!body) return null

  let invite
  try {
    invite = JSON.parse(body)
  } catch (err) {
    log.warn(`could not parse the invite response: ${err.message}`)
    return null
  }

  // An expiring invite is a dead link on a fixed date, and this counter dies
  // with it. Say so on every run so it cannot pass unnoticed.
  if (invite.expires_at) {
    log.warn(
      `invite ${code} expires ${invite.expires_at} — replace it in ${SOURCE} with a ` +
        'never-expiring, unlimited-use invite',
    )
  }

  const members = Number(invite.approximate_member_count)
  if (!Number.isFinite(members) || members <= 0) {
    log.warn('invite carried no member count — keeping the committed figure')
    return null
  }

  // Step 10, not the default 100: this community is in the hundreds, where
  // flooring to 100 would report 558 members as "500+" and stay wrong for
  // months. Flooring at all is what keeps the "+" on the tile honest.
  return { memberCount: quantise(members, 10) }
}

const code = inviteCode()
if (!code) {
  log.warn(`no Discord invite found in ${SOURCE} — keeping the committed file`)
} else {
  const guild = await fetchGuild(code)
  writeJsonIfChanged(OUT, {
    inviteCode: code,
    memberCount: guild?.memberCount ?? previous.memberCount,
  })
}

// Always succeed. A refresh failure is a stale site, not a broken one.
process.exit(0)
