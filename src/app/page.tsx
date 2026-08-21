import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight, ArrowUpRight, Radio, Map, GraduationCap, FlaskConical, Briefcase, Users,
  Star, Github, Layers, CalendarDays, PlayCircle, Linkedin, Mail, Sparkles, Ticket,
} from 'lucide-react'
import Hero from '@/components/Hero'
import Reveal from '@/components/Reveal'
import SectionHeading from '@/components/SectionHeading'
import FaqAccordion from '@/components/FaqAccordion'
import JoinCTA from '@/components/JoinCTA'
import HexField from '@/components/HexField'
import MemberCard from '@/components/MemberCard'
import { asset } from '@/lib/asset'
import { getRoadmaps, accentClasses } from '@/lib/roadmaps'
import { course } from '~/data/mlops-practitioner'
import { upcomingCourse } from '~/data/offerings'
import { studyGroups } from '~/data/study-groups'
import { externalArticles } from '~/data/articles'
import { upcomingSessions, pastSessions } from '~/data/sessions'
import { faqs } from '~/data/faq'
import { repos, pillars } from '~/data/community'
import { founder, directors, leads, teamCount } from '~/data/team'
import { partners, channels, contacts, brainsmingle } from '~/site.config'

const icons = { Radio, Map, GraduationCap, FlaskConical, Briefcase, Users } as const

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function HomePage() {
  const roadmaps = getRoadmaps()
  const articles = [...externalArticles].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3)
  const totalResources = roadmaps.reduce((n, r) => n + r.resourceCount, 0)
  const sessions = [...upcomingSessions, ...pastSessions].slice(0, 3)

  return (
    <>
      <Hero />

      {/* ---------- What we do ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <Reveal>
          <SectionHeading eyebrow="What we do" title="A whole path," accent="not a single course">
            Everything the community runs is free and open. Pick the piece you need today.
          </SectionHeading>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p, i) => {
            const Icon = icons[p.icon as keyof typeof icons]
            return (
              <Reveal key={p.title} delay={i * 70}>
                <div className="card card-hover h-full p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/10 text-cyan-400">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-white">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.desc}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ---------- Roadmaps ---------- */}
      <section className="border-y border-white/10 bg-ink-950/40">
        <div className="mx-auto max-w-content px-5 py-20 sm:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow="Learning roadmaps" title="Three paths to" accent="production ML">
                Built entirely on free and open-source resources —{' '}
                <span className="text-white">{totalResources} curated links</span> across the three paths.
              </SectionHeading>
              <Link href="/roadmaps" className="btn-ghost shrink-0">
                All roadmaps <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {roadmaps.map((r, i) => {
              const a = accentClasses[r.accent]
              return (
                <Reveal key={r.slug} delay={i * 90}>
                  <Link href={`/roadmaps/${r.slug}`}
                        className={`card card-hover group relative flex h-full flex-col overflow-hidden p-6 ${a.border}`}>
                    <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${a.grad} to-transparent`} />
                    <span className={`chip ${a.text} ${a.border}`}>{r.level}</span>
                    <h3 className="mt-4 text-xl font-bold leading-snug text-white">{r.title}</h3>
                    <p className={`mt-1.5 text-sm font-medium ${a.text}`}>{r.tagline}</p>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">{r.audience}</p>

                    <div className="mt-6 flex items-center gap-1.5">
                      {r.phases.map((p, idx) => (
                        <div key={p.label} className="flex flex-1 items-center gap-1.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${a.dot}`} />
                          {idx < r.phases.length - 1 && <span className="h-px flex-1 bg-white/15" />}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                      {r.phases.length} {r.slug === 'senior-mlops-engineer' ? 'specializations' : 'phases'}
                      {' · '}{r.duration}
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                      <span className="text-xs text-slate-500">{r.resourceCount} free resources</span>
                      <ArrowRight className={`h-4 w-4 ${a.text} transition group-hover:translate-x-1`} />
                    </div>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------- Courses ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow="Courses" title="Cohort-based and" accent="free to join" />
            <Link href="/courses" className="btn-ghost shrink-0">
              All courses <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Reveal>
            <Link href="/courses/mlops-practitioner"
                  className="card card-hover group relative flex h-full flex-col overflow-hidden p-7 sm:p-8">
              <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-teal/10 blur-3xl" />
              <HexField className="absolute -right-4 bottom-0 hidden h-36 w-52 text-white/[0.05] sm:block" />
              <div className="relative flex flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-500">01</span>
                  <span className="chip border-teal/35 text-teal">{course.status}</span>
                </div>
                <h3 className="mt-4 text-2xl font-bold sm:text-3xl">{course.title}</h3>
                <p className="mt-1.5 text-sm font-medium text-cyan-400">{course.format}</p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-400">{course.summary}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {course.stack.slice(0, 8).map((t) => (
                    <span key={t} className="chip font-mono text-[11px]">{t}</span>
                  ))}
                  <span className="chip font-mono text-[11px] text-cyan-400">
                    +{course.stack.length - 8}
                  </span>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-white">{course.rating.score}</span>
                    · 1,200+ students
                  </span>
                  <ArrowRight className="h-4 w-4 text-cyan-400 transition group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </Reveal>

          <Reveal delay={90}>
            <div className="card flex h-full flex-col border-dashed p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-slate-500">{upcomingCourse.number}</span>
                <span className="chip border-violet/35 text-violet">
                  <Sparkles className="h-3 w-3" /> {upcomingCourse.status}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-bold">{upcomingCourse.title}</h3>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-400">{upcomingCourse.summary}</p>
              <a href={channels.whatsapp} target="_blank" rel="noreferrer" className="btn-ghost mt-6 w-full">
                Get notified <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Sessions ---------- */}
      <section className="border-y border-white/10 bg-ink-950/40">
        <div className="mx-auto max-w-content px-5 py-20 sm:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow="Sessions" title="Free live sessions," accent="recorded for everyone">
                Register on Zomra, attend live, and catch the recording afterwards.
              </SectionHeading>
              <Link href="/sessions" className="btn-ghost shrink-0">
                All sessions <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {sessions.map((s, i) => {
              const upcoming = Boolean(s.registerUrl)
              return (
                <Reveal key={s.slug} delay={i * 90}>
                  <article className="card card-hover group flex h-full flex-col overflow-hidden">
                    <div className="relative h-48 w-full overflow-hidden bg-ink-850">
                      <Image
                        src={asset(`/sessions/${s.slug}.jpg`)}
                        alt={s.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 36rem"
                        className="object-cover object-top transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-900 to-transparent" />
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <span className={`chip w-fit ${upcoming ? 'border-amber-400/30 text-amber-400' : ''}`}>
                        {upcoming ? 'Registration open' : 'Recording available'}
                      </span>
                      <h3 className="mt-3 text-lg font-bold leading-snug text-white">{s.title}</h3>
                      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-400">{s.subtitle}</p>

                      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                        <CalendarDays className="h-3.5 w-3.5" />{s.dateLabel}
                      </p>
                      <p className="mt-1.5 text-xs text-slate-500">
                        <span className="text-slate-400">{s.speaker}</span> · {s.speakerRole}
                      </p>

                      <div className="mt-5 border-t border-white/10 pt-4">
                        {upcoming ? (
                          <a href={s.registerUrl} target="_blank" rel="noreferrer"
                             className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:underline">
                            <Ticket className="h-4 w-4" /> Register free
                          </a>
                        ) : (
                          <a href={s.recordingUrl} target="_blank" rel="noreferrer"
                             className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:underline">
                            <PlayCircle className="h-4 w-4" /> Watch recording
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------- Study groups ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <Reveal>
          <SectionHeading eyebrow="Study groups" title="Four rooms," accent="pick by experience">
            Study alongside people at your level. Choose based on your actual hands-on
            experience, not your job title.
          </SectionHeading>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {studyGroups.map((g, i) => (
            <Reveal key={g.n} delay={i * 70}>
              <a href={g.href} target="_blank" rel="noreferrer"
                 className="card card-hover group flex h-full flex-col p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-slate-500">Group {g.n}</span>
                  <ArrowUpRight className="h-4 w-4 text-slate-600 transition group-hover:text-cyan-400" />
                </div>
                <h3 className="mt-3 text-base font-semibold leading-snug text-white">{g.name}</h3>
                <div className="mt-4 flex flex-1 flex-wrap gap-1.5 self-start">
                  {g.focus.slice(0, 4).map((f) => (
                    <span key={f} className="chip !px-2 !py-0.5 text-[10px]">{f}</span>
                  ))}
                </div>
                <span className="mt-4 text-xs font-medium text-cyan-400">Join on WhatsApp</span>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Repos ---------- */}
      <section className="border-y border-white/10 bg-ink-950/40">
        <div className="mx-auto max-w-content px-5 py-20 sm:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow="Open source" title="Repositories worth" accent="your time">
                The tools and courses we point people at, plus our own course repo.
              </SectionHeading>
              <a href={channels.github} target="_blank" rel="noreferrer" className="btn-ghost shrink-0">
                <Github className="h-4 w-4" /> Our GitHub
              </a>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Reveal>
              <a href={course.repoUrl} target="_blank" rel="noreferrer"
                 className="card card-hover group flex h-full flex-col border-cyan-400/30 bg-cyan-400/[0.05] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold text-white">mlops_practitioner_course</p>
                    <p className="truncate text-xs text-slate-500">MLOpsMENACommunity</p>
                  </div>
                  <span className="chip !px-2 !py-0.5 shrink-0 text-[10px] text-cyan-400">Ours</span>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
                  All the code, notebooks, and module projects from The MLOps Practitioner.
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Layers className="h-3 w-3" />Python
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-slate-600 transition group-hover:text-cyan-400" />
                </div>
              </a>
            </Reveal>

            {repos.slice(0, 5).map((r, i) => (
              <Reveal key={r.name} delay={(i + 1) * 60}>
                <a href={r.href} target="_blank" rel="noreferrer"
                   className="card card-hover group flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold text-white">{r.name}</p>
                      <p className="truncate text-xs text-slate-500">{r.owner}</p>
                    </div>
                    <span className="chip !px-2 !py-0.5 shrink-0 text-[10px]">
                      <Star className="h-3 w-3 text-amber-400" />{r.stars}
                    </span>
                  </div>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">{r.desc}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Layers className="h-3 w-3" />{r.lang}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-slate-600 transition group-hover:text-cyan-400" />
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Articles ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow="Articles" title="Published on" accent="LinkedIn and Medium" />
            <Link href="/articles" className="btn-ghost shrink-0">
              All articles <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {articles.map((a, i) => (
            <Reveal key={a.href} delay={i * 80}>
              <article className="card card-hover flex h-full flex-col p-6">
                <span className="chip w-fit border-cyan-400/30 text-cyan-400">
                  <Linkedin className="h-3 w-3" /> {a.platform}
                </span>
                <h3 className="mt-4 text-lg font-semibold leading-snug text-white">{a.title}</h3>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-slate-400">{a.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                  <a href={a.href} target="_blank" rel="noreferrer"
                     className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 hover:underline">
                    Read <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                  <span className="text-xs text-slate-500">{fmt(a.date)}</span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Brainsmingle ---------- */}
      <section className="mx-auto max-w-content px-5 pb-20 sm:px-8">
        <Reveal>
          <div className="card relative overflow-hidden p-7 sm:p-10">
            <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-teal/15 blur-3xl animate-pulse-glow" />
            <div className="absolute -bottom-24 -right-12 h-72 w-72 rounded-full bg-amber/15 blur-3xl animate-pulse-glow" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.5fr_1fr]">
              <div>
                <span className="chip border-amber-400/30 text-amber-400">
                  <Sparkles className="h-3 w-3" /> Limited time
                </span>
                <h2 className="mt-5 text-3xl font-bold sm:text-4xl">
                  We are also on <span className="brand-text">Brainsmingle</span>
                </h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
                  Another place to find us — our space on Brainsmingle. For a limited time you
                  can join free this week with the code below.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {brainsmingle.note}
                </p>
                <p className="mt-3 select-all font-mono text-2xl font-bold tracking-[0.12em] text-amber-400">
                  {brainsmingle.code}
                </p>
                <a href={brainsmingle.href} target="_blank" rel="noreferrer" className="btn-primary mt-5 w-full">
                  Join the space <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- Team ---------- */}
      <section className="border-y border-white/10 bg-ink-950/40">
        <div className="mx-auto max-w-content px-5 py-20 sm:px-8">
          <Reveal>
            <SectionHeading eyebrow="The team" title="Who runs" accent="this community">
              Practitioners who build and operate ML systems for a living, teaching what they
              actually do at work.
            </SectionHeading>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Reveal>
              <MemberCard member={founder} badge="Founder" featured />
            </Reveal>
            {directors.map((d, i) => (
              <Reveal key={d.name} delay={(i + 1) * 80}>
                <MemberCard member={d} badge="Community Director" />
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="mt-4 card flex flex-col items-center justify-between gap-5 p-6 sm:flex-row sm:p-7">
              <div>
                <p className="text-sm font-semibold text-white">
                  Plus {leads.length} leads across six owned axes
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  {leads.map((l) => l.role.replace(/^AI /, '')).join(' · ')}
                </p>
              </div>
              <Link href="/team" className="btn-ghost shrink-0">
                Meet the team ({teamCount}) <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Partners ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <Reveal>
          <SectionHeading eyebrow="Partners" title="Built with" accent="people who ship" align="center" />
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          {partners.map((p, i) => (
            <Reveal key={p.name} delay={i * 90}>
              <a href={p.href} target="_blank" rel="noreferrer"
                 className="card card-hover flex h-full flex-col items-center justify-center p-8 text-center">
                {p.logo ? (
                  // DevisionX: logo only, no label — per your instruction.
                  <span className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-6">
                    <Image src={asset(p.logo)} alt={p.name} width={260} height={104}
                           className="h-16 w-auto object-contain" />
                  </span>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-white">{p.name}</p>
                    {p.role && (
                      <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-teal">
                        {p.role}
                      </p>
                    )}
                    {p.blurb && (
                      <p className="mt-4 text-sm leading-relaxed text-slate-400">{p.blurb}</p>
                    )}
                  </>
                )}
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="border-t border-white/10 bg-ink-950/40">
        <div className="mx-auto max-w-content px-5 py-20 sm:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow="FAQ" title="Questions we get" accent="every week" />
              <Link href="/faq" className="btn-ghost shrink-0">
                All answers <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-10">
              <FaqAccordion items={faqs.filter((f) => f.scope === 'general').slice(0, 4)} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section id="contact" className="mx-auto max-w-content scroll-mt-24 px-5 py-20 sm:px-8">
        <Reveal>
          <SectionHeading eyebrow="Contact us" title="Talk to" accent="the community" align="center">
            Questions, partnerships, sponsorship, or hiring — here is how to reach us.
          </SectionHeading>
        </Reveal>

        <Reveal delay={60}>
          <div className="mt-10 flex justify-center">
            <a
              href={`mailto:${contacts.email}`}
              className="btn-primary group !rounded-2xl !px-10 !py-5 text-base sm:!px-14 sm:!py-6 sm:text-lg"
            >
              <Mail className="h-5 w-5 sm:h-6 sm:w-6" />
              Contact us
              <ArrowUpRight className="h-5 w-5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
          <Reveal>
            <div className="card h-full p-6">
              <h3 className="text-base font-semibold text-white">Community &amp; general</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Courses, sessions, roadmaps, and study groups.
              </p>
              <a href={`mailto:${contacts.email}`}
                 className="group mt-5 flex items-center gap-3 rounded-xl border border-white/10 p-3 transition hover:border-cyan-400/40 hover:bg-white/[0.03]">
                <Mail className="h-4 w-4 shrink-0 text-cyan-400" />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{contacts.email}</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-cyan-400" />
              </a>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="card h-full border-amber-400/25 p-6">
              <h3 className="text-base font-semibold text-white">Partnerships &amp; collaboration</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Talk to the founder about future partnership and collaboration.
              </p>
              <p className="mt-4 text-sm font-semibold text-white">{contacts.founder.name}</p>
              <p className="text-xs text-slate-500">{contacts.founder.role}</p>
              <div className="mt-4 space-y-2">
                <a href={`mailto:${contacts.founder.email}`}
                   className="group flex items-center gap-3 rounded-xl border border-white/10 p-3 transition hover:border-amber-400/40 hover:bg-white/[0.03]">
                  <Mail className="h-4 w-4 shrink-0 text-amber-400" />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{contacts.founder.email}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-amber-400" />
                </a>
                <a href={contacts.founder.linkedin} target="_blank" rel="noreferrer"
                   className="group flex items-center gap-3 rounded-xl border border-white/10 p-3 transition hover:border-amber-400/40 hover:bg-white/[0.03]">
                  <Linkedin className="h-4 w-4 shrink-0 text-amber-400" />
                  <span className="flex-1 text-sm text-slate-300">linkedin.com/in/ayanasser</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-amber-400" />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 pb-8 sm:px-8">
        <Reveal><JoinCTA /></Reveal>
      </section>
    </>
  )
}
