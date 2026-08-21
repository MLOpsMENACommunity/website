import Link from 'next/link'
import { ArrowRight, ArrowUpRight, PlayCircle, CalendarDays, MapPin } from 'lucide-react'
import Countdown from './Countdown'
import Counter from './Counter'
import HexField from './HexField'
import { channels, primaryChannel, stats } from '~/site.config'
import { nextSession } from '~/data/sessions'

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-teal/10 blur-[110px] animate-float-slow" />
      <div className="pointer-events-none absolute -right-32 top-10 h-[30rem] w-[30rem] rounded-full bg-amber/10 blur-[110px] animate-float-slow [animation-delay:6s]" />
      <HexField className="pointer-events-none absolute right-4 top-24 hidden h-64 w-96 text-white/[0.055] lg:block" />

      <div className="relative mx-auto max-w-content px-5 pb-20 pt-20 sm:px-8 sm:pt-28">
        <div className="grid items-center gap-14 [&>*]:min-w-0 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <span className="eyebrow">MLOps MENA Community</span>

            <h1 className="mt-5 text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
              Most engineers can train a model.
              <span className="mt-2 block brand-text text-shadow-glow">Almost none can ship it.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
              Free MLOps and AI learning for engineers across the Middle East and North Africa.
              Live sessions, structured roadmaps, open courses, and mentorship — always free.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href={channels[primaryChannel]} target="_blank" rel="noreferrer" className="btn-primary">
                Join the Community
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <Link href="/roadmaps" className="btn-ghost">
                Explore the roadmaps
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href={channels.youtube} target="_blank" rel="noreferrer"
                 className="btn text-sm font-semibold text-slate-400 transition hover:text-white">
                <PlayCircle className="h-4 w-4" />
                Watch past sessions
              </a>
            </div>

            <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="text-2xl font-bold text-white">
                    <Counter value={s.value} suffix={s.suffix} />
                  </dd>
                  <p className="mt-1 text-[11px] font-medium uppercase leading-tight tracking-[0.08em] text-slate-500">
                    {s.label}
                  </p>
                </div>
              ))}
            </dl>
          </div>

          {/* Next free session */}
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl brand-gradient opacity-15 blur-2xl" />
            <div className="card overflow-hidden p-6 sm:p-7">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">
                  Next free session
                </span>
              </div>

              <h2 className="mt-4 text-xl font-bold leading-snug text-white">{nextSession.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{nextSession.subtitle}</p>

              <div className="mt-4 space-y-2 text-sm text-slate-400">
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-cyan-400" />
                  {nextSession.dateLabel}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-cyan-400" />
                  {nextSession.speaker} · {nextSession.speakerRole}
                </p>
              </div>

              <div className="mt-5">
                <Countdown iso={nextSession.startsAt} />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {nextSession.registerUrl && (
                  <a href={nextSession.registerUrl} target="_blank" rel="noreferrer"
                     className="btn-primary flex-1 !px-4 !py-2.5">
                    Register free
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                )}
                <Link href="/sessions" className="btn-ghost !px-4 !py-2.5">
                  All sessions
                </Link>
              </div>

              {nextSession.note && (
                <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-relaxed text-slate-500">
                  {nextSession.note}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
