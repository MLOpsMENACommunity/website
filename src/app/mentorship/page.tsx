import type { Metadata } from 'next'
import {
  Compass, Building2, Briefcase, Check, Mail, Linkedin, ArrowUpRight, MessageCircle,
} from 'lucide-react'
import Reveal from '@/components/Reveal'
import HexField from '@/components/HexField'
import JoinCTA from '@/components/JoinCTA'
import { offerings } from '~/data/offerings'
import { contacts, channels } from '~/site.config'

export const metadata: Metadata = {
  title: 'Mentorship & Consultation',
  description:
    'Free mentorship for community members — career direction, portfolio review, interview prep and research support. Plus MLOps consultation and training for companies.',
}

const icons = { Compass, Building2, Briefcase } as const
const accents = {
  cyan: { text: 'text-cyan-400', border: 'border-cyan-400/35', bg: 'bg-cyan-400/10' },
  amber: { text: 'text-amber-400', border: 'border-amber-400/35', bg: 'bg-amber-400/10' },
  violet: { text: 'text-violet', border: 'border-violet/35', bg: 'bg-violet/10' },
} as const

export default function MentorshipPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-amber/10 blur-[100px]" />
        <HexField className="pointer-events-none absolute right-6 top-16 hidden h-56 w-80 text-hex lg:block" />
        <div className="relative mx-auto max-w-content px-5 py-20 sm:px-8">
          <span className="eyebrow">Mentorship &amp; Consultation</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            Help from people who <span className="brand-text">do this for a living</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Mentorship for community members, consultation for companies, and internship
            routes with our partners.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {offerings.map((o, i) => {
            const Icon = icons[o.icon as keyof typeof icons]
            const a = accents[o.accent as keyof typeof accents]
            return (
              <Reveal key={o.id} delay={i * 90}>
                <div className={`card flex h-full flex-col p-7 ${a.border}`}>
                  <span className={`grid h-12 w-12 place-items-center rounded-xl ${a.bg} ${a.text}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-5 text-xl font-bold text-fg">{o.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{o.blurb}</p>

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {o.items.map((it) => (
                      <li key={it} className="flex gap-2.5 text-sm leading-relaxed text-body">
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${a.text}`} />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section id="contact" className="scroll-mt-24 border-y border-line bg-alt">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow justify-center">Get in touch</span>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                Tell us what you <span className="brand-text">need help with</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Members: bring your question to the community channels — that is the fastest
                route. Companies and partners: reach the founder directly.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 [&>*]:min-w-0 md:grid-cols-2">
            <Reveal>
              <div className="card h-full p-6">
                <h3 className="text-base font-semibold text-fg">Community &amp; general</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Questions about courses, sessions, roadmaps, or study groups.
                </p>
                <div className="mt-5 space-y-2">
                  <a href={`mailto:${contacts.email}`}
                     className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-cyan-400/40 hover:bg-surface">
                    <Mail className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span className="min-w-0 flex-1 break-all text-sm text-body">{contacts.email}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-cyan-400" />
                  </a>
                  <a href={channels.whatsapp} target="_blank" rel="noreferrer"
                     className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-cyan-400/40 hover:bg-surface">
                    <MessageCircle className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span className="flex-1 text-sm text-body">WhatsApp community</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-cyan-400" />
                  </a>
                </div>
              </div>
            </Reveal>

            <Reveal delay={90}>
              <div className="card h-full border-amber-400/25 p-6">
                <h3 className="text-base font-semibold text-fg">
                  Partnerships &amp; collaboration
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Talk to the founder about partnerships, sponsorship, hiring, and future
                  collaboration.
                </p>
                <p className="mt-4 text-sm font-semibold text-fg">{contacts.founder.name}</p>
                <p className="text-xs text-faint">{contacts.founder.role}</p>
                <div className="mt-4 space-y-2">
                  <a href={`mailto:${contacts.founder.email}`}
                     className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-amber-400/40 hover:bg-surface">
                    <Mail className="h-4 w-4 shrink-0 text-amber-400" />
                    <span className="min-w-0 flex-1 break-all text-sm text-body">
                      {contacts.founder.email}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-amber-400" />
                  </a>
                  <a href={contacts.founder.linkedin} target="_blank" rel="noreferrer"
                     className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-amber-400/40 hover:bg-surface">
                    <Linkedin className="h-4 w-4 shrink-0 text-amber-400" />
                    <span className="flex-1 text-sm text-body">linkedin.com/in/ayanasser</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-amber-400" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <Reveal><JoinCTA /></Reveal>
      </section>
    </>
  )
}
