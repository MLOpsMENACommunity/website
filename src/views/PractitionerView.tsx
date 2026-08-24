import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, ArrowUpRight, ArrowRight, Check, Star, Radio, Clock, Users,
  Award, Infinity as InfinityIcon, FileText, Github, Target, AlertCircle,
  Presentation, Youtube, PlayCircle, CalendarDays,
} from 'lucide-react'
import Reveal from '@/components/Reveal'
import Countdown from '@/components/Countdown'
import FaqAccordion from '@/components/FaqAccordion'
import JoinCTA from '@/components/JoinCTA'
import HexField from '@/components/HexField'
import { course } from '~/data/mlops-practitioner'
import { studyGroups, groupRule, groupRuleNote } from '~/data/study-groups'
import { faqs } from '~/data/faq'
import { channels, partners } from '~/site.config'
import { asset } from '@/lib/asset'
import { t, localeHref, type Lang } from '@/lib/i18n'
import {
  courseAr, tCourseResource, tStudyGroup, tFaq, tGroupRule, groupRuleNoteAr,
} from '@/lib/content-i18n'

const includeIcons = [Radio, InfinityIcon, Users, Award]
const resourceIcons = { Github, Presentation, FileText, Youtube } as const

const groupAccent = {
  teal: { text: 'text-teal', border: 'border-teal/35', dot: 'bg-teal' },
  cyan: { text: 'text-cyan-400', border: 'border-cyan-400/35', dot: 'bg-cyan-400' },
  violet: { text: 'text-violet', border: 'border-violet/35', dot: 'bg-violet' },
  amber: { text: 'text-amber-400', border: 'border-amber-400/35', dot: 'bg-amber-400' },
} as const

