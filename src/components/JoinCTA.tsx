import { MessageCircle, Linkedin, Youtube, ArrowUpRight } from 'lucide-react'
import { channels } from '~/site.config'
import HexField from './HexField'

const options = [
  { href: channels.whatsapp, label: 'WhatsApp', note: '3,000+ members', Icon: MessageCircle, primary: true },
  { href: channels.linkedin, label: 'LinkedIn', note: '3,000+ followers', Icon: Linkedin },
  { href: channels.youtube, label: 'YouTube', note: 'All recordings', Icon: Youtube },
  { href: channels.discord, label: 'Discord', note: 'Chat & help', Icon: MessageCircle },
]

export default function JoinCTA() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-850/70 px-6 py-14 sm:px-12">
      <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-teal/15 blur-3xl animate-pulse-glow" />
      <div className="absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-amber/15 blur-3xl animate-pulse-glow" />
      <HexField className="absolute -right-8 top-4 h-48 w-64 text-white/[0.06]" />

      <div className="relative">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow justify-center">Join us</span>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            Learning MLOps alone is <span className="brand-text">unnecessarily hard</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Thousands of engineers across MENA are already in the room — reviewing each
            other&rsquo;s code, sharing openings, and getting unblocked. It costs nothing.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
          {options.map(({ href, label, note, Icon, primary }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className={`card card-hover group flex items-center gap-4 p-4 ${
                primary ? 'border-cyan-400/30 bg-cyan-400/[0.06] sm:col-span-2' : ''
              }`}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 text-cyan-400">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white">{label}</span>
                <span className="block text-xs text-slate-500">{note}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-cyan-400" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
