import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight, ArrowUpRight, Radio, Map, GraduationCap, FlaskConical, Briefcase, Users,
  Star, Github, Layers, CalendarDays, PlayCircle, Linkedin, Mail, Sparkles,
} from 'lucide-react'
import Hero from '@/components/Hero'
import ThisWeek from '@/components/ThisWeek'
import StatsSection from '@/components/StatsSection'
import Reveal from '@/components/Reveal'
import SectionHeading from '@/components/SectionHeading'
import FaqAccordion from '@/components/FaqAccordion'
import JoinCTA from '@/components/JoinCTA'
import HexField from '@/components/HexField'
import MemberCard from '@/components/MemberCard'
import UntranslatedChip from '@/components/UntranslatedChip'
import { asset } from '@/lib/asset'
import { getRoadmaps, accentClasses } from '@/lib/roadmaps'
import { t, localeHref, type Lang } from '@/lib/i18n'
import { buildNow, formatSessionDate, partitionSessions, recordingUrl } from '@/lib/sessions'
import { sessionPoster } from '@/lib/sessions.server'
import {
  tPillar, tRoadmap, tSession, tStudyGroup, tFaq, tMember, tArticle, tRepo, tPartner,
  courseAr, upcomingCourseAr,
} from '@/lib/content-i18n'
import { course } from '~/data/mlops-practitioner'
import { upcomingCourse } from '~/data/offerings'
import { studyGroups } from '~/data/study-groups'
import { externalArticles } from '~/data/articles'
import { sessions } from '~/data/sessions'
import { faqs } from '~/data/faq'
import { pillars } from '~/data/community'
import { getRepos } from '@/lib/repos'
import { founder, directors, leads, teamCount } from '~/data/team'
import { partners, channels, contacts, brainsmingle } from '~/site.config'

const icons = { Radio, Map, GraduationCap, FlaskConical, Briefcase, Users } as const

/**
 * Without an explicit timeZone this inherits the machine's — UTC on the CI
 * runner, Cairo on a laptop — so an article published at 01:00 Cairo renders a
 * day early in production. `-u-nu-latn` pins Latin digits so Arabic dates match
 * the Latin figures used everywhere else on the page.
 */
function fmt(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Cairo',
  })
}

