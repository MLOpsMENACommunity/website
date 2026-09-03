/**
 * UI strings for the two language editions of the site.
 *
 * English lives at the root (`/roadmaps`), Arabic under `/ar` (`/ar/roadmaps`).
 * `ar` is typed as `typeof en`, so a key added to English fails the build until
 * it is translated — the two editions cannot silently drift apart.
 *
 * Content that comes from `data/*.ts` (sessions, team bios, FAQ answers…) is
 * translated separately in `src/lib/content-i18n.ts`.
 */

export type Lang = 'en' | 'ar'
export const langs: Lang[] = ['en', 'ar']

/** Rewrites an internal href for the given edition. `/roadmaps` → `/ar/roadmaps`. */
export function localeHref(lang: Lang, href: string): string {
  if (lang === 'en') return href
  if (href === '/') return '/ar'
  // '/#contact' has to become '/ar/#contact', not '/ar#contact'.
  if (href.startsWith('/#')) return `/ar/${href.slice(1)}`
  return `/ar${href}`
}

/** The same page in the other edition, used by the language switcher. */
export function otherLangHref(lang: Lang, pathname: string): string {
  if (lang === 'ar') {
    const stripped = pathname.replace(/^\/ar(?=\/|$)/, '')
    return stripped === '' ? '/' : stripped
  }
  return pathname === '/' ? '/ar' : `/ar${pathname}`
}

