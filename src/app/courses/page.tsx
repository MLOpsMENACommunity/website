import type { Metadata } from 'next'
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

export const metadata: Metadata = {
  title: 'Courses',
  description:
    'Free cohort-based courses on production machine learning — The MLOps Practitioner (running now) and LLMOps (coming soon), delivered with our educational partner Zomra.',
}

export default function CoursesPage() {
  const zomra = partners.find((p) => p.name === 'Zomra')

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <HexField className="pointer-events-none absolute right-6 top-16 hidden h-56 w-80 text-hex lg:block" />
        <div className="relative mx-auto max-w-content px-5 py-20 sm:px-8">
          <span className="eyebrow">Courses</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            Cohort-based, live, and <span className="brand-text">free to join</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Real projects, live lessons, and a certificate at the end — delivered together with
            our educational platform partner {zomra?.name}.
          </p>
        </div>
      </section>

      {/* ---------- Milestone banner ---------- */}
      <section className="mx-auto max-w-content px-5 pt-14 sm:px-8">
        <Reveal>
          <div className="card relative overflow-hidden">
            <div className="grid items-center gap-0 sm:grid-cols-[1fr_minmax(0,20rem)]">
              <div className="p-7 sm:p-10">
                <span className="chip border-amber-400/30 text-amber-400">
                  <Trophy className="h-3 w-3" /> Milestone
                </span>
                <h2 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">
                  <span className="brand-text">1,200+ students</span> registered for
                  The MLOps Practitioner
                </h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
                  Cohort 1 is running now with a 4.9 rating from its first reviews. Cohort 2 and
                  our second course are already in preparation.
                </p>
              </div>
              <div className="relative h-56 sm:h-full sm:min-h-[16rem]">
                <Image
                  src={asset("/course/milestone-1200.jpg")}
                  alt="Celebrating 1,200+ registered students for the MLOps Practitioner course"
                  fill
                  sizes="(max-width: 640px) 100vw, 20rem"
                  className="object-cover"
                />
                {/* Fade the image into the card on wide screens */}
                <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/30 to-transparent sm:bg-gradient-to-r" />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- Course 01 ---------- */}
      <section className="mx-auto max-w-content px-5 py-14 sm:px-8">
        <Reveal>
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
                  {course.status}
                </span>
              </div>

              <div className="mt-4 grid gap-8 lg:grid-cols-[1.45fr_1fr]">
                <div>
                  <h2 className="text-3xl font-bold sm:text-4xl">{course.title}</h2>
                  <p className="mt-2 text-sm font-medium text-cyan-400">{course.format}</p>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
                    {course.summary}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {course.stack.slice(0, 12).map((t) => (
                      <span key={t} className="chip font-mono text-[11px]">{t}</span>
                    ))}
                    <span className="chip font-mono text-[11px] text-cyan-400">
                      +{course.stack.length - 12} more
                    </span>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/courses/mlops-practitioner" className="btn-primary">
                      Full course details <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a href={course.enrollUrl} target="_blank" rel="noreferrer" className="btn-ghost">
                      Enrol on Zomra <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                <ul className="space-y-3 self-start rounded-2xl border border-line bg-surface p-6">
                  <li className="flex items-center gap-3 text-sm text-body">
                    <Radio className="h-4 w-4 shrink-0 text-cyan-400" />5 interactive live lessons
                  </li>
                  <li className="flex items-center gap-3 text-sm text-body">
                    <Clock className="h-4 w-4 shrink-0 text-cyan-400" />7 weeks · Aug 15 → Oct 2
                  </li>
                  <li className="flex items-center gap-3 text-sm text-body">
                    <Users className="h-4 w-4 shrink-0 text-cyan-400" />4 levelled study groups
                  </li>
                  <li className="flex items-center gap-3 text-sm text-body">
                    <Trophy className="h-4 w-4 shrink-0 text-cyan-400" />Certificate of completion
                  </li>
                  <li className="flex items-center gap-3 border-t border-line pt-3 text-sm text-body">
                    <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                    {course.rating.score} from {course.rating.count} reviews
                  </li>
                </ul>
              </div>
            </div>
          </article>
        </Reveal>

        {/* ---------- Course 02 ---------- */}
        <Reveal delay={100}>
          <article className="card relative mt-6 overflow-hidden border-dashed p-7 sm:p-10">
            <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-violet/10 blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-5xl font-bold text-fg/10">{upcomingCourse.number}</span>
                <span className="chip border-violet/35 text-violet">
                  <Sparkles className="h-3 w-3" /> {upcomingCourse.status}
                </span>
              </div>

              <div className="mt-4 grid gap-8 lg:grid-cols-[1.45fr_1fr]">
                <div>
                  <h2 className="text-3xl font-bold sm:text-4xl">{upcomingCourse.title}</h2>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
                    {upcomingCourse.summary}
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <a href={channels.whatsapp} target="_blank" rel="noreferrer" className="btn-primary">
                      Get notified when it opens <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                <div className="self-start rounded-2xl border border-line bg-surface p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                    What it will cover
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {upcomingCourse.topics.map((t) => (
                      <li key={t} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                        {t}
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
        <Reveal><JoinCTA /></Reveal>
      </section>
    </>
  )
}
