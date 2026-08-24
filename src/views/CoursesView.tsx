import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight, ArrowUpRight, Star, Clock, Radio, Users, Trophy, Sparkles, Check,
} from 'lucide-react'
import Reveal from '@/components/Reveal'
import JoinCTA from '@/components/JoinCTA'
import HexField from '@/components/HexField'
import { course } from '~/data/mlops-practitioner'
import { upcomingCourse } from '~/data/offerings'
import { partners, channels } from '~/site.config'
import { asset } from '@/lib/asset'
import { t, localeHref, type Lang } from '@/lib/i18n'
import { courseAr, upcomingCourseAr } from '@/lib/content-i18n'

export default function CoursesView({ lang }: { lang: Lang }) {
  const copy = t(lang)
  const c = copy.coursesPage
  const zomra = partners.find((p) => p.name === 'Zomra')
  const cc = lang === 'ar' ? courseAr : course
  const uc = lang === 'ar' ? upcomingCourseAr : upcomingCourse

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <HexField className="pointer-events-none absolute end-6 top-16 hidden h-56 w-80 text-hex lg:block" />
        <div className="relative mx-auto max-w-content px-5 py-20 sm:px-8">
          <span className="eyebrow">{c.eyebrow}</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            {c.titleBefore} <span className="brand-text">{c.accent}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            {c.lead} {zomra?.name}.
          </p>
        </div>
      </section>

      {/* ---------- Milestone banner ---------- */}
      <section className="mx-auto max-w-content px-5 pt-14 sm:px-8">
        <Reveal variant="scale">
          <div className="card relative overflow-hidden">
            <div className="grid items-center gap-0 sm:grid-cols-[1fr_minmax(0,20rem)]">
              <div className="p-7 sm:p-10">
                <span className="chip border-amber-400/30 text-amber-400">
                  <Trophy className="h-3 w-3" /> {c.milestone}
                </span>
                <h2 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">
                  <span className="brand-text">{c.milestoneTitleAccent}</span> {c.milestoneTitleAfter}
                </h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{c.milestoneLead}</p>
              </div>
              <div className="relative h-56 sm:h-full sm:min-h-[16rem]">
                <Image
                  src={asset('/course/milestone-1200.jpg')}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 20rem"
                  className="object-cover"
                />
                {/* Fade the image into the card on wide screens */}
                <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/30 to-transparent rtl:bg-gradient-to-l" />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- Course 01 ---------- */}
      <section className="mx-auto max-w-content px-5 py-14 sm:px-8">
        <Reveal variant="start">
          <article className="card relative overflow-hidden p-7 sm:p-10">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-teal/10 blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-5xl font-bold text-fg/10">01</span>
                <span className="chip border-teal/35 text-teal">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
                  </span>
                  {cc.status}
                </span>
              </div>

              <div className="mt-4 grid gap-8 lg:grid-cols-[1.45fr_1fr]">
                <div>
                  <h2 className="text-3xl font-bold sm:text-4xl">{course.title}</h2>
                  <p className="mt-2 text-sm font-medium text-cyan-400">{cc.format}</p>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{cc.summary}</p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {course.stack.slice(0, 12).map((tool) => (
                      <span key={tool} className="chip font-mono text-[11px]">{tool}</span>
                    ))}
                    <span className="chip font-mono text-[11px] text-cyan-400">
                      +{course.stack.length - 12} {copy.common.more}
                    </span>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href={localeHref(lang, '/courses/mlops-practitioner')} className="btn-primary">
                      {c.fullDetails} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                    </Link>
                    <a href={course.enrollUrl} target="_blank" rel="noreferrer" className="btn-ghost">
                      {c.enrolOnZomra} <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                <ul className="space-y-3 self-start rounded-2xl border border-line bg-surface-2 p-6">
                  <li className="flex items-center gap-3 text-sm text-body">
                    <Radio className="h-4 w-4 shrink-0 text-cyan-400" />{c.facts.lessons}
                  </li>
                  <li className="flex items-center gap-3 text-sm text-body">
                    <Clock className="h-4 w-4 shrink-0 text-cyan-400" />{c.facts.weeks}
                  </li>
                  <li className="flex items-center gap-3 text-sm text-body">
                    <Users className="h-4 w-4 shrink-0 text-cyan-400" />{c.facts.groups}
                  </li>
                  <li className="flex items-center gap-3 text-sm text-body">
                    <Trophy className="h-4 w-4 shrink-0 text-cyan-400" />{c.facts.certificate}
                  </li>
                  <li className="flex items-center gap-3 border-t border-line pt-3 text-sm text-body">
                    <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                    {course.rating.score} {c.from} {course.rating.count} {copy.common.reviews}
                  </li>
                </ul>
              </div>
            </div>
          </article>
        </Reveal>

        {/* ---------- Course 02 ---------- */}
        <Reveal delay={100} variant="end">
          <article className="card relative mt-6 overflow-hidden border-dashed p-7 sm:p-10">
            <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-violet/10 blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-5xl font-bold text-fg/10">{upcomingCourse.number}</span>
                <span className="chip border-violet/35 text-violet">
                  <Sparkles className="h-3 w-3" /> {uc.status}
                </span>
              </div>

              <div className="mt-4 grid gap-8 lg:grid-cols-[1.45fr_1fr]">
                <div>
                  <h2 className="text-3xl font-bold sm:text-4xl">{upcomingCourse.title}</h2>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{uc.summary}</p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <a href={channels.whatsapp} target="_blank" rel="noreferrer" className="btn-primary">
                      {c.notifyWhenOpen} <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                <div className="self-start rounded-2xl border border-line bg-surface-2 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                    {c.willCover}
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {uc.topics.map((topic) => (
                      <li key={topic} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </article>
        </Reveal>
      </section>

      <section className="mx-auto max-w-content px-5 pb-8 sm:px-8">
        <Reveal><JoinCTA lang={lang} /></Reveal>
      </section>
    </>
  )
}