export default function HomeView({ lang }: { lang: Lang }) {
  const copy = t(lang)
  const h = copy.home
  const href = (p: string) => localeHref(lang, p)

  const roadmaps = getRoadmaps().map((r) => tRoadmap(lang, r))
  const articles = [...externalArticles]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3)
  const totalResources = roadmaps.reduce((n, r) => n + r.resourceCount, 0)
  // Only sessions that actually have something to watch — the card's whole
  // purpose is the recording link, and an <a> with no href is not a link.
  const recent = partitionSessions(sessions, buildNow())
    .past.filter((s) => recordingUrl(s))
    .slice(0, 2)
    .map((s) => tSession(lang, s))
  const courseCopy = lang === 'ar' ? courseAr : course
  const upcomingCourseCopy = lang === 'ar' ? upcomingCourseAr : upcomingCourse

  return (
    <>
      <Hero lang={lang} />

      {/* ---------- This week ---------- */}
      <ThisWeek lang={lang} />

      {/* ---------- Our community in numbers ---------- */}
      <StatsSection lang={lang} />

      {/* ---------- What we do ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <Reveal>
          <div className="max-w-3xl">
            <span className="eyebrow">{h.whatWeDo.eyebrow}</span>
            <h2 className="mt-5 text-xl font-semibold leading-relaxed text-fg sm:text-2xl sm:leading-relaxed">
              {h.whatWeDo.goal}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">{h.whatWeDo.goal2}</p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 [&>*]:min-w-0 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((raw, i) => {
            const p = tPillar(lang, raw)
            const Icon = icons[raw.icon as keyof typeof icons]
            return (
              <Reveal key={raw.title} delay={i * 70} variant="scale">
                <div className="card card-hover group h-full p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/10 text-cyan-400 transition duration-300 group-hover:scale-110 group-hover:bg-cyan-400/15">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-fg">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{p.desc}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ---------- Roadmaps ---------- */}
      <section className="border-y border-line bg-alt">
        <div className="mx-auto max-w-content px-5 py-20 sm:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow={h.roadmaps.eyebrow} title={h.roadmaps.title} accent={h.roadmaps.accent}>
                {h.roadmaps.leadBefore}
                <span className="text-fg">{totalResources} {h.roadmaps.leadLinks}</span>
                {h.roadmaps.leadAfter}
              </SectionHeading>
              <Link href={href('/roadmaps')} className="btn-ghost shrink-0">
                {copy.common.allRoadmaps} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {roadmaps.map((r, i) => {
              const a = accentClasses[r.accent]
              return (
                <Reveal key={r.slug} delay={i * 90}>
                  <Link href={href(`/roadmaps/${r.slug}`)}
                        className={`card card-hover group relative flex h-full flex-col overflow-hidden p-6 ${a.border}`}>
                    <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${a.grad} to-transparent`} />
                    <span className={`chip ${a.text} ${a.border}`}>{r.level}</span>
                    <h3 className="mt-4 text-xl font-bold leading-snug text-fg">{r.title}</h3>
                    <p className={`mt-1.5 text-sm font-medium ${a.text}`}>{r.tagline}</p>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{r.audience}</p>

                    <div className="mt-6 flex items-center gap-1.5">
                      {r.phases.map((p, idx) => (
                        <div key={p.label} className="flex flex-1 items-center gap-1.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${a.dot}`} />
                          {idx < r.phases.length - 1 && <span className="h-px flex-1 bg-line-strong" />}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
                      {r.phases.length}{' '}
                      {r.slug === 'senior-mlops-engineer' ? copy.common.specializations : copy.common.phases}
                      {' · '}{r.duration}
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                      <span className="text-xs text-faint">
                        {r.resourceCount} {copy.common.freeResources}
                      </span>
                      <ArrowRight className={`h-4 w-4 ${a.text} transition group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1`} />
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
            <SectionHeading eyebrow={h.courses.eyebrow} title={h.courses.title} accent={h.courses.accent} />
            <Link href={href('/courses')} className="btn-ghost shrink-0">
              {copy.common.allCourses} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Reveal>
            <Link href={href('/courses/mlops-practitioner')}
                  className="card card-hover group relative flex h-full flex-col overflow-hidden p-7 sm:p-8">
              <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-teal/10 blur-3xl" />
              <HexField className="absolute -right-4 bottom-0 hidden h-36 w-52 text-hex sm:block" />
              <div className="relative flex flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-faint">01</span>
                  <span className="chip border-teal/35 text-teal">{courseCopy.status}</span>
                </div>
                <h3 className="mt-4 text-2xl font-bold sm:text-3xl">{course.title}</h3>
                <p className="mt-1.5 text-sm font-medium text-cyan-400">{courseCopy.format}</p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{courseCopy.summary}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {course.stack.slice(0, 8).map((tool) => (
                    <span key={tool} className="chip font-mono text-[11px]">{tool}</span>
                  ))}
                  <span className="chip font-mono text-[11px] text-cyan-400">
                    +{course.stack.length - 8}
                  </span>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                  <span className="flex items-center gap-2 text-sm text-muted">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-fg">{course.rating.score}</span>
                    · {h.courses.studentsNote}
                  </span>
                  <ArrowRight className="h-4 w-4 text-cyan-400 transition group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                </div>
              </div>
            </Link>
          </Reveal>

          <Reveal delay={90}>
            <div className="card flex h-full flex-col border-dashed p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-faint">{upcomingCourse.number}</span>
                <span className="chip border-violet/35 text-violet">
                  <Sparkles className="h-3 w-3" /> {upcomingCourseCopy.status}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-bold">{upcomingCourse.title}</h3>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{upcomingCourseCopy.summary}</p>
              <a href={channels.whatsapp} target="_blank" rel="noreferrer" className="btn-ghost mt-6 w-full">
                {copy.common.getNotified} <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Recent sessions (recordings) ---------- */}
      {recent.length > 0 && (
        <section className="border-y border-line bg-alt">
          <div className="mx-auto max-w-content px-5 py-20 sm:px-8">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <SectionHeading eyebrow={h.sessions.eyebrow} title={h.sessions.title} accent={h.sessions.accent}>
                  {h.sessions.lead}
                </SectionHeading>
                <Link href={href('/sessions')} className="btn-ghost shrink-0">
                  {copy.common.allSessions} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                </Link>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {recent.map((s, i) => (
                <Reveal key={s.slug} delay={i * 90}>
                  <article className="card card-hover group flex h-full flex-col overflow-hidden">
                    <div className="relative h-48 w-full overflow-hidden bg-surface-2">
                      <Image
                        src={sessionPoster(s)}
                        alt={s.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 36rem"
                        className="object-cover object-top transition duration-500 group-hover:scale-105"
                      />
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="chip w-fit">{copy.common.recordingAvailable}</span>
                        <UntranslatedChip lang={lang} kind="session" itemKey={s.slug} />
                      </span>
                      <h3 className="mt-3 text-lg font-bold leading-snug text-fg">{s.title}</h3>
                      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{s.subtitle}</p>

                      <p className="mt-4 flex items-center gap-2 text-xs text-faint">
                        <CalendarDays className="h-3.5 w-3.5" />{formatSessionDate(s, lang)}
                      </p>
                      <p className="mt-1.5 text-xs text-faint">
                        <span className="text-muted">{s.speaker}</span> · {s.speakerRole}
                      </p>

                      <div className="mt-5 border-t border-line pt-4">
                        <a href={recordingUrl(s)} target="_blank" rel="noreferrer"
                           className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:underline">
                          <PlayCircle className="h-4 w-4" /> {copy.common.watchRecording}
                        </a>
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Study groups ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <Reveal>
          <SectionHeading eyebrow={h.studyGroups.eyebrow} title={h.studyGroups.title} accent={h.studyGroups.accent}>
            {h.studyGroups.lead}
          </SectionHeading>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {studyGroups.map((raw, i) => {
            const g = tStudyGroup(lang, raw)
            return (
              <Reveal key={raw.n} delay={i * 70} variant="scale">
                <a href={raw.href} target="_blank" rel="noreferrer"
                   className="card card-hover group flex h-full flex-col p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-faint">
                      {h.studyGroups.group} {raw.n}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-ghost transition group-hover:text-cyan-400" />
                  </div>
                  <h3 className="mt-3 text-base font-semibold leading-snug text-fg">{g.name}</h3>
                  <div className="mt-4 flex flex-1 flex-wrap gap-1.5 self-start">
                    {raw.focus.slice(0, 4).map((f) => (
                      <span key={f} className="chip !px-2 !py-0.5 text-[10px]">{f}</span>
                    ))}
                  </div>
                  <span className="mt-4 text-xs font-medium text-cyan-400">
                    {h.studyGroups.joinOnWhatsapp}
                  </span>
                </a>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ---------- Repos ---------- */}
      <section className="border-y border-line bg-alt">
        <div className="mx-auto max-w-content px-5 py-20 sm:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow={h.repos.eyebrow} title={h.repos.title} accent={h.repos.accent}>
                {h.repos.lead}
              </SectionHeading>
              <a href={channels.github} target="_blank" rel="noreferrer" className="btn-ghost shrink-0">
                <Github className="h-4 w-4" /> {h.repos.ourGithub}
              </a>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-4 [&>*]:min-w-0 sm:grid-cols-2 lg:grid-cols-3">
            <Reveal>
              <a href={course.repoUrl} target="_blank" rel="noreferrer"
                 className="card card-hover group flex h-full flex-col border-cyan-400/30 bg-cyan-400/[0.05] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold text-fg">mlops_practitioner_course</p>
                    <p className="truncate text-xs text-faint">MLOpsMENACommunity</p>
                  </div>
                  <span className="chip !px-2 !py-0.5 shrink-0 text-[10px] text-cyan-400">{h.repos.ours}</span>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{h.repos.ourRepoDesc}</p>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <span className="flex items-center gap-1.5 text-xs text-faint">
                    <Layers className="h-3 w-3" />Python
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-ghost transition group-hover:text-cyan-400" />
                </div>
              </a>
            </Reveal>

            {getRepos().slice(0, 5).map((raw, i) => {
              const r = tRepo(lang, raw)
              return (
                <Reveal key={raw.name} delay={(i + 1) * 60}>
                  <a href={raw.href} target="_blank" rel="noreferrer"
                     className="card card-hover group flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold text-fg">{raw.name}</p>
                        <p className="truncate text-xs text-faint">{raw.owner}</p>
                      </div>
                      <span className="chip !px-2 !py-0.5 shrink-0 text-[10px]">
                        <Star className="h-3 w-3 text-amber-400" />{raw.stars}
                      </span>
                    </div>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{r.desc}</p>
                    <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                      <span className="flex items-center gap-1.5 text-xs text-faint">
                        <Layers className="h-3 w-3" />{raw.lang}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-ghost transition group-hover:text-cyan-400" />
                    </div>
                  </a>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------- Articles ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow={h.articles.eyebrow} title={h.articles.title} accent={h.articles.accent} />
            <Link href={href('/articles')} className="btn-ghost shrink-0">
              {copy.common.allArticles} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {articles.map((raw, i) => {
            const a = tArticle(lang, raw)
            return (
              <Reveal key={raw.href} delay={i * 80}>
                <article className="card card-hover flex h-full flex-col p-6">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="chip w-fit border-cyan-400/30 text-cyan-400">
                      <Linkedin className="h-3 w-3" /> {raw.platform}
                    </span>
                    <UntranslatedChip lang={lang} kind="article" itemKey={raw.id} />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold leading-snug text-fg">{a.title}</h3>
                  <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted">{a.description}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                    <a href={raw.href} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 hover:underline">
                      {copy.common.read} <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                    <span className="text-xs text-faint">{fmt(raw.date, lang)}</span>
                  </div>
                </article>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ---------- Brainsmingle ---------- */}
      <section className="mx-auto max-w-content px-5 pb-20 sm:px-8">
        <Reveal variant="scale">
          <div className="card relative overflow-hidden p-7 sm:p-10">
            <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-teal/15 blur-3xl animate-pulse-glow" />
            <div className="absolute -bottom-24 -right-12 h-72 w-72 rounded-full bg-amber/15 blur-3xl animate-pulse-glow" />
            <div className="relative grid items-center gap-8 [&>*]:min-w-0 lg:grid-cols-[1.5fr_1fr]">
              <div>
                <span className="chip border-amber-400/30 text-amber-400">
                  <Sparkles className="h-3 w-3" /> {h.brainsmingle.chip}
                </span>
                <h2 className="mt-5 text-3xl font-bold sm:text-4xl">
                  {h.brainsmingle.titleBefore} <span className="brand-text">{h.brainsmingle.accent}</span>
                </h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{h.brainsmingle.lead}</p>
              </div>

              <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-5 text-center sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {lang === 'ar' ? 'انضم مجانًا هذا الأسبوع بالكود' : brainsmingle.note}
                </p>
                <p className="mt-3 select-all break-all font-mono text-xl font-bold tracking-[0.12em] text-amber-400 sm:text-2xl">
                  {brainsmingle.code}
                </p>
                <a href={brainsmingle.href} target="_blank" rel="noreferrer" className="btn-primary mt-5 w-full">
                  {h.brainsmingle.joinSpace} <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- Team ---------- */}
      <section className="border-y border-line bg-alt">
        <div className="mx-auto max-w-content px-5 py-20 sm:px-8">
          <Reveal>
            <SectionHeading eyebrow={h.team.eyebrow} title={h.team.title} accent={h.team.accent}>
              {h.team.lead}
            </SectionHeading>
          </Reveal>

          <div className="mt-12 grid gap-4 [&>*]:min-w-0 sm:grid-cols-2 lg:grid-cols-3">
            <Reveal>
              <MemberCard member={tMember(lang, founder)} badge={h.team.founder} featured lang={lang} />
            </Reveal>
            {directors.map((d, i) => (
              <Reveal key={d.name} delay={(i + 1) * 80}>
                <MemberCard member={tMember(lang, d)} badge={h.team.director} lang={lang} />
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="mt-4 card flex flex-col items-center justify-between gap-5 p-6 sm:flex-row sm:p-7">
              <div>
                <p className="text-sm font-semibold text-fg">{h.team.plusLeads(leads.length)}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {leads.map((l) => tMember(lang, l).role.replace(/^AI /, '')).join(' · ')}
                </p>
              </div>
              <Link href={href('/team')} className="btn-ghost shrink-0">
                {h.team.meetTheTeam} ({teamCount}) <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Partners ---------- */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8">
        <Reveal>
          <SectionHeading eyebrow={h.partners.eyebrow} title={h.partners.title} accent={h.partners.accent} align="center" />
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          {partners.map((raw, i) => {
            const p = tPartner(lang, raw)
            return (
              <Reveal key={raw.name} delay={i * 90} variant="scale">
                <a href={raw.href} target="_blank" rel="noreferrer"
                   className="card card-hover flex h-full flex-col items-center justify-center p-8 text-center">
                  {raw.logo ? (
                    // DevisionX: logo only, no label — per your instruction.
                    <span className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-6">
                      <Image src={asset(raw.logo)} alt={raw.name} width={260} height={104}
                             className="h-16 w-auto object-contain" />
                    </span>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-fg">{raw.name}</p>
                      {p.role && (
                        <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-teal">
                          {p.role}
                        </p>
                      )}
                      {p.blurb && (
                        <p className="mt-4 text-sm leading-relaxed text-muted">{p.blurb}</p>
                      )}
                    </>
                  )}
                </a>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="border-t border-line bg-alt">
        <div className="mx-auto max-w-content px-5 py-20 sm:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow={h.faq.eyebrow} title={h.faq.title} accent={h.faq.accent} />
              <Link href={href('/faq')} className="btn-ghost shrink-0">
                {copy.common.allAnswers} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-10">
              <FaqAccordion
                items={faqs.filter((f) => f.scope === 'general').slice(0, 4).map((f) => tFaq(lang, f))}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section id="contact" className="mx-auto max-w-content scroll-mt-24 px-5 py-20 sm:px-8">
        <Reveal>
          <SectionHeading eyebrow={h.contact.eyebrow} title={h.contact.title} accent={h.contact.accent} align="center">
            {h.contact.lead}
          </SectionHeading>
        </Reveal>

        <Reveal delay={60}>
          <div className="mt-10 flex justify-center">
            <a
              href={`mailto:${contacts.email}`}
              className="btn-primary group !rounded-2xl !px-10 !py-5 text-base sm:!px-14 sm:!py-6 sm:text-lg"
            >
              <Mail className="h-5 w-5 sm:h-6 sm:w-6" />
              {copy.common.contactUs}
              <ArrowUpRight className="h-5 w-5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 [&>*]:min-w-0 md:grid-cols-2">
          <Reveal>
            <div className="card h-full p-6">
              <h3 className="text-base font-semibold text-fg">{h.contact.generalTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{h.contact.generalDesc}</p>
              <a href={`mailto:${contacts.email}`}
                 className="group mt-5 flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-cyan-400/40 hover:bg-surface-hover">
                <Mail className="h-4 w-4 shrink-0 text-cyan-400" />
                <span dir="ltr" className="min-w-0 flex-1 break-all text-start text-sm text-body">{contacts.email}</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-cyan-400" />
              </a>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="card h-full border-amber-400/25 p-6">
              <h3 className="text-base font-semibold text-fg">{h.contact.partnershipsTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{h.contact.partnershipsDesc}</p>
              <p className="mt-4 text-sm font-semibold text-fg">{contacts.founder.name}</p>
              <p className="text-xs text-faint">{tMember(lang, founder).role}</p>
              <div className="mt-4 space-y-2">
                <a href={`mailto:${contacts.founder.email}`}
                   className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-amber-400/40 hover:bg-surface-hover">
                  <Mail className="h-4 w-4 shrink-0 text-amber-400" />
                  <span dir="ltr" className="min-w-0 flex-1 break-all text-start text-sm text-body">{contacts.founder.email}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-amber-400" />
                </a>
                <a href={contacts.founder.linkedin} target="_blank" rel="noreferrer"
                   className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-amber-400/40 hover:bg-surface-hover">
                  <Linkedin className="h-4 w-4 shrink-0 text-amber-400" />
                  <span dir="ltr" className="flex-1 text-start text-sm text-body">linkedin.com/in/ayanasser</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-amber-400" />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 pb-8 sm:px-8">
        <Reveal><JoinCTA lang={lang} /></Reveal>
      </section>
    </>
  )
}
