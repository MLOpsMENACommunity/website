# website

Website for the [MLOps MENA Community](https://www.linkedin.com/company/mlops-mena) —
free MLOps and AI learning for engineers across the Middle East and North Africa.

Next.js 14 (App Router) + Tailwind, exported to static HTML and served from GitHub Pages.
Two language editions (English at the root, Arabic under `/ar`) and a light/dark theme.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export into ./out
npm run serve    # preview the exported ./out
```

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

### Adding a session

Add an entry to `upcomingSessions` in `data/sessions.ts`. Put a 1200px cover image at
`public/sessions/<slug>.jpg` — the filename must match the entry's `slug`. When the session
is over, move it to `pastSessions` and add `recordingUrl`.

`upcomingSessions` drives the homepage's "This week at MLOps MENA" band, so a session
left there after it has aired keeps advertising itself with a live register button.
Move it the day after. Add the Arabic title/date/topics to `sessionsAr` in
`src/lib/content-i18n.ts`.

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
- Docker Deep Dive has already aired — move it to `pastSessions` with its recording URL
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
