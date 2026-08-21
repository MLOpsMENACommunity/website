import Image from 'next/image'
import { Linkedin, ArrowUpRight } from 'lucide-react'
import type { Member } from '~/data/team'

/**
 * Renders a team member. Falls back to an initials avatar when no photo is set,
 * and hides the LinkedIn link when no URL is set — so placeholders never look broken.
 */
export default function MemberCard({
  member,
  badge,
  featured = false,
}: {
  member: Member
  badge?: string
  featured?: boolean
}) {
  return (
    <div className={`card h-full p-6 ${featured ? 'border-cyan-400/30 bg-cyan-400/[0.04]' : ''}`}>
      <div className="flex items-start gap-4">
        {member.photo ? (
          <Image
            src={member.photo}
            alt={member.name}
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-white/15"
          />
        ) : (
          <span
            className={`grid h-16 w-16 shrink-0 place-items-center rounded-full text-lg font-bold ${
              featured
                ? 'brand-gradient text-ink-950'
                : 'border border-white/12 bg-white/5 text-slate-300'
            }`}
            aria-hidden
          >
            {member.initials}
          </span>
        )}

        <div className="min-w-0 flex-1">
          {badge && (
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {badge}
            </span>
          )}
          <h3 className="mt-0.5 text-base font-semibold leading-snug text-white">{member.name}</h3>
          {/* Skip the role when the badge above already says the same thing. */}
          {badge !== member.role && (
            <p className="mt-1 text-xs font-medium leading-snug text-cyan-400">{member.role}</p>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-400">{member.bio}</p>

      {member.linkedin ? (
        <a
          href={member.linkedin}
          target="_blank"
          rel="noreferrer"
          className="group mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-cyan-400"
        >
          <Linkedin className="h-4 w-4" /> LinkedIn
          <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      ) : (
        <p className="mt-4 text-xs text-slate-600">LinkedIn profile coming soon</p>
      )}
    </div>
  )
}