export default function PractitionerView({ lang }: { lang: Lang }) {
  const copy = t(lang)
  const c = copy.practitionerPage
  const ar = lang === 'ar'
  const cc = ar ? courseAr : course
  const zomra = partners.find((p) => p.name === 'Zomra')
  const courseFaqs = faqs.filter((f) => f.scope === 'course').map((f) => tFaq(lang, f))

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-teal/10 blur-[110px]" />
        <div className="pointer-events-none absolute -right-32 -top-20 h-[30rem] w-[30rem] rounded-full bg-amber/10 blur-[110px]" />
        <HexField className="pointer-events-none absolute end-6 top-20 hidden h-56 w-80 text-hex lg:block" />

        <div className="relative mx-auto max-w-content px-5 py-16 sm:px-8">
          <Link href={localeHref(lang, '/courses')}
                className="inline-flex items-center gap-2 text-sm text-faint transition hover:text-fg">
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {copy.common.allCourses}
          </Link>

          <div className="mt-8 grid gap-12 lg:grid-cols-[1.35fr_1fr]">
            <div>
              <span className="eyebrow">{cc.status}</span>
              <h1 className="mt-4 text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
                The <span className="brand-text text-shadow-glow">MLOps Practitioner</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{cc.summary}</p>

              <div className="mt-8 flex flex-wrap items-center gap-2">
                {cc.facts.map((f) => (
                  <span key={f.label} className="chip">
                    <span className="font-semibold text-fg">{f.value}</span>
                    <span className="text-faint">{ar ? f.label : f.label.toLowerCase()}</span>
                  </span>
                ))}
                <span className="chip border-amber-400/30 text-amber-400">
                  <Star className="h-3 w-3 fill-amber-400" />
                  <span className="font-semibold">{course.rating.score}</span>
                  <span className="text-faint">({course.rating.count})</span>
                </span>
              </div>

              {/* Instructor */}
              <div className="mt-8 flex items-center gap-4 rounded-2xl border border-line bg-surface-2 p-4">
                <Image src={asset('/logo-mark.png')} alt="" width={52} height={52}
                       className="h-13 w-13 shrink-0 rounded-full object-cover ring-1 ring-line" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">{course.instructor.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-faint">
                    {ar ? courseAr.instructorRole : course.instructor.role}
                  </p>
                </div>
              </div>
            </div>

            {/* Enrol card */}
            <div className="relative self-start">
              <div className="absolute inset-0 -z-10 rounded-3xl brand-gradient opacity-15 blur-2xl" />
              <div className="card p-6">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">
                    {c.nextSession}
                  </span>
                </div>

                <p className="mt-4 text-lg font-bold leading-snug text-fg">{course.nextLesson.title}</p>
                <p className="mt-1.5 text-sm text-faint">
                  {ar ? courseAr.nextLessonDateLabel : course.nextLesson.dateLabel}
                </p>

                <div className="mt-5"><Countdown iso={course.nextLesson.startsAt} lang={lang} /></div>

                <div className="mt-6 space-y-2.5">
                  {cc.includes.map((inc, i) => {
                    const Icon = includeIcons[i] ?? Check
                    return (
                      <div key={inc} className="flex items-start gap-2.5 text-sm text-body">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                        {inc}
                      </div>
                    )
                  })}
                </div>

                <a href={course.enrollUrl} target="_blank" rel="noreferrer" className="btn-primary mt-6 w-full">
                  {c.enrolFree}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <p className="mt-3 text-center text-[11px] leading-relaxed text-faint">
                  {c.deliveredWith} {zomra?.name}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- What you'll learn ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <Reveal>
          <span className="eyebrow">{c.learnEyebrow}</span>
          <h2 className="mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">
            {c.learnTitle} <span className="brand-text">{c.learnAccent}</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {cc.objectives.map((o, i) => (
            <Reveal key={i} delay={i * 55}>
              <div className="card card-hover flex h-full gap-4 p-6">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-400/10 font-mono text-sm font-bold text-cyan-400">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-sm leading-relaxed text-body">{o}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Stack marquee ---------- */}
      <section className="border-y border-line bg-alt py-10">
        <div className="mx-auto max-w-content px-5 sm:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-faint">
            {c.toolsTitle}
          </p>
        </div>
        {/* Ticker rather than a static wall — pauses on hover, and falls back to
            a plain horizontal scroller under prefers-reduced-motion. */}
        <div className="marquee mt-6">
          <div className="marquee-track">
            {[0, 1].map((copyIndex) => (
              <ul
                key={copyIndex}
                className="marquee-group"
                aria-hidden={copyIndex === 1}
                aria-label={copyIndex === 0 ? c.toolsTitle : undefined}
              >
                {course.stack.map((tool) => (
                  <li key={tool} className="chip shrink-0 font-mono text-[11px]">{tool}</li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Description ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <Reveal>
            <div>
              <span className="eyebrow">{c.courseEyebrow}</span>
              <p className="mt-5 text-2xl font-bold leading-snug text-fg sm:text-3xl">
                {cc.description.hook}
              </p>
              {cc.description.body.map((p) => (
                <p key={p} className="mt-5 text-base leading-relaxed text-muted">{p}</p>
              ))}

              <p className="mt-8 text-sm font-semibold text-fg">{cc.description.learnIntro}</p>
              <ul className="mt-4 space-y-3">
                {cc.description.learn.map((l) => (
                  <li key={l} className="flex gap-3 text-sm leading-relaxed text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                    {l}
                  </li>
                ))}
              </ul>

              <p className="mt-8 rounded-2xl border border-teal/25 bg-teal/[0.06] p-5 text-sm leading-relaxed text-body">
                {cc.description.outro}
              </p>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="space-y-6">
              {/* Requirements */}
              <div className="card p-6">
                <h3 className="flex items-center gap-2 text-base font-semibold text-fg">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  {c.requirements}
                </h3>
                <ul className="mt-4 space-y-3">
                  {cc.requirements.map((r) => (
                    <li key={r} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Audience */}
              <div className="card p-6">
                <h3 className="flex items-center gap-2 text-base font-semibold text-fg">
                  <Target className="h-4 w-4 text-cyan-400" />
                  {c.whoIsFor}
                </h3>
                <ul className="mt-4 space-y-3">
                  {cc.audience.map((r) => (
                    <li key={r} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Course resources */}
              <div className="card p-6">
                <h3 className="text-base font-semibold text-fg">{c.resourcesTitle}</h3>
                <p className="mt-2 text-xs leading-relaxed text-faint">{c.resourcesLead}</p>
                <div className="mt-4 space-y-2">
                  {course.resources.map((raw) => {
                    const r = tCourseResource(lang, raw)
                    const Icon = resourceIcons[raw.icon as keyof typeof resourceIcons] ?? FileText
                    const pending = !raw.href
                    const inner = (
                      <>
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${pending ? 'text-ghost' : 'text-cyan-400'}`} />
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm ${pending ? 'text-faint' : 'text-body'}`}>
                            {r.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-faint">
                            {pending ? c.linkSoon : r.desc}
                          </span>
                        </span>
                        {!pending && (
                          <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-cyan-400" />
                        )}
                      </>
                    )
                    return pending ? (
                      <div key={raw.label}
                           className="flex items-start gap-3 rounded-xl border border-dashed border-line p-3">
                        {inner}
                      </div>
                    ) : (
                      <a key={raw.label} href={raw.href} target="_blank" rel="noreferrer"
                         className="group flex items-start gap-3 rounded-xl border border-line p-3 transition hover:border-cyan-400/40 hover:bg-surface-hover">
                        {inner}
                      </a>
                    )
                  })}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Course outline ---------- */}
      <section id="outline" className="scroll-mt-24 border-y border-line bg-alt">
        <div className="mx-auto max-w-content px-5 py-20 sm:px-8">
          <Reveal>
            <span className="eyebrow">{c.outlineEyebrow}</span>
            <h2 className="mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">
              {c.outlineTitle} <span className="brand-text">{c.outlineAccent}</span>
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{cc.format}</p>
          </Reveal>

          <ol className="mt-12 space-y-4">
            {course.outline.map((w, i) => {
              const o = ar ? courseAr.outline[w.week] : undefined
              const project = o?.project ?? ('project' in w ? w.project : undefined)
              const note = o?.note ?? ('note' in w ? w.note : undefined)
              return (
                <Reveal key={w.week} delay={i * 55}>
                  <li className="card relative overflow-hidden p-6 sm:p-7">
                    <div className="absolute inset-y-0 start-0 w-1 brand-gradient opacity-60" />
                    <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
                      <div>
                        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400">
                          {c.week} {w.week}
                        </p>
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-faint">
                          <CalendarDays className="h-3 w-3" />{w.dates}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold leading-snug text-fg">{o?.title ?? w.title}</h3>

                        {w.lessons.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {w.lessons.map((l) => (
                              <span key={l} className="chip !px-2.5 !py-1 text-[11px]">{l}</span>
                            ))}
                          </div>
                        )}

                        {project && (
                          <p className="mt-4 rounded-xl border-s-2 border-teal bg-surface-2 p-4 text-sm leading-relaxed text-body">
                            <span className="font-semibold text-fg">{c.moduleProject} — </span>
                            {project}
                          </p>
                        )}

                        {note && <p className="mt-4 text-sm leading-relaxed text-muted">{note}</p>}
                      </div>
                    </div>
                  </li>
                </Reveal>
              )
            })}
          </ol>
        </div>
      </section>

      {/* ---------- Recordings ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <Reveal>
          <span className="eyebrow">{c.recordingsEyebrow}</span>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            {c.recordingsTitle} <span className="brand-text">{c.recordingsAccent}</span>
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {course.recordings.map((r, i) => (
            <Reveal key={r.n} delay={i * 60}>
              <a href={r.href} target="_blank" rel="noreferrer"
                 className="card card-hover group flex h-full items-start gap-4 p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 font-mono text-sm font-bold text-cyan-400">
                  {String(r.n).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug text-fg">{r.module}</span>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-faint transition group-hover:text-cyan-400">
                    <PlayCircle className="h-3.5 w-3.5" /> {copy.sessionsPage.watchOnYoutube}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-ghost transition group-hover:text-cyan-400" />
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Study groups ---------- */}
      <section id="study-groups" className="scroll-mt-24 border-y border-line bg-alt">
        <div className="mx-auto max-w-content px-5 py-20 sm:px-8">
          <Reveal>
            <span className="eyebrow">{c.groupsEyebrow}</span>
            <h2 className="mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">
              {c.groupsTitle} <span className="brand-text">{c.groupsAccent}</span>
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{c.groupsLead}</p>
          </Reveal>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {studyGroups.map((raw, i) => {
              const g = tStudyGroup(lang, raw)
              const a = groupAccent[raw.accent]
              return (
                <Reveal key={raw.n} delay={i * 80}>
                  <div className={`card flex h-full flex-col p-6 ${a.border}`}>
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${a.dot}`} />
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-faint">
                        {copy.home.studyGroups.group} {raw.n}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-bold text-fg">{g.name}</h3>

                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                      {c.joinIfYouAre}
                    </p>
                    <ul className="mt-3 flex-1 space-y-2">
                      {g.joinIf.map((item) => (
                        <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                          <Check className={`mt-0.5 h-4 w-4 shrink-0 ${a.text}`} />
                          {item}
                        </li>
                      ))}
                    </ul>

                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                      {c.focus}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {raw.focus.map((f) => (
                        <span key={f} className="chip !px-2 !py-0.5 text-[10px]">{f}</span>
                      ))}
                    </div>

                    <a href={raw.href} target="_blank" rel="noreferrer" className="btn-primary mt-6 w-full">
                      {c.joinGroup} {raw.n}
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                </Reveal>
              )
            })}
          </div>

          {/* Quick-pick rule */}
          <Reveal delay={120}>
            <div className="mt-8 card p-6 sm:p-8">
              <h3 className="text-base font-semibold text-fg">{c.simpleRule}</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {groupRule.map((raw) => {
                  const r = tGroupRule(lang, raw)
                  return (
                    <div key={raw.you} className="rounded-xl border border-line bg-surface-2 p-4">
                      <p className="text-sm text-body">{r.you}</p>
                      <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-cyan-400">
                        <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />{r.group}
                      </p>
                    </div>
                  )
                })}
              </div>
              <p className="mt-5 flex items-start gap-2.5 text-sm leading-relaxed text-amber-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {ar ? groupRuleNoteAr : groupRuleNote}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Course FAQ ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow justify-center">{c.faqEyebrow}</span>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              {c.faqTitle} <span className="brand-text">{c.faqAccent}</span>
            </h2>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="mx-auto mt-10 max-w-3xl">
            <FaqAccordion items={courseFaqs} />
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-content px-5 pb-8 sm:px-8">
        <Reveal><JoinCTA lang={lang} /></Reveal>
      </section>
    </>
  )
}
