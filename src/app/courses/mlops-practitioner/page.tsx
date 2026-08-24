import type { Metadata } from 'next'
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
import { faqs, sessionMaterial } from '~/data/faq'
import { channels, partners } from '~/site.config'
import { asset } from '@/lib/asset'


export const metadata: Metadata = {
  title: 'The MLOps Practitioner',
  description: course.summary,
  openGraph: { title: `The MLOps Practitioner · MLOps MENA`, description: course.summary },
}

const includeIcons = [Radio, InfinityIcon, Users, Award]
const resourceIcons = { Github, Presentation, FileText, Youtube } as const

const groupAccent = {
  teal: { text: 'text-teal', border: 'border-teal/35', dot: 'bg-teal' },
  cyan: { text: 'text-cyan-400', border: 'border-cyan-400/35', dot: 'bg-cyan-400' },
  violet: { text: 'text-violet', border: 'border-violet/35', dot: 'bg-violet' },
  amber: { text: 'text-amber-400', border: 'border-amber-400/35', dot: 'bg-amber-400' },
} as const

export default function CoursePage() {
  const zomra = partners.find((p) => p.name === 'Zomra')
  const courseFaqs = faqs.filter((f) => f.scope === 'course')

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-teal/10 blur-[110px]" />
        <div className="pointer-events-none absolute -right-32 -top-20 h-[30rem] w-[30rem] rounded-full bg-amber/10 blur-[110px]" />
        <HexField className="pointer-events-none absolute right-6 top-20 hidden h-56 w-80 text-hex lg:block" />

        <div className="relative mx-auto max-w-content px-5 py-16 sm:px-8">
          <Link href="/courses"
                className="inline-flex items-center gap-2 text-sm text-faint transition hover:text-fg">
            <ArrowLeft className="h-4 w-4" /> All courses
          </Link>

          <div className="mt-8 grid gap-12 lg:grid-cols-[1.35fr_1fr]">
            <div>
              <span className="eyebrow">{course.status}</span>
              <h1 className="mt-4 text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
                The <span className="brand-text text-shadow-glow">MLOps Practitioner</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
                {course.summary}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-2">
                {course.facts.map((f) => (
                  <span key={f.label} className="chip">
                    <span className="font-semibold text-fg">{f.value}</span>
                    <span className="text-faint">{f.label.toLowerCase()}</span>
                  </span>
                ))}
                <span className="chip border-amber-400/30 text-amber-400">
                  <Star className="h-3 w-3 fill-amber-400" />
                  <span className="font-semibold">{course.rating.score}</span>
                  <span className="text-faint">({course.rating.count})</span>
                </span>
              </div>

              {/* Instructor */}
              <div className="mt-8 flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
                <Image src={asset("/logo-mark.png")} alt="" width={52} height={52}
                       className="h-13 w-13 shrink-0 rounded-full object-cover ring-1 ring-line" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">{course.instructor.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-faint">{course.instructor.role}</p>
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
                    Next session
                  </span>
                </div>

                <p className="mt-4 text-lg font-bold leading-snug text-fg">{course.nextLesson.title}</p>
                <p className="mt-1.5 text-sm text-faint">{course.nextLesson.dateLabel}</p>

                <div className="mt-5"><Countdown iso={course.nextLesson.startsAt} /></div>

                <div className="mt-6 space-y-2.5">
                  {course.includes.map((inc, i) => {
                    const Icon = includeIcons[i] ?? Check
                    return (
                      <div key={inc} className="flex items-start gap-2.5 text-sm text-body">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                        {inc}
                      </div>
                    )
                  })}
                </div>

                <a href={course.enrollUrl} target="_blank" rel="noreferrer"
                   className="btn-primary mt-6 w-full">
                  Enrol free on Zomra
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <p className="mt-3 text-center text-[11px] leading-relaxed text-faint">
                  Delivered with our educational partner {zomra?.name}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- What you'll learn ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <Reveal>
          <span className="eyebrow">What you&rsquo;ll learn</span>
          <h2 className="mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">
            Seven objectives, each one <span className="brand-text">a deployable skill</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {course.objectives.map((o, i) => (
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
            The tools you will actually use
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {course.stack.map((t) => (
              <span key={t} className="chip font-mono text-[11px]">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Description ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <Reveal>
            <div>
              <span className="eyebrow">The course</span>
              <p className="mt-5 text-2xl font-bold leading-snug text-fg sm:text-3xl">
                {course.description.hook}
              </p>
              {course.description.body.map((p) => (
                <p key={p} className="mt-5 text-base leading-relaxed text-muted">{p}</p>
              ))}

              <p className="mt-8 text-sm font-semibold text-fg">{course.description.learnIntro}</p>
              <ul className="mt-4 space-y-3">
                {course.description.learn.map((l) => (
                  <li key={l} className="flex gap-3 text-sm leading-relaxed text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                    {l}
                  </li>
                ))}
              </ul>

              <p className="mt-8 rounded-2xl border border-teal/25 bg-teal/[0.06] p-5 text-sm leading-relaxed text-body">
                {course.description.outro}
              </p>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="space-y-6">
              {/* Requirements */}
              <div className="card p-6">
                <h3 className="flex items-center gap-2 text-base font-semibold text-fg">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  Course requirements
                </h3>
                <ul className="mt-4 space-y-3">
                  {course.requirements.map((r) => (
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
                  Who is this course for
                </h3>
                <ul className="mt-4 space-y-3">
                  {course.audience.map((r) => (
                    <li key={r} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Course resources */}
              <div className="card p-6">
                <h3 className="text-base font-semibold text-fg">Course resources</h3>
                <p className="mt-2 text-xs leading-relaxed text-faint">
                  Free and open. Session 1 stays on YouTube permanently.
                </p>
                <div className="mt-4 space-y-2">
                  {course.resources.map((r) => {
                    const Icon = resourceIcons[r.icon as keyof typeof resourceIcons] ?? FileText
                    const pending = !r.href
                    const inner = (
                      <>
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${pending ? 'text-ghost' : 'text-cyan-400'}`} />
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm ${pending ? 'text-faint' : 'text-body'}`}>
                            {r.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-faint">
                            {pending ? 'Link coming soon' : r.desc}
                          </span>
                        </span>
                        {!pending && (
                          <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-cyan-400" />
                        )}
                      </>
                    )
                    return pending ? (
                      <div key={r.label}
                           className="flex items-start gap-3 rounded-xl border border-dashed border-line p-3">
                        {inner}
                      </div>
                    ) : (
                      <a key={r.label} href={r.href} target="_blank" rel="noreferrer"
                         className="group flex items-start gap-3 rounded-xl border border-line p-3 transition hover:border-cyan-400/40 hover:bg-surface">
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
            <span className="eyebrow">Course outline</span>
            <h2 className="mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">
              Seven weeks, <span className="brand-text">each ending in something you shipped</span>
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              {course.format}
            </p>
          </Reveal>

          <ol className="mt-12 space-y-4">
            {course.outline.map((w, i) => (
              <Reveal key={w.week} delay={i * 55}>
                <li className="card relative overflow-hidden p-6 sm:p-7">
                  <div className="absolute inset-y-0 left-0 w-1 brand-gradient opacity-60" />
                  <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
                    <div>
                      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400">
                        Week {w.week}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-faint">
                        <CalendarDays className="h-3 w-3" />{w.dates}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold leading-snug text-fg">{w.title}</h3>

                      {w.lessons.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {w.lessons.map((l) => (
                            <span key={l} className="chip !px-2.5 !py-1 text-[11px]">{l}</span>
                          ))}
                        </div>
                      )}

                      {'project' in w && w.project && (
                        <p className="mt-4 rounded-xl border-l-2 border-teal bg-surface p-4 text-sm leading-relaxed text-body">
                          <span className="font-semibold text-fg">Module project — </span>
                          {w.project}
                        </p>
                      )}

                      {'note' in w && w.note && (
                        <p className="mt-4 text-sm leading-relaxed text-muted">{w.note}</p>
                      )}
                    </div>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Recordings ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <Reveal>
          <span className="eyebrow">Live session recordings</span>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            All five lessons <span className="brand-text">on YouTube</span>
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
                    <PlayCircle className="h-3.5 w-3.5" /> Watch on YouTube
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
            <span className="eyebrow">Study groups</span>
            <h2 className="mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">
              Four rooms. <span className="brand-text">Pick by experience, not job title.</span>
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              Every student joins a WhatsApp study group matched to their current level, so the
              questions and the pace fit where you actually are.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {studyGroups.map((g, i) => {
              const a = groupAccent[g.accent]
              return (
                <Reveal key={g.n} delay={i * 80}>
                  <div className={`card flex h-full flex-col p-6 ${a.border}`}>
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${a.dot}`} />
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-faint">
                        Group {g.n}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-bold text-fg">{g.name}</h3>

                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                      Join if you are
                    </p>
                    <ul className="mt-3 flex-1 space-y-2">
                      {g.joinIf.map((c) => (
                        <li key={c} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                          <Check className={`mt-0.5 h-4 w-4 shrink-0 ${a.text}`} />
                          {c}
                        </li>
                      ))}
                    </ul>

                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                      Focus
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {g.focus.map((f) => (
                        <span key={f} className="chip !px-2 !py-0.5 text-[10px]">{f}</span>
                      ))}
                    </div>

                    <a href={g.href} target="_blank" rel="noreferrer" className="btn-primary mt-6 w-full">
                      Join Group {g.n}
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
              <h3 className="text-base font-semibold text-fg">The simple rule</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {groupRule.map((r) => (
                  <div key={r.you} className="rounded-xl border border-line bg-surface p-4">
                    <p className="text-sm text-body">{r.you}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-cyan-400">
                      <ArrowRight className="h-3.5 w-3.5" />{r.group}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-5 flex items-start gap-2.5 text-sm leading-relaxed text-amber-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {groupRuleNote}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Course FAQ ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow justify-center">Course FAQ</span>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              The questions <span className="brand-text">we get every week</span>
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
        <Reveal><JoinCTA /></Reveal>
      </section>
    </>
  )
}
