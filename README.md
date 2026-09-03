# website

Website for the [MLOps MENA Community](https://www.linkedin.com/company/mlops-mena) —
free MLOps and AI learning for engineers across the Middle East and North Africa.

Next.js 14 (App Router) + Tailwind, exported to static HTML and served from GitHub Pages.
Two language editions (English at the root, Arabic under `/ar`) and a light/dark theme.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export into ./out
npm run serve        # preview the exported ./out
npm test             # session state machine
npm run check:i18n   # what is missing an Arabic translation
npm run refresh      # pull fresh YouTube, GitHub and Discord data (the only scripts that use the network)
```

`next build` never touches the network. `npm run refresh` is separate and
failure-tolerant, so a clone with no connection still builds.

## Pages

Every page exists twice — English at the root and Arabic under `/ar`.

| Page | Route |
|---|---|
| Home | `/` · `/ar` |
| Roadmaps | `/roadmaps` + one page per roadmap |
| Courses | `/courses` |
| The MLOps Practitioner | `/courses/mlops-practitioner` |
| Sessions | `/sessions` |
| Meet the Team | `/team` |
| Mentorship & Consultation | `/mentorship` |
| Articles | `/articles` |
| FAQ | `/faq` |

## How the two editions fit together

```
src/
  views/          one component per page, takes `lang` — rendered by both editions
  app/(en)/…      English routes  ->  /roadmaps
  app/(ar)/ar/…   Arabic routes   ->  /ar/roadmaps
  app/not-found   /404.html
  lib/i18n.ts         UI strings (`ar` is typed as `typeof en`, so a missing
                      translation is a build error)
  lib/content-i18n.ts Arabic overlays for data/*.ts — sessions, team bios, FAQ,
                      pillars, roadmap metadata, the course
```

Each edition has its own root layout (`app/(en)/layout.tsx`, `app/(ar)/layout.tsx`)
because that is the only way to put `lang` and `dir` on `<html>` in a static export.
`app/layout.tsx` is a pass-through that exists only so `app/not-found.tsx` has a root.

**Adding a page:** write `src/views/XView.tsx` taking `{ lang }`, add its strings to
both dictionaries in `src/lib/i18n.ts`, then add a three-line `page.tsx` under
`app/(en)/…` and `app/(ar)/ar/…`. Add the path to `src/app/sitemap.ts`.

The three roadmap markdown documents stay in English in both editions — their
metadata, phases, and the UI around them are translated; the body is not. The
Arabic pages say so in a notice above the article.

## Theme

Light is the default; the nav toggle switches to dark and remembers the choice in
`localStorage`. Nothing hard-codes a colour: every surface, text and accent shade is
a CSS variable in `src/app/globals.css` (`:root` for light, `.dark` for dark) exposed
to Tailwind as a semantic name.

| Use it for | Class |
|---|---|
| Page background / alternating band | `bg-bg` · `bg-alt` |
| Cards and inset panels | `bg-surface` · `bg-surface-2` · `bg-surface-hover` |
| Headings / body / secondary / meta / decorative | `text-fg` · `text-body` · `text-muted` · `text-faint` · `text-ghost` |
| Hairlines | `border-line` · `bg-line-strong` |
| Brand accents (auto-darkened in light mode) | `text-cyan-400` · `text-teal` · `text-amber-400` · `text-violet` |

Never write `text-white`, `text-slate-*`, `border-white/10` or `bg-ink-*` in a
component — they only work in one theme.

## Where the content lives

Everything editable is plain data — no CMS, no database.

| What | File |
|---|---|
| Links, stats, contacts, partners, nav, Brainsmingle | `site.config.ts` |
| The MLOps Practitioner (outline, recordings, resources) | `data/mlops-practitioner.ts` |
| Live sessions — upcoming and past | `data/sessions.ts` |
| Team hierarchy | `data/team.ts` |
| WhatsApp study groups | `data/study-groups.ts` |
| FAQ + session 1 material | `data/faq.ts` |
| Published articles (LinkedIn / Medium) | `data/articles.ts` |
| Mentorship, consultation, internships, LLMOps course | `data/offerings.ts` |
| Repos and homepage pillars | `data/community.ts` |
| Key free resources | `data/resources.ts` |
| Roadmaps (full text) | `content/roadmaps/*.md` |
| Student guides (full text) | `content/student-guides/<slug>/<level>-<track>.md` |
| UI strings, both languages | `src/lib/i18n.ts` |
| Arabic translations of the data above | `src/lib/content-i18n.ts` |

### Adding a roadmap

Drop a `.md` file into `content/roadmaps/`. Use `## Phase N — Title (Month X)` headings —
the phase timeline, sticky sidebar, and phase count are all derived from them.

```yaml
---
title: "Roadmap name"
tagline: "One line"
accent: "cyan"        # cyan | amber | violet
level: "Beginner → Job-ready"
duration: "6–9 months"
commitment: "10–15 hrs/week"
published: "2026-06-27"
sourceUrl: "https://www.linkedin.com/pulse/..."
audience: "Who this is for."
---
```

Ordering comes from the `ORDER` array in `src/lib/roadmaps.ts`.

### Adding a student guide

Guides are plain markdown — **no frontmatter**, because the metadata lives in
`data/student-guides.ts` and in the route's `pageMetadata()`.

Every guide is a 3 × 3 grid: three levels (`beginner`, `mid`, `senior`) × three tracks
(`detailed`, `interview`, `tips`), so nine files at
`content/student-guides/<slug>/<level>-<track>.md`. All nine must exist before the slug is
registered.

Use `## Title` headings. Section numbers, the contents list, and the per-pane counts on the
catalogue card are all derived from them, so a heading is structure rather than decoration.

A fenced code block can carry a file label after the language, which becomes the code
window's title bar:

````markdown
```yaml .github/workflows/ci.yml
on: push
```
````

Beyond markdown, a guide may embed these presentational blocks as raw HTML. They are styled
under `.student-guide-prose` in `src/app/globals.css`:

| Block | Shape |
|---|---|
| `.guide-stat-strip` | `.guide-stat` > `<b>` + `<span>` — key facts at the top of a guide |
| `.callout` (`.note`, `.tip`, `.warn`) | `<span class="ct">Title</span>` then prose |
| `.cards` | `.card` > `.icon` + `<h4>` + `<p>` |
| `.flow` | `.node` (+ `<small>`) separated by `.arrow` |
| `ol.guide-steps` | `<li><b>Step title</b>body</li>` — auto-numbered with a connector |
| `.guide-compare` | `.guide-compare-col.good` / `.bad` > `<h4>` + `<ul>` |
| `.guide-timeline` | `.guide-timeline-item` > `<span>` + `<strong>` + `<small>` |
| `.pill` (`.req`, `.opt`) | Inline badge, usable inside table cells |

**Adding a new block class means touching three places**: the CSS, the `REVEAL_SELECTOR`
list in `src/components/GuideArticle.tsx`, and the `.guide-motion-ready` selectors in
`globals.css`. Miss one and the block either never fades in or stays invisible.

To register a whole new guide: write the nine panes at
`content/student-guides/<slug>/{beginner,mid,senior}-{detailed,interview,tips}.md` **first**,
then add the slug to `GUIDE_SLUGS` in `src/lib/student-guides.server.ts`, an entry in
`data/student-guides.ts` (which also feeds `src/app/sitemap.ts`), a view in `src/views/`, an
`(en)` and an `(ar)` `page.tsx`, and the per-slug icon, card classes, and decorative CSS in
`src/components/StudentGuidesCatalog.tsx` and `globals.css`. The markdown has to exist before
the slug is registered, because the catalogue counts every pane at build time.

### Adding a session

Add it to the single `sessions` array in `data/sessions.ts` and put a 1200px cover at
`public/sessions/<slug>.jpg`. **There is nothing to move when it airs** — upcoming, live,
ended and archived are derived from `startsAt` + `durationMinutes` (default 120).

After it airs, paste its `youtubeId` to turn "Ended — recording coming soon" into a watch
link. Add the Arabic subtitle/topics to `sessionsAr` in `src/lib/content-i18n.ts`; the
date needs no translation, it is formatted from `startsAt` in both languages.

Render any point in time without touching the system clock:

```bash
SESSION_NOW=2026-09-01T12:00:00Z npm run build
```

### Adding an article

```bash
npm run add:article -- <url> --tags roadmap,career --internal /roadmaps/foo
```

Fetches that one page's Open Graph tags and appends to `data/generated/articles.json`,
which `data/articles.ts` spreads in. Hand-written entries in `data/articles.ts` always win.

LinkedIn's API cannot return long-form Articles (the `/pulse/` URLs) at any access tier and
there is no RSS, so this is the automated path — one fetch of a URL you supply, not
ingestion. If LinkedIn ever stops serving those tags the script writes a stub with `TODO`
fields instead of failing.

### How the site stays current

`.github/workflows/deploy.yml` rebuilds every six hours as well as on push. That is what
moves an aired session into "Past" and refreshes the YouTube, GitHub and Discord figures. Between rebuilds the
browser corrects each session's badge and hides its register button, so a stale page is
never actively wrong.

`data/generated/` is written by `npm run refresh` and committed on purpose — a fresh clone
with no network still builds, and the git history is an audit trail. Fetchers never fail
the build and never write an empty payload over a good one.

Three fetchers feed it, and every one of them degrades to the committed numbers rather
than to a blank or a zero:

| Script | Fills | Needs |
|---|---|---|
| `fetch-youtube.mjs` | Video list, subscriber and view tiles | Video list: nothing. Tiles: a `YOUTUBE_API_KEY` repo secret |
| `fetch-github.mjs` | Every public repo under our org, with stars and forks | Nothing — anonymous REST API |
| `fetch-discord.mjs` | Discord member tile | Nothing — the invite endpoint answers anonymously |

For the YouTube tiles, add a `YOUTUBE_API_KEY` repo secret (Google Cloud → YouTube Data
API v3, restricted to that API). Without it the video list still refreshes and the two
YouTube tiles keep their hand-set floors. The key is read only inside
`scripts/fetch-youtube.mjs` — never at render time, where a static export would publish it.

The GitHub fetcher lists every public repo under the org in `channels.github`, so
publishing a repo is the whole act of putting it on the homepage — description, language,
stars and forks all come from GitHub, and forks and archived repos are skipped. A repo with
no description on GitHub falls back to `repoNotes` in `data/community.ts`; writing the
description on GitHub is the better fix. Private repos never appear, by design. The Discord
fetcher takes the invite code from `site.config.ts`. **That
invite must never expire** — an expiring one takes the join link and the counter down with
it on the same day.

### Adding team photos and bios

In `data/team.ts`, set `photo` to a file you added under `public/team/` (e.g.
`/team/omar-salah.jpg`), replace the placeholder `bio`, and paste the `linkedin` URL.
Anything left empty degrades gracefully — an initials avatar, and no LinkedIn link.

## Session times

`startsAt` must include the timezone offset. **Cairo is `+03:00` in summer (EEST) and
`+02:00` in winter (EET)** — get it wrong and every countdown is off by an hour.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and publishes `./out`
to GitHub Pages.

One-time setup:

1. **Settings → Pages → Source: GitHub Actions**
2. Point DNS at GitHub Pages for the domain in `public/CNAME`:
   - Four `A` records for the apex → `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153`
   - A `CNAME` record for `www` → `MLOpsMENACommunity.github.io`
3. **Settings → Pages → Custom domain**, then tick **Enforce HTTPS**.

Changing domain? Update `public/CNAME` **and** `site.url` in `site.config.ts`.

Hosting at `MLOpsMENACommunity.github.io/website` instead of a custom domain? Build with
`NEXT_PUBLIC_BASE_PATH=/website` — otherwise CSS and images 404.

## Still to fill in

Search the repo for `TODO:`.

- Google Drive link for the mini/final projects PDF (`data/mlops-practitioner.ts`)
- Team photos, bios, and LinkedIn URLs (`data/team.ts`)
- Docker Deep Dive start time — the date is confirmed, the time is assumed (`data/sessions.ts`)
- Paste the Docker Deep Dive `youtubeId` (`AFcoKDtyhec` looks like it) into
  `data/sessions.ts` so the card links its recording
- Send a test message to `hello@mlopsmena.com` and to one team address. The domain's
  MX records point at Cloudflare Email Routing, but routing only delivers for addresses
  that have a rule *and* a verified destination inbox — an address in `site.config.ts`
  or `data/team.ts` without one silently bounces.

## Design

Colours are sampled directly from the community logo. The brand hues below are the
gradient stops and stay fixed in both themes; the light theme darkens the *text* shades
of teal/cyan/amber so they pass contrast on white (see the theme table above).

| Token | Hex |
|---|---|
| Background navy (dark theme) | `#08142E` |
| Teal | `#33CEC0` |
| Cyan | `#2CACD1` |
| Amber | `#EC9723` |

Source material used to build the site is kept in `roadmaps_folder/` and
`basic_community_info/`.
