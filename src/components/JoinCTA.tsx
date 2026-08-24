import { MessageCircle, Linkedin, Youtube, ArrowUpRight } from 'lucide-react'
import { channels } from '~/site.config'
import HexField from './HexField'
import { t, type Lang } from '@/lib/i18n'

export default function JoinCTA({ lang = 'en' }: { lang?: Lang }) {
  const copy = t(lang)
  const options = [
    { href: channels.whatsapp, label: 'WhatsApp', note: copy.joinCta.notes.whatsapp, Icon: MessageCircle, primary: true },
    { href: channels.linkedin, label: 'LinkedIn', note: copy.joinCta.notes.linkedin, Icon: Linkedin },
    { href: channels.youtube, label: 'YouTube', note: copy.joinCta.notes.youtube, Icon: Youtube },
    { href: channels.discord, label: 'Discord', note: copy.joinCta.notes.discord, Icon: MessageCircle },
  ]

  return (
    <section className="relative overflow-hidden rounded-3xl border border-line bg-surface-2 px-6 py-14 sm:px-12">
      <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-teal/15 blur-3xl animate-pulse-glow" />
      <div className="absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-amber/15 blur-3xl animate-pulse-glow" />
      <HexField className="absolute -right-8 top-4 h-48 w-64 text-hex" />

      <div className="relative">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow justify-center">{copy.joinCta.eyebrow}</span>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            {copy.joinCta.titleBefore} <span className="brand-text">{copy.joinCta.accent}</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">{copy.joinCta.lead}</p>
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
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-hover text-cyan-400">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-fg">{label}</span>
                <span className="block text-xs text-faint">{note}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-ghost transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-cyan-400" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
