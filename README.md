# website

Website for the [MLOps MENA Community](https://www.linkedin.com/company/mlops-mena) —
free MLOps and AI learning for engineers across the Middle East and North Africa.

Next.js 14 (App Router) + Tailwind, exported to static HTML and served from GitHub Pages.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export into ./out
npm run serve    # preview the exported ./out
```

## Pages

| Page | Route |
|---|---|
| Home | `/` |
| Roadmaps | `/roadmaps` + one page per roadmap |
| Courses | `/courses` |
| The MLOps Practitioner | `/courses/mlops-practitioner` |
| Sessions | `/sessions` |
| Meet the Team | `/team` |
| Mentorship & Consultation | `/mentorship` |
| Articles | `/articles` |
| FAQ | `/faq` |

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
- Confirm the community email: `mlopsmenacommunity@gmail.co` (Gmail is normally `.com`)

## Design

Colours are sampled directly from the community logo.

| Token | Hex |
|---|---|
| Background navy | `#08142E` |
| Teal | `#33CEC0` |
| Cyan | `#2CACD1` |
| Amber | `#EC9723` |

Source material used to build the site is kept in `roadmaps_folder/` and
`basic_community_info/`.
