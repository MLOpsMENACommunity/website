import Link from 'next/link'
import { Youtube, Linkedin, MessageCircle, Mail, Github, Sparkles } from 'lucide-react'
import Logo from './Logo'
import { site, channels, contacts, brainsmingle } from '~/site.config'

const social = [
  { href: channels.whatsapp, label: 'WhatsApp community', Icon: MessageCircle },
  { href: channels.linkedin, label: 'LinkedIn', Icon: Linkedin },
  { href: channels.youtube, label: 'YouTube', Icon: Youtube },
  { href: channels.github, label: 'GitHub', Icon: Github },
  { href: `mailto:${contacts.email}`, label: 'Email', Icon: Mail },
]

const learn = [
  { label: 'Roadmaps', href: '/roadmaps' },
  { label: 'Courses', href: '/courses' },
  { label: 'The MLOps Practitioner', href: '/courses/mlops-practitioner' },
  { label: 'Sessions', href: '/sessions' },
  { label: 'Articles', href: '/articles' },
]

const about = [
  { label: 'Meet the team', href: '/team' },
  { label: 'Mentorship & consultation', href: '/mentorship' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact us', href: '/#contact' },
]

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10 bg-ink-950/60">
      <div className="mx-auto max-w-content px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">{site.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {social.map(({ href, label, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}
                   className="rounded-lg border border-white/10 p-2.5 text-slate-400 transition hover:border-cyan-400/40 hover:text-cyan-400">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Learn</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {learn.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} className="text-slate-400 transition hover:text-cyan-400">{i.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Community</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {about.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} className="text-slate-400 transition hover:text-cyan-400">{i.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Where we are</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href={channels.whatsapp} target="_blank" rel="noreferrer" className="text-slate-400 transition hover:text-cyan-400">WhatsApp</a></li>
              <li><a href={channels.discord} target="_blank" rel="noreferrer" className="text-slate-400 transition hover:text-cyan-400">Discord</a></li>
              <li><a href={channels.linkedin} target="_blank" rel="noreferrer" className="text-slate-400 transition hover:text-cyan-400">LinkedIn</a></li>
              <li><a href={channels.youtube} target="_blank" rel="noreferrer" className="text-slate-400 transition hover:text-cyan-400">YouTube</a></li>
              <li><a href={channels.github} target="_blank" rel="noreferrer" className="text-slate-400 transition hover:text-cyan-400">GitHub</a></li>
              <li><a href={channels.zomra} target="_blank" rel="noreferrer" className="text-slate-400 transition hover:text-cyan-400">Zomra</a></li>
            </ul>

            <a href={brainsmingle.href} target="_blank" rel="noreferrer"
               className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-3 transition hover:border-amber-400/50">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span className="text-xs leading-relaxed text-slate-300">
                <span className="block font-semibold text-white">Brainsmingle space</span>
                {brainsmingle.note}{' '}
                <span className="font-mono font-semibold text-amber-400">{brainsmingle.code}</span>
              </span>
            </a>
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
