# MLOps MENA Community — Website

Static site for the [MLOps MENA Community](https://www.linkedin.com/company/mlops-mena).
Next.js 14 (App Router) + Tailwind, exported to static HTML for GitHub Pages.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export into ./out
npm run serve    # preview the exported ./out
```

## Where the content lives

Everything editable is plain data — no CMS, no database.

| What | File |
|---|---|
| Links, stats, next session, partners | `site.config.ts` |
| The MLOps Practitioner course | `data/mlops-practitioner.ts` |
| WhatsApp study groups | `data/study-groups.ts` |
| FAQ + session material links | `data/faq.ts` |
| Repos, mentors, homepage pillars | `data/community.ts` |
| Roadmaps (full content) | `content/roadmaps/*.md` |
| Articles | `content/articles/*.md` |

### Adding an article

Drop a `.md` file into `content/articles/` with this frontmatter:

```yaml
---
title: "Your title"
description: "One-sentence summary for cards and search results."
date: "2026-08-21"
author: "Your name"
tags: ["mlops", "monitoring"]
readingTime: "8 min"
featured: false
---
```

It appears on `/articles` and the homepage automatically, newest first.

### Adding a roadmap

Drop a `.md` file into `content/roadmaps/`. Use `## Phase N — Title (Month X)`
headings — the phase timeline, the sticky sidebar, and the phase count are all
derived from those headings. Frontmatter:

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

Ordering is set by the `ORDER` array in `src/lib/roadmaps.ts`.

## Updating the next session

Edit `nextSession` in `site.config.ts`. `startsAt` **must** include the timezone
offset — Cairo is `+03:00` in summer (EEST) and `+02:00` in winter (EET). Get it
wrong and the homepage countdown drifts by an hour.

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes `./out` to GitHub Pages.

One-time setup:

1. **Settings → Pages → Source: GitHub Actions**
2. Point DNS at GitHub Pages for the domain in `public/CNAME`:
   - Four `A` records for the apex → `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153`
   - A `CNAME` record for `www` → `<org>.github.io`
3. **Settings → Pages → Custom domain**, then tick **Enforce HTTPS**.

Changing domain? Update `public/CNAME` *and* `site.url` in `site.config.ts`.

If you ever host at `<org>.github.io/<repo>` instead of a custom domain, set
`NEXT_PUBLIC_BASE_PATH=/<repo>` at build time — otherwise CSS and images 404.

## Still to fill in

Search the repo for `TODO:` — currently the Zomra course URL, and the real
mentor names in `data/community.ts`.

## Design

Colours are sampled from the community logo:

| Token | Hex |
|---|---|
| Background navy | `#08142E` |
| Teal | `#33CEC0` |
| Cyan | `#2CACD1` |
| Amber | `#EC9723` |
