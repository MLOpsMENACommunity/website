import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Mail, Users } from 'lucide-react'
import Reveal from '@/components/Reveal'
import MemberCard from '@/components/MemberCard'
import JoinCTA from '@/components/JoinCTA'
import HexField from '@/components/HexField'
import { founder, directors, leads, teamSummary, teamCount } from '~/data/team'

export const metadata: Metadata = {
  title: 'Meet the Team',
  description:
    'The people who run MLOps MENA Community — one founder, two community directors, and six owned axes covering instruction, content, research, growth, sessions, and platform.',
}

export default function TeamPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-amber/10 blur-[100px]" />
        <HexField className="pointer-events-none absolute right-6 top-16 hidden h-56 w-80 text-hex lg:block" />
        <div className="relative mx-auto max-w-content px-5 py-20 sm:px-8">
          <span className="eyebrow">Meet the team</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            The people who <span className="brand-text">run this community</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            {teamSummary} {teamCount} volunteers keeping the sessions, courses, roadmaps, and
            study groups running — all of it free.
          </p>
        </div>
      </section>

      {/* ---------- Structure ---------- */}
      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <Reveal>
          <span className="eyebrow">How the team is structured</span>
        </Reveal>

        {/* Founder */}
        <Reveal delay={60}>
          <div className="mt-10 flex justify-center">
            <div className="w-full max-w-md">
              <MemberCard member={founder} badge="Founder" featured />
            </div>
          </div>
        </Reveal>

        {/* Connector: founder → directors */}
        <div aria-hidden className="relative mx-auto h-12 w-full max-w-3xl">
          <span className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-line-strong" />
          <span className="absolute left-1/4 right-1/4 top-6 h-px bg-line-strong" />
          <span className="absolute left-1/4 top-6 h-6 w-px bg-line-strong" />
          <span className="absolute right-1/4 top-6 h-6 w-px bg-line-strong" />
        </div>

        {/* Directors */}
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          {directors.map((d, i) => (
            <Reveal key={d.name} delay={i * 80}>
              <MemberCard member={d} badge="Community Director" />
            </Reveal>
          ))}
        </div>

        {/* Connector: directors → axes */}
        <div aria-hidden className="relative mx-auto h-12 w-full max-w-5xl">
          <span className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-line-strong" />
          <span className="absolute left-[8%] right-[8%] top-6 h-px bg-line-strong" />
        </div>

        {/* The six axes */}
        <Reveal>
          <div className="text-center">
            <span className="eyebrow justify-center">Six owned axes</span>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leads.map((l, i) => (
            <Reveal key={l.name} delay={i * 70}>
              <div className="relative h-full">
                <span className="absolute -top-3 left-6 z-10 grid h-7 w-7 place-items-center rounded-full border border-line bg-surface-2 font-mono text-xs font-bold text-cyan-400">
                  {l.axis}
                </span>
                <MemberCard member={l} />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Join the team ---------- */}
      <section className="border-y border-line bg-alt">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8">
          <Reveal>
            <div className="card flex flex-col items-center gap-6 p-8 text-center sm:p-12">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-400">
                <Users className="h-6 w-6" />
              </span>
              <div className="max-w-xl">
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Want to <span className="brand-text">join the core team?</span>
                </h2>
                <p className="mt-3 text-base leading-relaxed text-muted">
                  We are always looking for practitioners to run sessions, review code, mentor
                  students, and help keep this free for everyone.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/#contact" className="btn-primary">
                  <Mail className="h-4 w-4" /> Contact us
                </Link>
                <Link href="/mentorship" className="btn-ghost">
                  Mentorship &amp; consultation <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <Reveal><JoinCTA /></Reveal>
      </section>
    </>
  )
}
