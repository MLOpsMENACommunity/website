import Link from 'next/link'
import { Youtube, Linkedin, MessageCircle, Mail } from 'lucide-react'
import Logo from './Logo'
import { site, channels, nav, contacts } from '~/site.config'

const social = [
  { href: channels.whatsapp, label: 'WhatsApp community', Icon: MessageCircle },
  { href: channels.linkedin, label: 'LinkedIn', Icon: Linkedin },
  { href: channels.youtube, label: 'YouTube', Icon: Youtube },
  { href: `mailto:${contacts.email}`, label: 'Email', Icon: Mail },
]

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10 bg-ink-950/60">
      <div className="mx-auto max-w-content px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">{site.description}</p>
            <div className="mt-5 flex gap-2">
              {social.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="rounded-lg border border-white/10 p-2.5 text-slate-400 transition hover:border-cyan-400/40 hover:text-cyan-400"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Learn</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-slate-400 transition hover:text-cyan-400">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/courses/mlops-practitioner" className="text-slate-400 transition hover:text-cyan-400">
                  The MLOps Practitioner
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Community</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href={channels.whatsapp} target="_blank" rel="noreferrer" className="text-slate-400 transition hover:text-cyan-400">WhatsApp</a></li>
              <li><a href={channels.discord} target="_blank" rel="noreferrer" className="text-slate-400 transition hover:text-cyan-400">Discord</a></li>
              <li><a href={channels.linkedin} target="_blank" rel="noreferrer" className="text-slate-400 transition hover:text-cyan-400">LinkedIn</a></li>
              <li><a href={channels.youtube} target="_blank" rel="noreferrer" className="text-slate-400 transition hover:text-cyan-400">YouTube</a></li>
            </ul>
          </div>
        </div>

        <div className="rule my-10" />
        <div className="flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}. Free education, always.</p>
          <p>Built by the community, for the community.</p>
        </div>
      </div>
    </footer>
  )
}