const en = {
  dir: 'ltr' as 'ltr' | 'rtl',
  htmlLang: 'en',
  langName: 'English',
  otherLangName: 'العربية',
  switchLangLabel: 'اقرأ بالعربية',

  nav: {
    skipToContent: 'Skip to content',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    themeToDark: 'Switch to dark theme',
    themeToLight: 'Switch to light theme',
    items: {
      roadmaps: 'Roadmaps',
      studentGuides: 'Student Guides',
      courses: 'Courses',
      sessions: 'Sessions',
      team: 'Team',
      services: 'Services',
      articles: 'Articles',
      faq: 'FAQ',
    },
    join: 'Join the Community',
  },

  common: {
    allRoadmaps: 'All roadmaps',
    allCourses: 'All courses',
    allSessions: 'All sessions',
    allArticles: 'All articles',
    allAnswers: 'All answers',
    registerFree: 'Register free',
    watchRecording: 'Watch recording',
    getNotified: 'Get notified',
    contactUs: 'Contact us',
    readOn: 'Read on',
    read: 'Read',
    freeResources: 'free resources',
    phases: 'phases',
    specializations: 'specializations',
    registrationOpen: 'Registration open',
    recordingAvailable: 'Recording available',
    liveNow: 'Live now — join us',
    recordingSoon: 'Ended — recording coming soon',
    scheduled: 'Scheduled',
    setReminder: 'Set a reminder on YouTube',
    joinLive: 'Join the live stream',
    startsIn: 'Starts in',
    sessionStarted: 'This session has started — join us live',
    sessionEnded: 'This session has ended',
    days: 'Days',
    hours: 'Hours',
    minutes: 'Minutes',
    seconds: 'Seconds',
    more: 'more',
    students: 'students',
    reviews: 'reviews',
    home: 'home',
    backToTop: 'Back to top',
    inEnglish: 'in English',
  },

  home: {
    hero: {
      eyebrow: 'MLOps MENA Community',
      titleLine1: 'Most engineers can train a model.',
      titleLine2: 'Almost none can ship it.',
      lead: 'Free MLOps and AI learning for engineers across the Middle East and North Africa. Live sessions, structured roadmaps, open courses, and mentorship — free for the community. For companies, we also train, staff, and build.',
      exploreRoadmaps: 'Explore the roadmaps',
      exploreGuides: 'Explore student guides',
      watchPast: 'Watch past sessions',
    },
    thisWeek: {
      eyebrow: 'Happening now',
      title: 'This week at',
      accent: 'MLOps MENA',
      lead: 'Our free live sessions, in one place. Register on Zomra, attend live, and catch the recording afterwards.',
      nextSession: 'Next free session',
      nothing: 'No session is scheduled this week — join the WhatsApp group and you will hear about the next one first.',
      browseAll: 'Browse every session',
    },
    numbers: {
      eyebrow: 'Our community in numbers',
      title: 'Our community',
      accent: 'in numbers',
      lead: 'Built in the open across the region — every number below links to the place it comes from.',
    },
    whatWeDo: {
      eyebrow: 'What we do',
      goal: 'Our goal is to make production-grade machine learning skills reachable for every engineer in the Middle East and North Africa — taught by people who do this work for a living, and free for everyone.',
      goal2: 'Pick the piece you need today — none of it costs anything. We also work with companies, and that work is what pays for this.',
    },
    roadmaps: {
      eyebrow: 'Learning roadmaps',
      title: 'Three paths to',
      accent: 'production ML',
      leadBefore: 'Built entirely on free and open-source resources — ',
      leadLinks: 'curated links',
      leadAfter: ' across the three paths.',
    },
    courses: {
      eyebrow: 'Courses',
      title: 'Cohort-based and',
      accent: 'free to join',
      studentsNote: '1,200+ students',
    },
    sessions: {
      eyebrow: 'Sessions',
      title: 'Free live sessions,',
      accent: 'recorded for everyone',
      lead: 'Register on Zomra, attend live, and catch the recording afterwards.',
    },
    studyGroups: {
      eyebrow: 'Study groups',
      title: 'Four rooms,',
      accent: 'pick by experience',
      lead: 'Study alongside people at your level. Choose based on your actual hands-on experience, not your job title.',
      group: 'Group',
      joinOnWhatsapp: 'Join on WhatsApp',
    },
    repos: {
      eyebrow: 'Open source',
      title: 'What we build',
      accent: 'in the open',
      lead: 'Every public repository under our GitHub organisation, listed straight from GitHub.',
      ourGithub: 'Our GitHub',
    },
    articles: {
      eyebrow: 'Articles',
      title: 'Published on',
      accent: 'LinkedIn and Medium',
    },
    brainsmingle: {
      chip: 'Limited time',
      titleBefore: 'We are also on',
      accent: 'Brainsmingle',
      lead: 'Another place to find us — our space on Brainsmingle. For a limited time you can join free this week with the code below.',
      joinSpace: 'Join the space',
    },
    team: {
      eyebrow: 'The team',
      title: 'Who runs',
      accent: 'this community',
      lead: 'Practitioners who build and operate ML systems for a living, teaching what they actually do at work.',
      plusLeads: (n: number) => `Plus ${n} leads across six owned axes`,
      meetTheTeam: 'Meet the team',
      founder: 'Founder',
      director: 'Community Director',
    },
    partners: {
      eyebrow: 'Partners',
      title: 'Built with',
      accent: 'people who ship',
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Questions we get',
      accent: 'every week',
    },
    contact: {
      eyebrow: 'Contact us',
      title: 'Talk to',
      accent: 'the community',
      lead: 'Questions, partnerships, sponsorship, or hiring — here is how to reach us.',
      generalTitle: 'Community & general',
      generalDesc: 'Courses, sessions, roadmaps, and study groups.',
      partnershipsTitle: 'Partnerships & collaboration',
      partnershipsDesc: 'Talk to the founder about future partnership and collaboration.',
    },
  },

  joinCta: {
    eyebrow: 'Join us',
    titleBefore: 'Learning MLOps alone is',
    accent: 'unnecessarily hard',
    lead: 'Thousands of engineers across MENA are already in the room — reviewing each other’s code, sharing openings, and getting unblocked. It costs nothing.',
    notes: {
      whatsapp: '3,000+ members',
      linkedin: '3,000+ followers',
      youtube: 'All recordings',
      discord: 'Chat & help',
      x: 'Follow for updates',
    },
  },

  footer: {
    learn: 'Learn',
    community: 'Community',
    whereWeAre: 'Where we are',
    practitioner: 'The MLOps Practitioner',
    meetTeam: 'Meet the team',
    services: 'Services for companies',
    brainsmingleTitle: 'Brainsmingle space',
    rights: 'Free learning for the community.',
    builtBy: 'Built by the community, for the community.',
  },

  roadmapsPage: {
    metaTitle: 'Learning Roadmaps',
    metaDesc:
      'Three structured MLOps learning paths built entirely on free and open-source resources — from zero to job-ready, from DevOps to MLOps, and from mid-level to Senior.',
    eyebrow: 'Learning roadmaps',
    titleBefore: 'Pick the path that matches',
    accent: 'where you actually are',
    leadBefore:
      'Every roadmap below is built on free and open-source resources, because the real knowledge in this field lives on GitHub and YouTube — not behind paywalls.',
    leadLinks: 'curated links',
    leadAfter: 'in total.',
    openRoadmap: 'Open the roadmap',
    onThisPage: 'On this page',
    readOriginal: 'Read the original on LinkedIn',
    otherPaths: 'Other paths',
    englishNotice:
      'The full roadmap below is published in English. The overview, phases, and every resource link work the same in both editions.',
  },

  studentGuidesPage: {
    metaTitle: 'Student Guides',
    metaDesc:
      'Practical student guides from the MLOps MENA Community, collected in one place for learners.',
    eyebrow: 'Student guides',
    titleBefore: 'Deep-dive guides for',
    accent: 'the MLOps toolchain',
    lead: 'Long-form, numbered guides you can work through end to end — every command runnable, every example copy-paste ready, and every section written for someone starting from zero.',
    statSections: 'sections',
    emptyTitle: 'No guides published yet',
    emptyLead: 'Student guides will appear here when they are ready.',
    searchLabel: 'Search student guides',
    searchPlaceholder: 'Search by title, topic, or tag...',
    clearSearch: 'Clear search',
    noResultsTitle: 'No guides match your search',
    noResultsLead: 'Try a different title, topic, or keyword.',
    openGuide: 'Read guide',
    englishGuide: 'English guide',
    backToGuides: 'Back to student guides',
    onThisPage: 'On this page',
    searchGuide: 'Search this guide',
    searchGuidePlaceholder: 'Find a section...',
    noSectionResults: 'No sections match your search.',
    readingProgress: 'Reading progress',
    copied: 'Copied!',
    /* The GitHub Actions guide is read as a grid: an experience level, then how
       you want to read that level. */
    levelNav: 'Experience level',
    trackNav: 'How to read it',
    levels: {
      beginner: 'Beginner',
      mid: 'Mid-level',
      senior: 'Senior',
    },
    tracks: {
      detailed: 'Detailed',
      interview: 'Interview Review',
      tips: 'Tips & Tricks',
    },
    panePrevious: 'Previous',
    paneNext: 'Next up',
  },


  coursesPage: {
    metaTitle: 'Courses',
    metaDesc:
      'Free cohort-based courses on production machine learning — The MLOps Practitioner (running now) and LLMOps (coming soon), delivered with our educational partner Zomra.',
    eyebrow: 'Courses',
    titleBefore: 'Cohort-based, live, and',
    accent: 'free to join',
    lead: 'Real projects, live lessons, and a certificate at the end — delivered together with our educational platform partner',
    milestone: 'Milestone',
    milestoneTitleAccent: '1,200+ students',
    milestoneTitleAfter: 'registered for The MLOps Practitioner',
    milestoneLead:
      'Cohort 1 is running now with a 4.9 rating from its first reviews. Cohort 2 and our second course are already in preparation.',
    fullDetails: 'Full course details',
    enrolOnZomra: 'Enrol on Zomra',
    facts: {
      lessons: '5 interactive live lessons',
      weeks: '7 weeks · Aug 15 → Oct 2',
      groups: '4 levelled study groups',
      certificate: 'Certificate of completion',
    },
    from: 'from',
    notifyWhenOpen: 'Get notified when it opens',
    willCover: 'What it will cover',
  },

  sessionsPage: {
    metaTitle: 'Sessions',
    metaDesc:
      'Free live sessions on production machine learning — upcoming sessions with registration, and past sessions with recordings.',
    eyebrow: 'Sessions',
    titleBefore: 'Live sessions,',
    accent: 'free to attend',
    lead: 'Practitioners walking through what they actually run in production. Register on Zomra, attend live, and catch the recording on YouTube afterwards.',
    upcoming: 'Upcoming',
    whatIsCovered: 'What is covered',
    getReminders: 'Get reminders',
    noneScheduled: 'No sessions scheduled right now.',
    courseSessions: 'Course sessions',
    courseTitleBefore: 'The MLOps Practitioner',
    courseTitleAccent: 'lessons',
    courseLead: 'Five live lessons across Cohort 1. The ones that have aired are on YouTube; the rest are scheduled.',
    courseDetails: 'Course details',
    watchOnYoutube: 'Watch on YouTube',
    past: 'Past sessions',
    sessionPage: 'Session page',
  },

  teamPage: {
    metaTitle: 'Meet the Team',
    metaDesc:
      'The people who run MLOps MENA Community — one founder, two community directors, and six owned axes covering instruction, content, research, growth, sessions, and platform.',
    eyebrow: 'Meet the team',
    titleBefore: 'The people who',
    accent: 'run this community',
    leadAfter: 'practitioners keeping the sessions, courses, roadmaps, and study groups running — all of it free for the community.',
    structure: 'How the team is structured',
    sixAxes: 'Six owned axes',
    joinTitleBefore: 'Want to',
    joinAccent: 'join the core team?',
    joinLead:
      'We are always looking for practitioners to run sessions, review code, mentor students, and help keep the community side free for everyone.',
    linkedinSoon: 'LinkedIn coming soon',
    email: 'Email',
  },

  servicesPage: {
    metaTitle: 'Services',
    metaDesc:
      'What MLOps MENA offers — free mentorship, research support and internship routes for the community, plus talent outsourcing, MLOps and GenAI training, software project delivery and consultation for companies.',
    eyebrow: 'What we offer',
    titleBefore: 'What we give away, and',
    accent: 'what we sell',
    lead:
      'We publish free learning for engineers across Egypt and the wider MENA region — sessions, roadmaps, courses, mentorship. That side is free and stays free. We are not a charity, though: we also run a services business. We train your engineers, we staff your teams with talent we keep following up on, and we build and ship software. The paid work is what keeps the free work alive.',
    jumpCommunity: 'Free for the community',
    jumpCompanies: 'For companies',

    communityEyebrow: 'Free for the community',
    communityTitleBefore: 'What we give back to',
    communityAccent: 'Egypt and the region',
    communityLead:
      'This is the part we give away. It is our contribution to the engineering community here, and nothing on this list has ever had a price on it.',
    communityNote:
      'Sessions, roadmaps, articles, study groups and community support cost nothing. They are paid for by the company work below — not by ads, sponsor tiers, or a paywall waiting a few clicks in.',
    membersRoute: 'Members: the community channels are the fastest route to any of this.',
    joinWhatsapp: 'Join the WhatsApp community',

    companiesEyebrow: 'For companies',
    companiesTitleBefore: 'Four ways we work',
    companiesAccent: 'with your team',
    companiesLead:
      'The four things companies actually ask us for. Each one is delivered by the same practitioners who teach the free material.',
    enquire: 'Enquire about this',

    tracksEyebrow: 'Training tracks',
    tracksTitleBefore: 'Two subjects,',
    tracksAccent: 'three tracks',
    tracksLead:
      'Corporate training runs on two subjects. MLOps is one track; GenAI splits into RAG and agentic systems, because teams almost always need one of the two first.',
    covers: 'What it covers',

    benchEyebrow: 'The team behind the work',
    benchTitleBefore: 'Seniors at',
    benchAccent: 'every stage',
    benchLead:
      'We do not subcontract the hard parts. The delivery team is in-house and senior across every stage a production system touches.',

    howEyebrow: 'How it starts',
    howTitleBefore: 'From first email to',
    howAccent: 'engineers working',

    getInTouch: 'Get in touch',
    contactTitleBefore: 'Tell us what you need',
    contactAccent: 'built, taught, or staffed',
    contactLead:
      'One email is enough to start. Tell us the problem, the stack, and roughly when you need it.',
    companyTitle: 'Services & delivery',
    companyDesc: 'Outsourcing, software projects, and MLOps consultation.',
    trainingTitle: 'Training for your team',
    trainingDesc: 'MLOps and GenAI tracks, delivered on your own stack.',
    partnershipsTitle: 'Partnerships & the founder',
    partnershipsDesc:
      'Partnerships, sponsorship, and anything you would rather take straight to the founder.',
    fundingNote:
      'Every engagement on this page funds the free sessions, roadmaps and mentorship across the rest of this site.',
  },

  movedPage: {
    metaTitle: 'Mentorship',
    metaDesc: 'Mentorship now lives on the MLOps MENA services page.',
    title: 'Mentorship has moved',
    lead:
      'Mentorship, research support and internship routes are now on one page with everything else we offer.',
    cta: 'Go to Services',
    redirecting: 'Taking you there now…',
  },

  articlesPage: {
    metaTitle: 'Articles',
    metaDesc:
      'Articles published by the MLOps MENA Community on LinkedIn and Medium — roadmaps, production ML practice, and career guidance.',
    eyebrow: 'Articles',
    titleBefore: 'Published on',
    accent: 'LinkedIn and Medium',
    lead: 'Everything the community writes, in one place. Follow us on LinkedIn to catch new posts as they go up.',
    follow: 'Follow on LinkedIn',
    none: 'No articles published yet.',
    readItHere: 'Read it here',
    fullVersion: 'Full version here',
    moreTitle: 'More articles on the way',
    moreLead: 'We publish regularly on LinkedIn and Medium. Follow the page so you do not miss them.',
  },

  privacyPage: {
    metaTitle: 'Privacy Policy',
    metaDesc:
      'What data MLOps MENA collects, how long we keep it, how account credentials are handled, and how to reach us about it.',
    eyebrow: 'Privacy',
    titleBefore: 'What we collect, and',
    accent: 'what we do not',
    lead: 'Short version: the website tracks nothing, and we hold no personal data about the people who read our posts. The detail is below.',
    updated: 'Last updated',
    contents: 'Contents',
  },

  faqPage: {
    metaTitle: 'FAQ',
    metaDesc:
      'Answers to the questions the community asks most — about the course, recordings, attendance, roadmaps, and getting unstuck. Plus session 1 material.',
    eyebrow: 'FAQ',
    titleBefore: 'The questions we get',
    accent: 'every week',
    lead: 'Same questions kept arriving in the DMs, so here are the answers in one place. If yours is not here, send it to us.',
    aboutCourse: 'About the course',
    aboutCommunity: 'About the community',
    materialTitle: 'Session 1 material',
    materialLead:
      'Free and open. Session 1 stays on YouTube permanently — later sessions come down 48 hours after each one.',
    slides: 'Slides',
    repo: 'Course repository',
    recordings: 'Recordings',
    notAnswered: 'Question not answered?',
    sendIt: 'Send it to us',
  },

  practitionerPage: {
    metaTitle: 'The MLOps Practitioner',
    nextSession: 'Next session',
    enrolFree: 'Enrol free on Zomra',
    deliveredWith: 'Delivered with our educational partner',
    learnEyebrow: 'What you\u2019ll learn',
    learnTitle: 'Seven objectives, each one',
    learnAccent: 'a deployable skill',
    toolsTitle: 'The tools you will actually use',
    courseEyebrow: 'The course',
    requirements: 'Course requirements',
    whoIsFor: 'Who is this course for',
    resourcesTitle: 'Course resources',
    resourcesLead: 'Free and open. Session 1 stays on YouTube permanently.',
    linkSoon: 'Link coming soon',
    outlineEyebrow: 'Course outline',
    outlineTitle: 'Seven weeks,',
    outlineAccent: 'each ending in something you shipped',
    week: 'Week',
    moduleProject: 'Module project',
    recordingsEyebrow: 'Live lessons',
    recordingsTitle: 'Five sessions,',
    recordingsAccent: 'live then on YouTube',
    groupsEyebrow: 'Study groups',
    groupsTitle: 'Four rooms.',
    groupsAccent: 'Pick by experience, not job title.',
    groupsLead:
      'Every student joins a WhatsApp study group matched to their current level, so the questions and the pace fit where you actually are.',
    joinIfYouAre: 'Join if you are',
    focus: 'Focus',
    joinGroup: 'Join Group',
    simpleRule: 'The simple rule',
    faqEyebrow: 'Course FAQ',
    faqTitle: 'The questions',
    faqAccent: 'we get every week',
  },

  notFound: {
    title: 'This page did not make it to production',
    lead: 'The link is broken or the page has moved. Head back and try from there.',
    back: 'Back home',
  },
}

