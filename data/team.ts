/**
 * Core team: one founder, two community directors, six owned axes.
 *
 * PRIVACY NOTE — personal emails are stored here but are deliberately NOT
 * rendered on the site. These are private Gmail/Hotmail addresses, and this is
 * a public, search-indexed page; publishing them invites scraping and spam for
 * eight people. LinkedIn is shown instead. To publish them anyway, set
 * SHOW_TEAM_EMAILS to true below. Better still: once mlopsmena.com is live,
 * give everyone a role address and swap those in.
 */

export const SHOW_TEAM_EMAILS = true

export type Member = {
  name: string
  role: string
  initials: string
  /** Path under /public. Empty → initials avatar. */
  photo: string
  bio: string
  linkedin: string
  email: string
}

export const founder: Member = {
  name: 'Aya Nasser Salama',
  role: 'Founder',
  initials: 'AN',
  photo: '/team/aya-nasser-salama.jpg',
  bio: 'Senior MLOps & LLMOps Engineer with 6+ years in AI. At Unifonic she is the central MLOps/LLMOps support across AI teams — agentic products with LangGraph and MCP, LLM evaluation and observability, and 30B+ model serving on Kubernetes. She designed and teaches "Production ML Engineering" at ITI, and built Valeo\'s first production RAG system.',
  linkedin: 'https://www.linkedin.com/in/ayanasser/',
  email: 'aya.nasser.mohammed@gmail.com',
}

export const directors: Member[] = [
  {
    name: 'Basem Abusaif',
    role: 'Community Director',
    initials: 'BA',
    photo: '/team/basem-abusaif.jpg',
    bio: 'AI Engineer working on 3D perception and generative AI, with 5+ years building deep learning pipelines for autonomous systems. Leads the 3D perception stack at Wakeb Data and previously productionised LiDAR simulation models at Valeo. Completing an MSc in Informatics at Nile University.',
    linkedin: 'https://www.linkedin.com/in/basem-mahmoud-abusaif/',
    email: 'mbasem245@gmail.com',
  },
  {
    name: 'Omar Salah',
    role: 'Community Director',
    initials: 'OS',
    photo: '/team/omar-salah.jpg',
    // TODO: replace with Omar's own bio — this describes the role, not the person.
    bio: 'Co-runs the community day to day — sessions, study groups, and keeping the programme moving.',
    linkedin: 'https://www.linkedin.com/in/itsomarsalah26/',
    email: 'OShemied@gmail.com',
  },
]

/** The six owned axes, in order. */
export const leads: (Member & { axis: number })[] = [
  {
    axis: 1,
    name: 'Mohamed Samy Mansour',
    role: 'AI Instructor Lead',
    initials: 'MS',
    photo: '/team/mohamed-samy.jpg',
    bio: 'AI and Data Science engineer with a Computer Engineering background from Mansoura University. Mid-Level Data Scientist at Andalusia Healthcare Group, previously AI & Data Science Engineer at Etisalat Misr, working across ML pipelines, model serving, and LLM/RAG applications.',
    linkedin: 'https://www.linkedin.com/in/mohamed-samy-122137189',
    email: 'mohamed.samy.2248369@gmail.com',
  },
  {
    axis: 2,
    name: 'Zakaria Ahmed',
    role: 'AI Content Lead',
    initials: 'ZA',
    // TODO: no photo supplied yet — drop one at /public/team/zakaria-ahmed.jpg
    // and set the path here.
    photo: '',
    // TODO: replace with Zakaria's own bio — this describes the role.
    bio: 'Owns the community\'s written content — roadmaps, articles, and the material that goes out with every session.',
    linkedin: 'https://www.linkedin.com/in/zakaria-ahmed-70387525a',
    email: 'zakariaahme29@gmail.com',
  },
  {
    axis: 3,
    name: 'Adham AbdelAzeem',
    role: 'AI Research Lead',
    initials: 'AA',
    photo: '/team/adham-abdelazeem.jpg',
    // TODO: replace with Adham's own bio — this describes the role.
    bio: 'Leads the research track — supporting members with papers, reproducibility, and the engineering behind publishable work.',
    linkedin: 'https://www.linkedin.com/in/adham-abdelazeem/',
    email: '',
  },
  {
    axis: 4,
    name: 'Radwa Khattab',
    role: 'AI Community Growth & Partnerships Lead',
    initials: 'RK',
    photo: '/team/radwa-khattab.jpg',
    bio: 'Senior AI Engineer with 6+ years of experience, including two years at Microsoft as an Applied & Data Scientist, building production AI/ML systems across LLMs, agentic AI, and cloud infrastructure. Pursuing a Master\'s in AI at Cairo University, and has taught AI/ML at two universities and Udacity.',
    linkedin: 'https://www.linkedin.com/in/radwask/',
    email: 'RadwaSM@hotmail.com',
  },
  {
    axis: 5,
    name: 'Mariam Qotob',
    role: 'AI Sessions & Mentorship Lead',
    initials: 'MQ',
    photo: '/team/mariam-qotob.jpg',
    bio: 'AI/ML engineer with a professional master\'s in AI from Queen\'s University, working across the full machine learning pipeline with applied experience in LLMs and RAG. Currently a Teaching Assistant for the Digilians Initiative.',
    linkedin: 'https://www.linkedin.com/in/mariamqotob/',
    email: 'mariamabdeltawab18@gmail.com',
  },
  {
    axis: 6,
    name: 'Mahmoud Abu Al-Nour',
    role: 'AI Platform Lead',
    initials: 'MA',
    photo: '/team/mahmoud-abu-alnour.jpg',
    bio: 'Computer Science student focused on AI, Machine Learning, and Data Science. Builds practical AI solutions with Python, SQL, FastAPI, Docker, and MLOps tooling, turning ideas into real projects.',
    linkedin: 'https://www.linkedin.com/in/mahmoud-abu-al-nour',
    email: 'mahmoudapoalnor9@gmail.com',
  },
]

export const teamSummary = 'One founder, two directors, six owned axes.'
export const teamCount = 1 + directors.length + leads.length
