/**
 * Community FAQ. Source: basic_community_info/faq.md (translated from Arabic).
 * `scope: 'course'` entries also render on the course page.
 */
export const faqs = [
  {
    q: 'Is it normal to feel lost as a junior or a student, and hear a lot of unfamiliar terms?',
    a: 'Completely normal — and it means the session did its job. If everything sounded familiar by the end, it would mean we were repeating things you had already heard many times before. Feeling flooded is just the side effect of stepping out of the notebook and discovering how much bigger this field actually is. Congratulations: that feeling is progress.',
    scope: 'course',
  },
  {
    q: 'How do I deal with all the new terminology?',
    a: 'Write down every new term you run into. Then pick your route: search it on YouTube — there is almost always a good crash course; read the official tutorial or documentation for that tool or concept; and bring the ones that are still unclear to the community. We also run sessions specifically on the problems you hit, and we will be explaining several of these terms in detail in an upcoming session.',
    scope: 'course',
  },
  {
    q: 'Will the course recordings stay available?',
    a: 'The first session stays permanently on our YouTube channel. The remaining sessions are taken down 48 hours after each session, so attend live where you can.',
    scope: 'course',
  },
  {
    q: 'How long does the attendance form stay open?',
    a: 'Until the course finishes completely. The course material stays available too, and we resend it so you can study and review what was covered.',
    scope: 'course',
  },
  {
    q: 'Is the community really free?',
    a: 'Yes. Sessions, roadmaps, articles, study groups, and community support cost nothing and always will. Our courses are delivered with our educational partner Zomra.',
    scope: 'general',
  },
  {
    q: 'Do I need a machine learning background to join?',
    a: 'Not for the community or the roadmaps — the Basic MLOps Engineer Roadmap starts from programming fundamentals. The MLOps Practitioner course does expect basic Python and at least one model you have trained before.',
    scope: 'general',
  },
  {
    q: 'Which roadmap should I start with?',
    a: 'If you are new to the field, start with the Basic MLOps Engineer Roadmap. If you already work in DevOps, SRE, or platform engineering, go straight to the DevOps to MLOps Transition Roadmap — you can skip most of the basics. If you are already working in MLOps, the Seniors roadmap helps you pick a specialization.',
    scope: 'general',
  },
  {
    q: 'I am a researcher — can the community help with my paper?',
    a: 'Yes. We help researchers with reproducibility, tooling, and the engineering side of publishable work. Bring your problem to the community channels.',
    scope: 'general',
  },
] as const

/** First session material, shared openly. */
export const sessionMaterial = {
  slides:
    'https://docs.google.com/presentation/d/1ZPqFlrnJuruHvWlt4HG--zixQPQLMBlx2LLGSop8W70/edit?usp=sharing',
  repo: 'https://github.com/MLOpsMENACommunity/mlops_practitioner_course',
} as const