const ar: typeof en = {
  dir: 'rtl',
  htmlLang: 'ar',
  langName: 'العربية',
  otherLangName: 'English',
  switchLangLabel: 'Read in English',

  nav: {
    skipToContent: 'تخطَّ إلى المحتوى',
    openMenu: 'افتح القائمة',
    closeMenu: 'أغلق القائمة',
    themeToDark: 'التبديل إلى الوضع الداكن',
    themeToLight: 'التبديل إلى الوضع الفاتح',
    items: {
      roadmaps: 'خرائط التعلّم',
      studentGuides: 'أدلة الدارسين',
      courses: 'الدورات',
      sessions: 'الجلسات',
      team: 'الفريق',
      services: 'الخدمات',
      articles: 'المقالات',
      faq: 'الأسئلة الشائعة',
    },
    join: 'انضم إلى المجتمع',
  },

  common: {
    allRoadmaps: 'كل الخرائط',
    allCourses: 'كل الدورات',
    allSessions: 'كل الجلسات',
    allArticles: 'كل المقالات',
    allAnswers: 'كل الإجابات',
    registerFree: 'سجّل مجانًا',
    watchRecording: 'شاهد التسجيل',
    getNotified: 'أبلغني عند الفتح',
    contactUs: 'تواصل معنا',
    readOn: 'اقرأ على',
    read: 'اقرأ',
    freeResources: 'مصدر مجاني',
    phases: 'مراحل',
    specializations: 'تخصصات',
    registrationOpen: 'التسجيل مفتوح',
    recordingAvailable: 'التسجيل متاح',
    liveNow: 'مباشر الآن — انضم إلينا',
    recordingSoon: 'انتهت — التسجيل قريبًا',
    scheduled: 'مجدولة',
    setReminder: 'اضبط تذكيرًا على يوتيوب',
    joinLive: 'انضم إلى البث المباشر',
    startsIn: 'يبدأ بعد',
    sessionStarted: 'الجلسة بدأت — انضم إلينا الآن',
    sessionEnded: 'انتهت هذه الجلسة',
    days: 'يوم',
    hours: 'ساعة',
    minutes: 'دقيقة',
    seconds: 'ثانية',
    more: 'غير ذلك',
    students: 'دارس',
    reviews: 'تقييم',
    home: 'الرئيسية',
    backToTop: 'العودة إلى الأعلى',
    inEnglish: 'بالإنجليزية',
  },

  home: {
    hero: {
      eyebrow: 'مجتمع MLOps MENA',
      titleLine1: 'معظم المهندسين يستطيعون تدريب نموذج.',
      titleLine2: 'قليلون جدًا يستطيعون تشغيله في الإنتاج.',
      lead: 'تعليم مجاني في MLOps والذكاء الاصطناعي لمهندسي الشرق الأوسط وشمال أفريقيا. جلسات مباشرة، خرائط تعلّم منظّمة، دورات مفتوحة، وإرشاد — مجانًا للمجتمع. وللشركات نقدّم التدريب وتوفير الكفاءات وتنفيذ المشاريع.',
      exploreRoadmaps: 'استكشف خرائط التعلّم',
      exploreGuides: 'استكشف أدلة الدارسين',
      watchPast: 'شاهد الجلسات السابقة',
    },
    thisWeek: {
      eyebrow: 'يحدث الآن',
      title: 'هذا الأسبوع في',
      accent: 'MLOps MENA',
      lead: 'جلساتنا المباشرة المجانية في مكان واحد. سجّل على Zomra، واحضر مباشرة، واحصل على التسجيل بعدها.',
      nextSession: 'الجلسة المجانية القادمة',
      nothing: 'لا توجد جلسة مجدولة هذا الأسبوع — انضم إلى مجموعة واتساب لتكون أول من يعرف عن القادمة.',
      browseAll: 'تصفّح كل الجلسات',
    },
    numbers: {
      eyebrow: 'مجتمعنا في أرقام',
      title: 'مجتمعنا',
      accent: 'في أرقام',
      lead: 'بُني في العلن عبر المنطقة — كل رقم بالأسفل يقودك إلى مصدره.',
    },
    whatWeDo: {
      eyebrow: 'ماذا نفعل',
      goal: 'هدفنا أن تكون مهارات تشغيل نماذج التعلّم الآلي في الإنتاج في متناول كل مهندس في الشرق الأوسط وشمال أفريقيا — يشرحها من يمارسون هذا العمل يوميًا، ومجانًا للجميع.',
      goal2: 'اختر ما تحتاجه اليوم — كل ذلك بلا مقابل. ونعمل أيضًا مع الشركات، وهذا العمل هو ما يموّل ما تراه هنا.',
    },
    roadmaps: {
      eyebrow: 'خرائط التعلّم',
      title: 'ثلاثة مسارات نحو',
      accent: 'تعلّم آلي في الإنتاج',
      leadBefore: 'مبنية بالكامل على مصادر مجانية ومفتوحة المصدر — ',
      leadLinks: 'رابطًا مختارًا',
      leadAfter: ' عبر المسارات الثلاثة.',
    },
    courses: {
      eyebrow: 'الدورات',
      title: 'دفعات دراسية',
      accent: 'مجانية الانضمام',
      studentsNote: '+1,200 دارس',
    },
    sessions: {
      eyebrow: 'الجلسات',
      title: 'جلسات مباشرة مجانية،',
      accent: 'ومسجّلة للجميع',
      lead: 'سجّل على Zomra، واحضر مباشرة، واحصل على التسجيل بعدها.',
    },
    studyGroups: {
      eyebrow: 'مجموعات المذاكرة',
      title: 'أربع مجموعات،',
      accent: 'اختر حسب خبرتك',
      lead: 'ذاكِر مع من هم في مستواك. اختر بناءً على خبرتك العملية الفعلية، لا على مسمّاك الوظيفي.',
      group: 'مجموعة',
      joinOnWhatsapp: 'انضم عبر واتساب',
    },
    repos: {
      eyebrow: 'مفتوح المصدر',
      title: 'ما نبنيه',
      accent: 'في العلن',
      lead: 'كل مستودع عام تحت حسابنا على GitHub، معروض مباشرةً من GitHub.',
      ourGithub: 'حسابنا على GitHub',
    },
    articles: {
      eyebrow: 'المقالات',
      title: 'منشورة على',
      accent: 'لينكدإن وميديوم',
    },
    brainsmingle: {
      chip: 'لفترة محدودة',
      titleBefore: 'نحن أيضًا على',
      accent: 'Brainsmingle',
      lead: 'مكان آخر تجدنا فيه — مساحتنا على Brainsmingle. ولفترة محدودة يمكنك الانضمام مجانًا هذا الأسبوع بالكود التالي.',
      joinSpace: 'انضم إلى المساحة',
    },
    team: {
      eyebrow: 'الفريق',
      title: 'من يدير',
      accent: 'هذا المجتمع',
      lead: 'ممارسون يبنون أنظمة تعلّم آلي ويشغّلونها في عملهم، ويعلّمون ما يفعلونه فعلًا.',
      plusLeads: (n: number) => `بالإضافة إلى ${n} مسؤولين على ستة محاور`,
      meetTheTeam: 'تعرّف على الفريق',
      founder: 'المؤسِّسة',
      director: 'مدير المجتمع',
    },
    partners: {
      eyebrow: 'الشركاء',
      title: 'نبنيه مع',
      accent: 'من يصنعون فعلًا',
    },
    faq: {
      eyebrow: 'الأسئلة الشائعة',
      title: 'أسئلة تصلنا',
      accent: 'كل أسبوع',
    },
    contact: {
      eyebrow: 'تواصل معنا',
      title: 'تحدّث إلى',
      accent: 'المجتمع',
      lead: 'أسئلة، شراكات، رعاية، أو توظيف — هذه طرق الوصول إلينا.',
      generalTitle: 'المجتمع والاستفسارات العامة',
      generalDesc: 'الدورات والجلسات وخرائط التعلّم ومجموعات المذاكرة.',
      partnershipsTitle: 'الشراكات والتعاون',
      partnershipsDesc: 'تحدّث إلى المؤسِّسة بشأن الشراكات والتعاون المستقبلي.',
    },
  },

  joinCta: {
    eyebrow: 'انضم إلينا',
    titleBefore: 'تعلّم MLOps بمفردك',
    accent: 'أصعب مما ينبغي',
    lead: 'آلاف المهندسين من المنطقة موجودون بالفعل — يراجعون أكواد بعضهم، ويتشاركون الفرص، ويساعدون بعضهم على تخطّي العقبات. والانضمام مجاني.',
    notes: {
      whatsapp: '+3,000 عضو',
      linkedin: '+3,000 متابع',
      youtube: 'كل التسجيلات',
      discord: 'نقاش ومساعدة',
      x: 'تابِعنا للتحديثات',
    },
  },

  footer: {
    learn: 'تعلّم',
    community: 'المجتمع',
    whereWeAre: 'أين تجدنا',
    practitioner: 'دورة The MLOps Practitioner',
    meetTeam: 'تعرّف على الفريق',
    services: 'خدماتنا للشركات',
    brainsmingleTitle: 'مساحتنا على Brainsmingle',
    rights: 'تعلّم مجاني للمجتمع.',
    builtBy: 'صنعه المجتمع، من أجل المجتمع.',
  },

  roadmapsPage: {
    metaTitle: 'خرائط التعلّم',
    metaDesc:
      'ثلاثة مسارات تعلّم منظّمة في MLOps مبنية بالكامل على مصادر مجانية ومفتوحة المصدر — من الصفر إلى الجاهزية للعمل، ومن DevOps إلى MLOps، ومن المستوى المتوسط إلى الخبير.',
    eyebrow: 'خرائط التعلّم',
    titleBefore: 'اختر المسار الذي يناسب',
    accent: 'موقعك الحقيقي اليوم',
    leadBefore:
      'كل خريطة بالأسفل مبنية على مصادر مجانية ومفتوحة المصدر، لأن المعرفة الحقيقية في هذا المجال موجودة على GitHub ويوتيوب — لا خلف بوابات الدفع.',
    leadLinks: 'رابطًا مختارًا',
    leadAfter: 'في المجموع.',
    openRoadmap: 'افتح الخريطة',
    onThisPage: 'في هذه الصفحة',
    readOriginal: 'اقرأ النسخة الأصلية على لينكدإن',
    otherPaths: 'مسارات أخرى',
    englishNotice:
      'نص الخريطة الكامل بالأسفل منشور بالإنجليزية. النظرة العامة والمراحل وكل روابط المصادر تعمل بنفس الطريقة في النسختين.',
  },

  studentGuidesPage: {
    metaTitle: 'أدلة الدارسين',
    metaDesc:
      'أدلة عملية للدارسين من مجتمع MLOps MENA، مجمّعة في مكان واحد لمساعدة المتعلّمين.',
    eyebrow: 'أدلة الدارسين',
    titleBefore: 'أدلة متعمّقة لأدوات',
    accent: 'MLOps',
    lead: 'أدلة مطوّلة ومرقّمة يمكنك إكمالها من أولها إلى آخرها — كل أمر قابل للتنفيذ، وكل مثال جاهز للنسخ، وكل قسم مكتوب لمن يبدأ من الصفر.',
    statSections: 'قسمًا',
    emptyTitle: 'لم تُنشر أدلة بعد',
    emptyLead: 'ستظهر أدلة الدارسين هنا فور جاهزيتها.',
    searchLabel: 'ابحث في أدلة الدارسين',
    searchPlaceholder: 'ابحث بالعنوان أو الموضوع أو الوسم...',
    clearSearch: 'امسح البحث',
    noResultsTitle: 'لا توجد أدلة تطابق بحثك',
    noResultsLead: 'جرّب عنوانًا أو موضوعًا أو كلمة مفتاحية أخرى.',
    openGuide: 'اقرأ الدليل',
    englishGuide: 'دليل بالإنجليزية',
    backToGuides: 'العودة إلى أدلة الدارسين',
    onThisPage: 'في هذه الصفحة',
    searchGuide: 'ابحث في هذا الدليل',
    searchGuidePlaceholder: 'ابحث عن قسم...',
    noSectionResults: 'لا توجد أقسام تطابق بحثك.',
    readingProgress: 'تقدّم القراءة',
    copied: 'تم النسخ!',
    levelNav: 'مستوى الخبرة',
    trackNav: 'طريقة القراءة',
    levels: {
      beginner: 'مبتدئ',
      mid: 'متوسّط',
      senior: 'متقدّم',
    },
    tracks: {
      detailed: 'شرح مفصّل',
      interview: 'مراجعة المقابلات',
      tips: 'نصائح وحِيَل',
    },
    panePrevious: 'السابق',
    paneNext: 'التالي',
  },


  coursesPage: {
    metaTitle: 'الدورات',
    metaDesc:
      'دورات مجانية بنظام الدفعات في تشغيل التعلّم الآلي بالإنتاج — The MLOps Practitioner (جارية الآن) وLLMOps (قريبًا)، بالتعاون مع شريكنا التعليمي Zomra.',
    eyebrow: 'الدورات',
    titleBefore: 'دفعات دراسية مباشرة،',
    accent: 'ومجانية الانضمام',
    lead: 'مشاريع حقيقية ودروس مباشرة وشهادة في النهاية — نقدّمها بالتعاون مع شريكنا في المنصّة التعليمية',
    milestone: 'إنجاز',
    milestoneTitleAccent: '+1,200 دارس',
    milestoneTitleAfter: 'سجّلوا في دورة The MLOps Practitioner',
    milestoneLead:
      'الدفعة الأولى جارية الآن بتقييم 4.9 من أوائل المراجعات. الدفعة الثانية ودورتنا الثانية قيد التحضير بالفعل.',
    fullDetails: 'تفاصيل الدورة كاملة',
    enrolOnZomra: 'سجّل على Zomra',
    facts: {
      lessons: '5 دروس مباشرة تفاعلية',
      weeks: '7 أسابيع · 15 أغسطس ← 2 أكتوبر',
      groups: '4 مجموعات مذاكرة حسب المستوى',
      certificate: 'شهادة إتمام',
    },
    from: 'من',
    notifyWhenOpen: 'أبلغني عند فتح التسجيل',
    willCover: 'ما الذي ستغطّيه',
  },

  sessionsPage: {
    metaTitle: 'الجلسات',
    metaDesc:
      'جلسات مباشرة مجانية عن تشغيل التعلّم الآلي في الإنتاج — الجلسات القادمة مع التسجيل، والجلسات السابقة مع التسجيلات المرئية.',
    eyebrow: 'الجلسات',
    titleBefore: 'جلسات مباشرة،',
    accent: 'الحضور مجاني',
    lead: 'ممارسون يشرحون ما يشغّلونه فعلًا في الإنتاج. سجّل على Zomra، واحضر مباشرة، وشاهد التسجيل على يوتيوب بعدها.',
    upcoming: 'القادمة',
    whatIsCovered: 'ما الذي تغطّيه',
    getReminders: 'ذكّرني بالمواعيد',
    noneScheduled: 'لا توجد جلسات مجدولة حاليًا.',
    courseSessions: 'جلسات الدورة',
    courseTitleBefore: 'دروس دورة',
    courseTitleAccent: 'The MLOps Practitioner',
    courseLead: 'خمسة دروس مباشرة في الدفعة الأولى. ما بُثّ منها متاح على يوتيوب، والباقي مجدول.',
    courseDetails: 'تفاصيل الدورة',
    watchOnYoutube: 'شاهد على يوتيوب',
    past: 'الجلسات السابقة',
    sessionPage: 'صفحة الجلسة',
  },

  teamPage: {
    metaTitle: 'تعرّف على الفريق',
    metaDesc:
      'من يديرون مجتمع MLOps MENA — مؤسِّسة، ومديران للمجتمع، وستة محاور تغطّي التدريس والمحتوى والبحث والنمو والجلسات والمنصّة.',
    eyebrow: 'تعرّف على الفريق',
    titleBefore: 'من يديرون',
    accent: 'هذا المجتمع',
    leadAfter: 'ممارسًا يبقون الجلسات والدورات وخرائط التعلّم ومجموعات المذاكرة تعمل — كل ذلك مجانًا للمجتمع.',
    structure: 'كيف يُنظَّم الفريق',
    sixAxes: 'ستة محاور',
    joinTitleBefore: 'هل تريد',
    joinAccent: 'الانضمام إلى الفريق الأساسي؟',
    joinLead:
      'نبحث دائمًا عن ممارسين لتقديم الجلسات ومراجعة الأكواد وإرشاد الدارسين والمساعدة في إبقاء الجانب المجتمعي مجانيًا للجميع.',
    linkedinSoon: 'حساب لينكدإن قريبًا',
    email: 'البريد',
  },

  servicesPage: {
    metaTitle: 'الخدمات',
    metaDesc:
      'ما يقدّمه مجتمع MLOps MENA — إرشاد ودعم بحثي ومسارات تدريب مجانية للمجتمع، إضافة إلى توفير الكفاءات وتدريب الشركات في MLOps والذكاء الاصطناعي التوليدي وتنفيذ المشاريع البرمجية والاستشارات.',
    eyebrow: 'ماذا نقدّم',
    titleBefore: 'ما نقدّمه مجانًا،',
    accent: 'وما نقدّمه كخدمة',
    lead:
      'ننشر تعلّمًا مجانيًا لمهندسي مصر والمنطقة — جلسات وخرائط تعلّم ودورات وإرشاد. هذا الجانب مجاني وسيبقى كذلك. لكننا لسنا جمعية خيرية: نحن أيضًا جهة تقدّم خدمات. ندرّب مهندسيكم، ونوفّر لفرقكم كفاءات نتابع عملها بأنفسنا، ونبني البرمجيات ونطلقها. والعمل المدفوع هو ما يُبقي العمل المجاني قائمًا.',
    jumpCommunity: 'مجانًا للمجتمع',
    jumpCompanies: 'للشركات',

    communityEyebrow: 'مجانًا للمجتمع',
    communityTitleBefore: 'ما نردّه إلى',
    communityAccent: 'مصر والمنطقة',
    communityLead:
      'هذا هو الجزء الذي نقدّمه بلا مقابل. إنه إسهامنا في مجتمع المهندسين هنا، ولم يكن لأي بند في هذه القائمة ثمن يومًا.',
    communityNote:
      'الجلسات وخرائط التعلّم والمقالات ومجموعات المذاكرة ودعم المجتمع لا تكلّف شيئًا. يموّلها عمل الشركات بالأسفل — لا إعلانات، ولا باقات رعاية، ولا بوابة دفع تنتظرك بعد نقرتين.',
    membersRoute: 'للأعضاء: قنوات المجتمع هي أسرع طريق إلى أي من هذا.',
    joinWhatsapp: 'انضم إلى مجتمع واتساب',

    companiesEyebrow: 'للشركات',
    companiesTitleBefore: 'أربع طرق نعمل بها',
    companiesAccent: 'مع فريقكم',
    companiesLead:
      'الأشياء الأربعة التي تطلبها الشركات منّا فعليًا. ينفّذ كلًّا منها الممارسون أنفسهم الذين يقدّمون المحتوى المجاني.',
    enquire: 'استفسر عن هذه الخدمة',

    tracksEyebrow: 'مسارات التدريب',
    tracksTitleBefore: 'موضوعان،',
    tracksAccent: 'وثلاثة مسارات',
    tracksLead:
      'يقوم تدريب الشركات على موضوعين. MLOps مسار واحد؛ أما الذكاء الاصطناعي التوليدي فينقسم إلى RAG والأنظمة الوكيلة، لأن الفرق تحتاج أحدهما أولًا في الغالب.',
    covers: 'ما الذي يغطّيه',

    benchEyebrow: 'الفريق الذي ينفّذ العمل',
    benchTitleBefore: 'خبراء في',
    benchAccent: 'كل مرحلة',
    benchLead:
      'لا نُسند الأجزاء الصعبة إلى غيرنا. فريق التنفيذ داخلي وخبير في كل مرحلة يمرّ بها أي نظام في الإنتاج.',

    howEyebrow: 'كيف يبدأ العمل',
    howTitleBefore: 'من أول رسالة إلى',
    howAccent: 'مهندسين يعملون',

    getInTouch: 'تواصل معنا',
    contactTitleBefore: 'أخبرنا بما تحتاج',
    contactAccent: 'بناءه أو تدريب فريقك عليه',
    contactLead:
      'رسالة واحدة تكفي للبدء. أخبرنا بالمشكلة، والمنظومة التقنية، والموعد الذي تحتاجه تقريبًا.',
    companyTitle: 'الخدمات والتنفيذ',
    companyDesc: 'توفير الكفاءات، والمشاريع البرمجية، واستشارات MLOps.',
    trainingTitle: 'تدريب لفريقك',
    trainingDesc: 'مسارا MLOps والذكاء الاصطناعي التوليدي، على منظومتكم التقنية.',
    partnershipsTitle: 'الشراكات والمؤسِّسة',
    partnershipsDesc: 'الشراكات والرعاية وكل ما تفضّل أن تطرحه على المؤسِّسة مباشرة.',
    fundingNote:
      'كل تعاقد في هذه الصفحة يموّل الجلسات وخرائط التعلّم والإرشاد المجاني في بقية هذا الموقع.',
  },

  movedPage: {
    metaTitle: 'الإرشاد',
    metaDesc: 'انتقل الإرشاد إلى صفحة خدمات مجتمع MLOps MENA.',
    title: 'انتقلت صفحة الإرشاد',
    lead: 'الإرشاد والدعم البحثي ومسارات التدريب صارت كلها في صفحة واحدة مع بقية ما نقدّمه.',
    cta: 'انتقل إلى الخدمات',
    redirecting: 'ننقلك إليها الآن…',
  },

  articlesPage: {
    metaTitle: 'المقالات',
    metaDesc:
      'مقالات ينشرها مجتمع MLOps MENA على لينكدإن وميديوم — خرائط تعلّم، وممارسات التعلّم الآلي في الإنتاج، وإرشاد مهني.',
    eyebrow: 'المقالات',
    titleBefore: 'منشورة على',
    accent: 'لينكدإن وميديوم',
    lead: 'كل ما يكتبه المجتمع في مكان واحد. تابعنا على لينكدإن لتصلك المنشورات الجديدة أولًا بأول.',
    follow: 'تابعنا على لينكدإن',
    none: 'لم تُنشر مقالات بعد.',
    readItHere: 'اقرأها هنا',
    fullVersion: 'النسخة الكاملة هنا',
    moreTitle: 'مقالات أخرى في الطريق',
    moreLead: 'ننشر بانتظام على لينكدإن وميديوم. تابع الصفحة حتى لا يفوتك جديد.',
  },

  privacyPage: {
    metaTitle: 'سياسة الخصوصية',
    metaDesc:
      'ما البيانات التي يجمعها مجتمع MLOps MENA، ومدّة الاحتفاظ بها، وكيف نتعامل مع بيانات الدخول إلى الحسابات، وكيف تتواصل معنا بشأنها.',
    eyebrow: 'الخصوصية',
    titleBefore: 'ما نجمعه،',
    accent: 'وما لا نجمعه',
    lead: 'باختصار: الموقع لا يتتبّع شيئًا، ولا نحتفظ بأي بيانات شخصية عمّن يقرأون منشوراتنا. والتفصيل في الأسفل.',
    updated: 'آخر تحديث',
    contents: 'المحتويات',
  },

  faqPage: {
    metaTitle: 'الأسئلة الشائعة',
    metaDesc:
      'إجابات لأكثر ما يسأل عنه المجتمع — عن الدورة والتسجيلات والحضور وخرائط التعلّم وتخطّي العقبات. ومعها مادة الجلسة الأولى.',
    eyebrow: 'الأسئلة الشائعة',
    titleBefore: 'الأسئلة التي تصلنا',
    accent: 'كل أسبوع',
    lead: 'ظلّت نفس الأسئلة تصل في الرسائل، فجمعنا الإجابات هنا. وإن لم يكن سؤالك موجودًا، أرسله إلينا.',
    aboutCourse: 'عن الدورة',
    aboutCommunity: 'عن المجتمع',
    materialTitle: 'مادة الجلسة الأولى',
    materialLead:
      'مجانية ومفتوحة. الجلسة الأولى تبقى على يوتيوب بشكل دائم — أما الجلسات التالية فتُزال بعد 48 ساعة من كل جلسة.',
    slides: 'الشرائح',
    repo: 'مستودع الدورة',
    recordings: 'التسجيلات',
    notAnswered: 'سؤالك غير مُجاب عنه؟',
    sendIt: 'أرسله إلينا',
  },

  practitionerPage: {
    metaTitle: 'دورة The MLOps Practitioner',
    nextSession: 'الدرس القادم',
    enrolFree: 'سجّل مجانًا على Zomra',
    deliveredWith: 'نقدّمها بالتعاون مع شريكنا التعليمي',
    learnEyebrow: 'ماذا ستتعلّم',
    learnTitle: 'سبعة أهداف، كل واحد منها',
    learnAccent: 'مهارة قابلة للنشر',
    toolsTitle: 'الأدوات التي ستستخدمها فعلًا',
    courseEyebrow: 'عن الدورة',
    requirements: 'متطلبات الدورة',
    whoIsFor: 'لمن هذه الدورة',
    resourcesTitle: 'مصادر الدورة',
    resourcesLead: 'مجانية ومفتوحة. الجلسة الأولى تبقى على يوتيوب بشكل دائم.',
    linkSoon: 'الرابط قريبًا',
    outlineEyebrow: 'محتوى الدورة',
    outlineTitle: 'سبعة أسابيع،',
    outlineAccent: 'ينتهي كل منها بشيء أنجزته',
    week: 'الأسبوع',
    moduleProject: 'مشروع الوحدة',
    recordingsEyebrow: 'الدروس المباشرة',
    recordingsTitle: 'خمسة دروس،',
    recordingsAccent: 'مباشرة ثم على يوتيوب',
    groupsEyebrow: 'مجموعات المذاكرة',
    groupsTitle: 'أربع مجموعات.',
    groupsAccent: 'اختر حسب خبرتك، لا حسب مسمّاك.',
    groupsLead:
      'كل دارس ينضم إلى مجموعة مذاكرة على واتساب تناسب مستواه الحالي، حتى تكون الأسئلة والوتيرة ملائمة لموقعك الفعلي.',
    joinIfYouAre: 'انضم إن كنت',
    focus: 'المحاور',
    joinGroup: 'انضم إلى مجموعة',
    simpleRule: 'القاعدة البسيطة',
    faqEyebrow: 'أسئلة الدورة',
    faqTitle: 'الأسئلة التي',
    faqAccent: 'تصلنا كل أسبوع',
  },

  notFound: {
    title: 'هذه الصفحة لم تصل إلى الإنتاج',
    lead: 'الرابط معطوب أو انتقلت الصفحة. عُد إلى البداية وحاول من هناك.',
    back: 'العودة إلى الرئيسية',
  },
}

const dict = { en, ar }

export function t(lang: Lang) {
  return dict[lang]
}

export type Copy = typeof en
