/**
 * Arabic overlays for everything that lives in `data/*.ts` and `site.config.ts`.
 *
 * The English data files stay the single source of truth for structure, links,
 * dates and ordering — this module only swaps the human-readable strings when
 * the Arabic edition renders. Anything with no entry here falls back to English,
 * which is deliberate for tool names ("Docker", "MLflow", "vLLM") and for the
 * course/session titles students search for.
 */

import type { Lang } from './i18n'
import { stats, type StatId } from '~/site.config'
import type { Member } from '~/data/team'
import type { Session } from '~/data/sessions'
import type { RoadmapMeta } from './roadmaps'

/* ------------------------------------------------------------------ */
/* Homepage pillars                                                     */
/* ------------------------------------------------------------------ */

const pillarsAr: Record<string, { title: string; desc: string }> = {
  'Live sessions': {
    title: 'جلسات مباشرة',
    desc: 'جلسات منتظمة عن تشغيل التعلّم الآلي في الإنتاج، يقدّمها مهندسون يعملون به فعلًا. تُسجَّل وتُنشر مجانًا.',
  },
  'Learning roadmaps': {
    title: 'خرائط تعلّم',
    desc: 'ثلاثة مسارات منظّمة من الصفر إلى الجاهزية للعمل، مبنية بالكامل على مصادر مجانية ومفتوحة المصدر.',
  },
  'Open courses': {
    title: 'دورات مفتوحة',
    desc: 'دورات بنظام الدفعات مع دروس مباشرة ومشاريع حقيقية وشهادة — نقدّمها بالتعاون مع Zomra.',
  },
  'Research support': {
    title: 'دعم البحث العلمي',
    desc: 'مساعدة الباحثين في قابلية إعادة إنتاج النتائج والأدوات والجانب الهندسي من العمل القابل للنشر.',
  },
  Internships: {
    title: 'فرص تدريب',
    desc: 'مسارات للدخول إلى فرق حقيقية عبر شركائنا، ليتخرّج الطالب ومعه خبرة إنتاج فعلية.',
  },
  'A community that answers': {
    title: 'مجتمع يردّ عليك',
    desc: 'آلاف المهندسين في المنطقة يراجعون كودك، ويساعدونك على تخطّي العقبات، ويشاركون الفرص المتاحة.',
  },
}

export function tPillar(lang: Lang, p: { title: string; desc: string }) {
  return (lang === 'ar' && pillarsAr[p.title]) || p
}

/* ------------------------------------------------------------------ */
/* Stats                                                                */
/* ------------------------------------------------------------------ */

/** Keyed by the stable stat id, so renaming an English label cannot orphan it. */
const statLabelsAr: Record<StatId, string> = {
  whatsapp: 'عضو على واتساب',
  discord: 'عضو على ديسكورد',
  linkedin: 'متابع على لينكدإن',
  students: 'دارس في الدورات',
  'yt-views': 'مشاهدة على يوتيوب',
  'yt-subs': 'مشترك على يوتيوب',
}

export function tStatLabel(lang: Lang, id: StatId) {
  return (lang === 'ar' && statLabelsAr[id]) || englishStatLabel(id)
}

function englishStatLabel(id: StatId) {
  return stats.find((s) => s.id === id)?.label ?? id
}

/* ------------------------------------------------------------------ */
/* Sessions                                                             */
/* ------------------------------------------------------------------ */

type SessionCopy = Pick<Session, 'subtitle' | 'speakerRole'> & {
  note?: string
  topics?: string[]
}

export const sessionsAr: Record<string, SessionCopy> = {
  'mlops-practitioner-3-inference-serving': {
    subtitle: 'الاستدلال والتقديم واستراتيجيات الإصدار',
    speakerRole: 'مؤسِّسة مجتمع MLOps MENA ومهندسة MLOps أولى',
    note: 'الدرس الثالث من دورة The MLOps Practitioner المكوّنة من خمسة دروس. الدرسان الأول والثاني متاحان على يوتيوب إن كنت تلحق بالركب.',
    topics: [
      'التنسيق باستخدام Apache Airflow',
      'لماذا تهمّ أنماط الاستدلال',
      'أنماط الاستدلال الثلاثة',
      'ما هو تقديم النماذج',
      'FastAPI',
      'BentoML',
      'TensorRT + Triton',
      'ONNX Runtime + OpenVINO',
      'vLLM',
      'اختبار الحِمل باستخدام Locust',
      'استراتيجيات الإصدار',
    ],
  },
  'docker-deep-dive': {
    subtitle: 'Docker: أساس البناء لـ MLOps — اليوم الأول',
    speakerRole: 'مدرّب · خبرة أكثر من 3 سنوات',
    note: 'لا متطلبات سابقة — لا تحتاج خبرة مسبقة بـ Docker أو Kubernetes.',
    topics: [
      'المحاكاة الافتراضية مقابل الحاويات',
      'معمارية Docker',
      'الصور والحاويات',
      'الشبكات',
      'التخزين ووحدات التخزين',
      'كتابة ملف Dockerfile',
      'الأمان',
      'Docker Compose',
    ],
  },
  'hands-on-cicd-github-actions': {
    subtitle: 'اخرج بملف workflow جاهز تضعه في مستودعك في نفس اليوم، لا بمجرد ملاحظات',
    speakerRole: 'مهندس DevOps',
    note: 'يفترض معرفتك بفروع Git وأساسيات Bash وبناء صورة Docker ورفعها.',
    topics: [
      'كتابة ci.yml من الصفر',
      'المشغّلات والمهام والخطوات',
      'needs: وبناء المصفوفات',
      'المشغّلات المستضافة مقابل الذاتية',
      'الملفات الوسيطة والتخزين المؤقت',
      'الأسرار ونطاق GITHUB_TOKEN',
      'الشروط وبوابات الموافقة',
      'تثبيت الإجراءات على SHA',
      'Ruff وpre-commit',
    ],
  },
  'on-prem-mlops-playbook': {
    subtitle: 'الجسر بين DevOps التقليدي وأحمال الذكاء الاصطناعي الخاصة',
    speakerRole: 'شريك مؤسس ومدير تقني، DevisionX',
  },
}

export function tSession(lang: Lang, s: Session): Session {
  if (lang !== 'ar') return s
  const o = sessionsAr[s.slug]
  return o ? { ...s, ...o } : s
}

/* ------------------------------------------------------------------ */
/* Study groups                                                         */
/* ------------------------------------------------------------------ */

const studyGroupsAr: Record<number, { name: string; joinIf: string[] }> = {
  1: {
    name: 'مبتدئ في MLOps',
    joinIf: [
      'مبتدئ في التعلّم الآلي أو علم البيانات',
      'مرتاح مع Python وأساسيات التعلّم الآلي',
      'ما زلت جديدًا على Linux وGit وDocker',
      'ليست لديك خبرة نشر أو سحابة بعد',
      'تريد بدء MLOps من الصفر',
    ],
  },
  2: {
    name: 'متوسط في MLOps',
    joinIf: [
      'لديك خبرة في الواجهات الخلفية أو هندسة البرمجيات',
      'تعمل مع واجهات APIs أو FastAPI أو Flask',
      'متمكّن من Git وDocker',
      'لديك أساسيات النشر وCI/CD',
      'بدأت مع نماذج التعلّم الآلي وتريد تشغيلها في الإنتاج',
    ],
  },
  3: {
    name: 'MLOps متقدّم / سحابة',
    joinIf: [
      'خبرة عملية حقيقية بالسحابة — AWS أو GCP أو Azure',
      'قوي في Docker وCI/CD',
      'خبرة أو معرفة عملية بـ Kubernetes',
      'عملت مع البنية التحتية وTerraform والمراقبة',
      'تريد التعمّق في منصّات MLOps وأنظمة التعلّم الآلي القابلة للتوسّع',
    ],
  },
  4: {
    name: 'من DevOps إلى MLOps',
    joinIf: [
      'تعمل حاليًا في DevOps أو Platform أو Cloud أو SRE',
      'قوي في Linux وDocker وKubernetes وCI/CD والسحابة',
      'الفجوة ليست في Ops — بل في نصف التعلّم الآلي',
      'تريد الانتقال من DevOps إلى MLOps',
    ],
  },
}

export function tStudyGroup<T extends { n: number; name: string; joinIf: readonly string[] }>(
  lang: Lang,
  g: T,
) {
  if (lang !== 'ar') return g
  const o = studyGroupsAr[g.n]
  return o ? { ...g, ...o } : g
}

const groupRuleAr: Record<string, { you: string; group: string }> = {
  'ML Junior': { you: 'مبتدئ في التعلّم الآلي', group: 'مجموعة 1' },
  'Backend / Software Engineer': { you: 'مهندس برمجيات / واجهات خلفية', group: 'مجموعة 2' },
  'Cloud + Kubernetes + MLOps': { you: 'سحابة + Kubernetes + MLOps', group: 'مجموعة 3' },
  'DevOps / Platform Engineer': { you: 'مهندس DevOps / منصّات', group: 'مجموعة 4' },
}

export function tGroupRule(lang: Lang, r: { you: string; group: string }) {
  return (lang === 'ar' && groupRuleAr[r.you]) || r
}

export const groupRuleNoteAr =
  'الأهم من ذلك كله: اختر مجموعتك بناءً على خبرتك العملية الفعلية، لا على مسمّاك الوظيفي.'

/* ------------------------------------------------------------------ */
/* FAQ                                                                  */
/* ------------------------------------------------------------------ */

const faqsAr: Record<string, { q: string; a: string }> = {
  'Is it normal to feel lost as a junior or a student, and hear a lot of unfamiliar terms?': {
    q: 'هل من الطبيعي أن أشعر بالتيه كمبتدئ أو طالب، وأسمع مصطلحات كثيرة غير مألوفة؟',
    a: 'طبيعي تمامًا — وهذا يعني أن الجلسة أدّت دورها. لو بدا لك كل شيء مألوفًا في النهاية، لكان ذلك يعني أننا نكرّر أشياء سمعتها كثيرًا من قبل. الشعور بالإغراق هو أثر جانبي للخروج من الـ notebook واكتشاف كم أن هذا المجال أوسع مما تصوّرت. مبروك: هذا الشعور تقدّم.',
  },
  'How do I deal with all the new terminology?': {
    q: 'كيف أتعامل مع كل هذه المصطلحات الجديدة؟',
    a: 'دوّن كل مصطلح جديد تقابله. ثم اختر طريقك: ابحث عنه على يوتيوب — غالبًا ستجد شرحًا مكثّفًا جيدًا؛ واقرأ الدليل أو التوثيق الرسمي لتلك الأداة أو المفهوم؛ واطرح ما بقي غامضًا على المجتمع. ونحن نقدّم أيضًا جلسات مخصّصة للمشكلات التي تواجهكم، وسنشرح عددًا من هذه المصطلحات بالتفصيل في جلسة قادمة.',
  },
  'Will the course recordings stay available?': {
    q: 'هل تبقى تسجيلات الدورة متاحة؟',
    a: 'الجلسة الأولى تبقى بشكل دائم على قناتنا على يوتيوب. أما بقية الجلسات فتُزال بعد 48 ساعة من كل جلسة، لذا احرص على الحضور المباشر ما استطعت.',
  },
  'How long does the attendance form stay open?': {
    q: 'كم تبقى استمارة الحضور مفتوحة؟',
    a: 'حتى انتهاء الدورة بالكامل. ومادة الدورة تبقى متاحة أيضًا، ونعيد إرسالها حتى تتمكّن من المذاكرة ومراجعة ما تم شرحه.',
  },
  'Is the community really free?': {
    q: 'هل المجتمع مجاني فعلًا؟',
    a: 'نعم. الجلسات وخرائط التعلّم والمقالات ومجموعات المذاكرة ودعم المجتمع لا تكلّف شيئًا، ودوراتنا نقدّمها بالتعاون مع شريكنا التعليمي Zomra. لكننا لسنا جمعية خيرية: إلى جانب المجتمع نقدّم خدمات مدفوعة للشركات — تدريبًا وتوفير كفاءات وتنفيذ مشاريع برمجية واستشارات — وهذا العمل المدفوع هو ما يموّل الجانب المجاني. ولا ينقل ذلك محتوى المجتمع خلف بوابة دفع أبدًا.',
  },
  'Do I need a machine learning background to join?': {
    q: 'هل أحتاج خلفية في التعلّم الآلي للانضمام؟',
    a: 'لا تحتاجها للمجتمع ولا لخرائط التعلّم — خريطة «Basic MLOps Engineer» تبدأ من أساسيات البرمجة. أما دورة The MLOps Practitioner فتتوقّع منك أساسيات Python ونموذجًا واحدًا على الأقل سبق أن درّبته.',
  },
  'Which roadmap should I start with?': {
    q: 'بأي خريطة أبدأ؟',
    a: 'إن كنت جديدًا على المجال، ابدأ بخريطة Basic MLOps Engineer. وإن كنت تعمل بالفعل في DevOps أو SRE أو هندسة المنصّات، فاذهب مباشرة إلى خريطة الانتقال من DevOps إلى MLOps — يمكنك تخطّي معظم الأساسيات. وإن كنت تعمل في MLOps فعلًا، فخريطة الخبراء تساعدك على اختيار تخصّص.',
  },
  'I am a researcher — can the community help with my paper?': {
    q: 'أنا باحث — هل يستطيع المجتمع مساعدتي في بحثي؟',
    a: 'نعم. نساعد الباحثين في قابلية إعادة إنتاج النتائج والأدوات والجانب الهندسي من العمل القابل للنشر. اطرح مشكلتك في قنوات المجتمع.',
  },
}

export function tFaq<T extends { q: string; a: string }>(lang: Lang, f: T) {
  if (lang !== 'ar') return f
  const o = faqsAr[f.q]
  return o ? { ...f, ...o } : f
}

/* ------------------------------------------------------------------ */
/* Services & the upcoming course                                       */
/* ------------------------------------------------------------------ */

/**
 * Keyed by `id` across both `communityServices` and `companyServices` in
 * `data/services.ts` — the two arrays share one namespace here because they
 * render through the same card, and an id collision between them would be a
 * bug worth failing on rather than a case worth supporting.
 */
const servicesAr: Record<string, { title: string; blurb: string; items: string[] }> = {
  mentorship: {
    title: 'إرشاد للأعضاء',
    blurb: 'مساعدة فردية من مهندسين يمارسون هذا العمل، مجانًا لأعضاء المجتمع.',
    items: [
      'التوجيه المهني',
      'مراجعة الأعمال والمستودعات',
      'التحضير للمقابلات',
      'تخطّي مشكلة تقنية بعينها',
    ],
  },
  research: {
    title: 'دعم البحث العلمي',
    blurb: 'مساعدة الباحثين في الشقّ الهندسي من العمل القابل للنشر.',
    items: [
      'قابلية إعادة إنتاج النتائج وتتبّع التجارب',
      'إعداد الأدوات وبيئات العمل',
      'مراجعة هندسية قبل التقديم للنشر',
    ],
  },
  internships: {
    title: 'مسارات تدريب',
    blurb: 'توجيه الطلاب إلى فرص حقيقية لدى الشركات التي نعمل معها.',
    items: [
      'التعريف بالشركات الشريكة',
      'مراجعة أعمالك قبل التقديم',
      'خبرة إنتاج حقيقية، لا مشاريع تدريبية شكلية',
    ],
  },
  outsourcing: {
    title: 'توفير الكفاءات',
    blurb:
      'مهندسون من مجموعة كفاءاتنا يعملون ضمن فريقكم — مع فريق إشراف منّا يتابع العمل، لا وكالة ترسل سيرة ذاتية ثم تختفي.',
    items: [
      'مهندسو ذكاء اصطناعي وMLOps وDevOps وبرمجيات بعد تقييم دقيق',
      'يعملون داخل فريقكم وعلى منظومتكم التقنية ووفق دوراتكم',
      'مسؤول إشراف يتابع الإنتاجية والجودة أسبوعيًا',
      'بديل إن لم يكن الترشيح مناسبًا',
      'تعاقدات قصيرة أو ارتباطات طويلة المدى',
    ],
  },
  training: {
    title: 'تدريب لموظفيكم',
    blurb:
      'تدريب عملي للمهندسين الموجودين لديكم بالفعل، على مسارين: MLOps، والذكاء الاصطناعي التوليدي — شاملًا RAG والأنظمة الوكيلة.',
    items: [
      'مساران — MLOps والذكاء الاصطناعي التوليدي',
      'يُدرَّس على منظومتكم التقنية وحالات استخدامكم',
      'دفعات مباشرة قائمة على التطبيق العملي لا على الشرائح',
      'تقارير تقدّم لكل مهندس تصل إلى قائد الفريق',
      'حضوريًا في مصر أو عن بُعد عبر المنطقة',
    ],
  },
  projects: {
    title: 'تنفيذ المشاريع البرمجية',
    blurb:
      'فريق داخلي من الخبراء ينقل المشروع من التصميم المعماري إلى الإنتاج — كل المراحل مغطّاة، ولا يُحتسب مبتدئ بسعر خبير.',
    items: [
      'من الاستكشاف والتصميم المعماري حتى الإطلاق',
      'خبراء في الذكاء الاصطناعي وMLOps وDevOps والواجهات الخلفية والأمامية والاختبار والسحابة',
      'تسليم مع توثيق وخطوط CI/CD وأدلة تشغيل',
      'مشاريع بنطاق محدّد أو فريق مخصّص',
    ],
  },
  consultation: {
    title: 'استشارات MLOps',
    blurb: 'مساعدة عملية للفرق التي تنقل التعلّم الآلي إلى الإنتاج وتُبقيه يعمل.',
    items: [
      'تقييم نضج ممارسات MLOps',
      'استشارات معمارية',
      'مراجعة التكلفة والأداء',
      'دعم التوظيف وإجراء المقابلات التقنية',
    ],
  },
}

export function tService<T extends { id: string; title: string; blurb: string; items: readonly string[] }>(
  lang: Lang,
  o: T,
) {
  if (lang !== 'ar') return o
  const x = servicesAr[o.id]
  return x ? { ...o, ...x } : o
}

const tracksAr: Record<string, { title: string; summary: string; topics: string[] }> = {
  mlops: {
    title: 'MLOps',
    summary:
      'إخراج النموذج من الـ notebook وتشغيله في الإنتاج — الفجوة التي لا تكتشفها معظم الفرق إلا بعد أن يعمل النموذج.',
    topics: [
      'الحاويات وبيئات قابلة لإعادة الإنتاج',
      'تتبّع التجارب وسجلّات النماذج',
      'خطوط CI/CD للنماذج والمسارات',
      'الخدمة والتوسّع واستراتيجيات الإطلاق',
      'المراقبة والانحراف ومحفّزات إعادة التدريب',
      'ضبط التكلفة والأداء',
    ],
  },
  'genai-rag': {
    title: 'أنظمة RAG',
    summary: 'توليد معزّز بالاسترجاع يصمد أمام مستندات حقيقية ومستخدمين حقيقيين.',
    topics: [
      'التقطيع والتضمينات وقواعد المتجهات',
      'جودة الاسترجاع وإعادة الترتيب',
      'التقييم من دون بيانات مرجعية',
      'الإسناد والاستشهاد وضبط الهلوسة',
      'ميزانيات زمن الاستجابة وتكلفة الرموز',
      'التتبّع والمراقبة',
    ],
  },
  'genai-agentic': {
    title: 'الأنظمة الوكيلة',
    summary: 'وكلاء يستدعون الأدوات ويحتفظون بالحالة ويفشلون بأمان — مبنيّون للتشغيل لا للعرض.',
    topics: [
      'استدعاء الأدوات ومخطّطات الدوال',
      'التنسيق والتخطيط متعدّد الخطوات',
      'الذاكرة والحالة عبر الجولات',
      'حواجز الأمان والصلاحيات والمراجعة البشرية',
      'تقييم مسارات عمل الوكيل',
      'نشر الوكلاء ومراقبتهم في الإنتاج',
    ],
  },
}

export function tTrack<T extends { id: string; title: string; summary: string; topics: readonly string[] }>(
  lang: Lang,
  x: T,
) {
  if (lang !== 'ar') return x
  const a = tracksAr[x.id]
  return a ? { ...x, ...a } : x
}

const disciplinesAr: Record<string, string> = {
  ai: 'الذكاء الاصطناعي وتعلّم الآلة',
  mlops: 'MLOps وLLMOps',
  devops: 'DevOps وCI/CD',
  backend: 'الواجهات الخلفية',
  frontend: 'الواجهات الأمامية والتطوير الشامل',
  qa: 'ضمان الجودة والاختبار',
  cloud: 'السحابة والبنية التحتية',
}

export function tDiscipline<T extends { id: string; label: string }>(lang: Lang, d: T) {
  if (lang !== 'ar') return d
  const a = disciplinesAr[d.id]
  return a ? { ...d, label: a } : d
}

const stepsAr: Record<string, { title: string; desc: string }> = {
  scope: {
    title: 'أخبرنا بالمشكلة',
    desc: 'رسالة قصيرة تشرح ما تريد إطلاقه، والمنظومة التقنية، والإطار الزمني.',
  },
  call: {
    title: 'مكالمة واحدة',
    desc: 'نحدّد معًا إن كان المطلوب تدريبًا أو كفاءات أو تنفيذًا أو مراجعة — ونقولها بوضوح إن لم يكن أيًّا منها.',
  },
  proposal: {
    title: 'النطاق والعرض',
    desc: 'مهندسون بأسمائهم، ونطاق محدّد، وسعر. بلا عقود مفتوحة بلا نهاية.',
  },
  start: {
    title: 'البدء مع متابعة',
    desc: 'يبقى مسؤول إشراف منّا على التعاقد ويقدّم تقاريره عنه طوال مدته.',
  },
}

export function tStep<T extends { id: string; title: string; desc: string }>(lang: Lang, x: T) {
  if (lang !== 'ar') return x
  const a = stepsAr[x.id]
  return a ? { ...x, ...a } : x
}

export const upcomingCourseAr = {
  status: 'قريبًا',
  summary:
    'تشغيل أنظمة النماذج اللغوية الكبيرة وتقييمها وخدمتها في الإنتاج — النصف التشغيلي من الذكاء الاصطناعي التوليدي الذي لا يكاد أحد يعلّمه.',
  topics: [
    'خدمة النماذج بإنتاجية عالية عبر vLLM',
    'معمارية RAG وجودة الاسترجاع',
    'التقييم من دون بيانات مرجعية',
    'التتبّع والمراقبة عبر Langfuse',
    'ميزانيات التكلفة والزمن (Tokens & Latency)',
    'حواجز الأمان وتصفية المخرجات',
  ],
}

/* ------------------------------------------------------------------ */
/* Team                                                                 */
/* ------------------------------------------------------------------ */

const teamAr: Record<string, { role: string; bio: string }> = {
  'Aya Nasser Salama': {
    role: 'المؤسِّسة',
    bio: 'مهندسة MLOps وLLMOps أولى بخبرة تتجاوز 6 سنوات في الذكاء الاصطناعي. في Unifonic هي المرجع المركزي لدعم MLOps/LLMOps عبر فرق الذكاء الاصطناعي — منتجات وكيلة باستخدام LangGraph وMCP، وتقييم ومراقبة النماذج اللغوية، وخدمة نماذج تتجاوز 30 مليار معامل على Kubernetes. صمّمت وتدرّس مادة «Production ML Engineering» في ITI، وبنت أول نظام RAG إنتاجي في Valeo.',
  },
  'Basem Abusaif': {
    role: 'مدير المجتمع',
    bio: 'مهندس ذكاء اصطناعي يعمل على الإدراك ثلاثي الأبعاد والذكاء الاصطناعي التوليدي، بخبرة تتجاوز 5 سنوات في بناء مسارات التعلّم العميق للأنظمة ذاتية القيادة. يقود منظومة الإدراك ثلاثي الأبعاد في Wakeb Data، وسبق أن نقل نماذج محاكاة LiDAR إلى الإنتاج في Valeo. يُنهي حاليًا الماجستير في المعلوماتية بجامعة النيل.',
  },
  'Omar Salah': {
    role: 'مدير المجتمع',
    bio: 'يشارك في إدارة المجتمع يومًا بيوم — الجلسات ومجموعات المذاكرة وإبقاء البرنامج ماضيًا في طريقه.',
  },
  'Mohamed Samy Mansour': {
    role: 'مسؤول محور التدريس',
    bio: 'مهندس ذكاء اصطناعي وعلم بيانات بخلفية هندسة حاسبات من جامعة المنصورة. عالم بيانات بمستوى متوسط في مجموعة الأندلسية الطبية، وسبق أن عمل مهندس ذكاء اصطناعي وعلم بيانات في اتصالات مصر، عبر مسارات التعلّم الآلي وخدمة النماذج وتطبيقات LLM/RAG.',
  },
  'Zakaria Ahmed': {
    role: 'مسؤول محور المحتوى',
    bio: 'يتولّى المحتوى المكتوب للمجتمع — خرائط التعلّم والمقالات والمادة التي تصاحب كل جلسة.',
  },
  'Khadija Ahaidous': {
    role: 'مسؤولة محور البحث',
    bio: 'تقود اتجاه البحث في المجتمع — الأوراق التي نقرأها والعمل الذي ننشره والإرشاد الأكاديمي المصاحب لهما.',
  },
  'Radwa Khattab': {
    role: 'مسؤولة محور نمو المجتمع والشراكات',
    bio: 'مهندسة ذكاء اصطناعي أولى بخبرة تتجاوز 6 سنوات، منها عامان في مايكروسوفت كعالمة بيانات وتطبيقات، في بناء أنظمة ذكاء اصطناعي إنتاجية تشمل النماذج اللغوية والذكاء الوكيل والبنية السحابية. تدرس الماجستير في الذكاء الاصطناعي بجامعة القاهرة، ودرّست الذكاء الاصطناعي والتعلّم الآلي في جامعتين وفي Udacity.',
  },
  'Mariam Qotob': {
    role: 'مسؤولة محور الجلسات والإرشاد',
    bio: 'مهندسة ذكاء اصطناعي وتعلّم آلي حاصلة على ماجستير مهني في الذكاء الاصطناعي من جامعة Queen’s، تعمل عبر مسار التعلّم الآلي كاملًا بخبرة تطبيقية في النماذج اللغوية وRAG. تعمل حاليًا معيدة في مبادرة Digilians.',
  },
  'Mahmoud Abu Al-Nour': {
    role: 'مسؤول محور المنصّة ووسائل التواصل',
    bio: 'طالب علوم حاسب مهتم بالذكاء الاصطناعي والتعلّم الآلي وعلم البيانات. يبني حلولًا عملية باستخدام Python وSQL وFastAPI وDocker وأدوات MLOps، ويحوّل الأفكار إلى مشاريع حقيقية.',
  },
}

export function tMember<T extends Member>(lang: Lang, m: T): T {
  if (lang !== 'ar') return m
  const o = teamAr[m.name]
  return o ? { ...m, ...o } : m
}

export const teamSummaryAr = 'مؤسِّسة، ومديران للمجتمع، وستة محاور.'

/* ------------------------------------------------------------------ */
/* Articles                                                             */
/* ------------------------------------------------------------------ */

/** Keyed by ExternalArticle.id — a title is editorial and will change. */
export const articlesAr: Record<string, { title: string; description: string }> = {
  'tokenization-how-llms-turn-text-something-can-process-mlops-mena': {
    title: 'التقطيع إلى رموز: كيف يحوّل النموذج اللغوي النص إلى شيء يستطيع معالجته',
    description:
      'تكتب جملة وتفترض أن النموذج يستقبلها كما كتبتها. هذا لا يحدث. ما الذي يجري على النص فعليًا قبل أن يراه النموذج أصلًا.',
  },
  'introduction-large-language-models-understanding-foundation': {
    title: 'مقدّمة في النماذج اللغوية الكبيرة: أساس الذكاء الاصطناعي الحديث',
    description:
      'ما هو النموذج اللغوي الكبير فعلًا، ولماذا توصف هذه النماذج بـ«الكبيرة» — المقال التأسيسي، قبل التقطيع إلى رموز وكل ما يُبنى فوقه.',
  },
  'mlops-roadmap-seniors': {
    title: 'خريطة MLOps للخبراء',
    description:
      'سبعة تخصّصات — LLMOps، وتحسين النماذج، وKubernetes في الإنتاج، والمراقبة المتقدّمة، واختبار الأداء والحِمل، وتصميم أنظمة التعلّم الآلي، والمهارات الشخصية. اختر اثنين أو ثلاثة وتعمّق فيها.',
  },
  'devops-mlops-transition-roadmap': {
    title: 'خريطة الانتقال من DevOps إلى MLOps',
    description:
      'أنت تملك بالفعل 60–70% من المهارات المطلوبة. هذه الخريطة تضيف طبقة التعلّم الآلي فوقها فقط — أسرع تحوّل مهني في مجال التقنية، في خمس مراحل خلال ثلاثة إلى خمسة أشهر.',
  },
  'basic-mlops-engineer-roadmap': {
    title: 'خريطة مهندس MLOps المبتدئ',
    description:
      'الخريطة التي كنت سأعطيها لنفسي في البداية — خمس مراحل على مدى ستة إلى تسعة أشهر، مبنية بالكامل على مصادر مجانية ومفتوحة المصدر، لأن المعرفة الحقيقية في هذا المجال موجودة على GitHub ويوتيوب.',
  },
}

export function tArticle<T extends { id: string; title: string; description: string }>(
  lang: Lang,
  a: T,
) {
  if (lang !== 'ar') return a
  const o = articlesAr[a.id]
  return o ? { ...a, ...o } : a
}

/* ------------------------------------------------------------------ */
/* Repositories                                                         */
/* ------------------------------------------------------------------ */

const reposAr: Record<string, string> = {
  website: 'شفرة هذا الموقع — Next.js وتصدير ثابت، مفتوحة للقراءة والاشتقاق.',
}

export function tRepo<T extends { name: string; desc: string | null }>(lang: Lang, r: T) {
  if (lang !== 'ar') return r
  const o = reposAr[r.name]
  return o ? { ...r, desc: o } : r
}

/* ------------------------------------------------------------------ */
/* Partners                                                             */
/* ------------------------------------------------------------------ */

const partnersAr: Record<string, { role: string; blurb: string }> = {
  Zomra: {
    role: 'شريك المنصّة التعليمية',
    blurb:
      'دوراتنا وجلساتنا المجانية تُستضاف وتُقدَّم على Zomra، ما يمنح كل دارس في المنطقة مكانًا منظّمًا للتسجيل والمتابعة وقياس تقدّمه.',
  },
}

export function tPartner<T extends { name: string; role: string | null; blurb: string | null }>(
  lang: Lang,
  p: T,
) {
  if (lang !== 'ar') return p
  const o = partnersAr[p.name]
  return o ? { ...p, ...o } : p
}

/* ------------------------------------------------------------------ */
/* Roadmap metadata                                                     */
/* ------------------------------------------------------------------ */

type RoadmapCopy = {
  title: string
  tagline: string
  level: string
  duration: string
  commitment: string
  audience: string
  /**
   * Keyed by the English heading label ("Phase 0", "Specialization 3"), NOT by
   * position. Positional matching silently mistranslated every later phase the
   * moment a phase was inserted into the markdown; a missing key is loud.
   */
  phases: Record<string, string>
}

export const roadmapsAr: Record<string, RoadmapCopy> = {
  'basic-mlops-engineer': {
    title: 'خريطة مهندس MLOps المبتدئ',
    tagline: 'من الصفر إلى الجاهزية للعمل',
    level: 'مبتدئ ← جاهز للعمل',
    duration: '6–9 أشهر',
    commitment: '10–15 ساعة أسبوعيًا',
    audience: 'للطلاب ومهندسي التعلّم الآلي ومهندسي البرمجيات وعلماء البيانات الداخلين إلى مجال MLOps.',
    phases: {
      'Phase 0': 'الأساسيات',
      'Phase 1': 'هندسة البرمجيات للتعلّم الآلي',
      'Phase 2': 'جوهر MLOps',
      'Phase 3': 'أساسيات السحابة',
      'Phase 4': 'المراقبة الأساسية',
    },
  },
  'devops-to-mlops': {
    title: 'خريطة الانتقال من DevOps إلى MLOps',
    tagline: 'أسرع تحوّل مهني في مجال التقنية',
    level: 'DevOps ← MLOps',
    duration: '3–5 أشهر',
    commitment: '10–15 ساعة أسبوعيًا',
    audience: 'لمهندسي DevOps وSRE والمنصّات والبنية التحتية المنتقلين إلى التعلّم الآلي.',
    phases: {
      'Phase 1': 'سدّ فجوة Python والتعلّم الآلي',
      'Phase 2': 'تعلّم أدوات التعلّم الآلي',
      'Phase 3': 'حيث تتألّق مهاراتك في DevOps',
      'Phase 4': 'مفاهيم MLOps التي لن تعرفها',
      'Phase 5': 'تخصّص اختياري: LLMOps',
    },
  },
  'senior-mlops-engineer': {
    title: 'خريطة MLOps للخبراء',
    tagline: 'العمق وتفكير الأنظمة ومقياس الإنتاج',
    level: 'متوسط ← خبير',
    duration: 'مستمرة',
    commitment: 'اختر 2–3 تخصّصات',
    audience: 'لمهندسي MLOps في المستويين المبتدئ والمتوسط الراغبين في الوصول إلى مستوى الخبير.',
    phases: {
      'Specialization 1': 'LLMOps',
      'Specialization 2': 'تحسين النماذج',
      'Specialization 3': 'Kubernetes في الإنتاج والأنظمة الموزّعة',
      'Specialization 4': 'المراقبة المتقدّمة',
      'Specialization 5': 'اختبار الأداء والحِمل',
      'Specialization 6': 'تصميم أنظمة التعلّم الآلي',
      'Specialization 7': 'المهارات الشخصية',
    },
  },
}

export function tRoadmap(lang: Lang, r: RoadmapMeta): RoadmapMeta {
  if (lang !== 'ar') return r
  const o = roadmapsAr[r.slug]
  if (!o) return r
  return {
    ...r,
    title: o.title,
    tagline: o.tagline,
    level: o.level,
    duration: o.duration,
    commitment: o.commitment,
    audience: o.audience,
    // Keep the original `when` and the anchor-generating English label; only the
    // human-readable phase name is translated. Looked up BY that label.
    phases: r.phases.map((p) => ({ ...p, title: o.phases[p.label] ?? p.title })),
  }
}

/** Arabic label for a "Phase 1" / "Specialization 3" heading. */
export function tPhaseLabel(lang: Lang, label: string) {
  if (lang !== 'ar') return label
  const m = label.match(/^(Phase|Specialization)\s+(\d+)$/)
  if (!m) return label
  return `${m[1] === 'Phase' ? 'المرحلة' : 'التخصّص'} ${m[2]}`
}

/* ------------------------------------------------------------------ */
/* The MLOps Practitioner course                                        */
/* ------------------------------------------------------------------ */

export const courseAr = {
  status: 'الدفعة الأولى · جارية الآن',
  format: '5 دروس مباشرة تفاعلية · 7 أسابيع · 15 أغسطس ← 2 أكتوبر · مجانًا',
  summary:
    'بنهاية هذه الدورة سينقل الدارس نموذج تعلّم آلي من الـ notebook إلى الإنتاج — ببناء مسارات CI/CD آلية، وتتبّع للتجارب، وإعادة تدريب مجدولة. وسيقدّم التنبؤات على نطاق واسع باستخدام FastAPI وBentoML وTriton وvLLM، ويرصد الانحراف قبل أن يلاحظه المستخدمون، ويحسّن النماذج لوحدات GPU وCPU والأجهزة الطرفية. وسيفكّر ويعمل كمهندس تعلّم آلي إنتاجي.',
  facts: [
    { label: 'دروس مباشرة', value: '5' },
    { label: 'المدة', value: '7 أسابيع' },
    { label: 'تُقام', value: '15 أغسطس ← 2 أكتوبر' },
    { label: 'السعر', value: 'مجانًا' },
  ],
  instructorRole: 'مؤسِّسة مجتمع MLOps MENA ومهندسة MLOps أولى',
  nextLessonDateLabel: 'الأحد 23 أغسطس · 7:00 مساءً بتوقيت القاهرة',
  objectives: [
    'هيكلة مشاريع التعلّم الآلي باحتراف باستخدام حزم Python والبرمجة الكائنية وتلميحات الأنواع، وبناء واجهات REST بمستوى إنتاجي عبر FastAPI أو Litestar — داخل حاويات Docker ومختبرة بـ pytest',
    'تتبّع التجارب وإصدار نسخ البيانات وإدارة دورة حياة النموذج عبر MLflow وDVC — وأتمتة مسار التدريب ← الاختبار ← البناء ← الرفع بالكامل عبر GitHub Actions وTerraform',
    'بناء مسارات تدريب مستمر تعيد التدريب والتقييم وترقّي النماذج إلى الإنتاج تلقائيًا عند انحراف البيانات أو تراجع الأداء — من دون تدخّل بشري',
    'اختيار نمط الاستدلال المناسب وخدمة النماذج في الإنتاج عبر المنظومة الكاملة: FastAPI ← BentoML ← TensorRT/Triton لوحدات GPU ← ONNX Runtime/OpenVINO لوحدات CPU ← vLLM للنماذج اللغوية',
    'إطلاق النماذج بأمان عبر النشر التدريجي واختبار A/B والنشر الأزرق/الأخضر ووضع الظل — مع تراجع تلقائي عند تدهور المؤشرات',
    'رصد انحراف البيانات والمفهوم والتسميات والتضمينات عبر PSI واختبار KS وPage-Hinkley وMMD — ومراقبة أنظمة الإنتاج بـ Prometheus وGrafana وLangfuse وRAGAS',
    'تحسين النماذج المدرَّبة عبر التقليم والتكميم (PTQ وQAT) وتقطير المعرفة وTensorRT وOpenVINO وTFLite — مع قياس المفاضلة بين الدقة والزمن والحجم في كل خطوة',
  ],
  includes: [
    '5 دروس مباشرة تفاعلية',
    'وصول دائم إلى كل مواد الدورة',
    'مجتمع من الزملاء',
    'شهادة إتمام',
  ],
  requirements: [
    'معرفة أساسية ببرمجة Python — أن تكون مرتاحًا في كتابة الدوال والأصناف والعمل مع مكتبات مثل pandas وscikit-learn',
    'إلمام بمفاهيم التعلّم الآلي — أن تكون قد درّبت نموذجًا واحدًا على الأقل من قبل (انحدار خطي، تصنيف، إلخ)',
    'حاسوب محمول عليه Docker وذاكرة 8 جيجابايت على الأقل — وكل الأدوات المستخدمة مجانية ومفتوحة المصدر',
  ],
  audience: [
    'مهندسو التعلّم الآلي وعلماء البيانات القادرون على تدريب النماذج لكنهم يتعثّرون في نشرها وصيانتها في الإنتاج',
    'مهندسو البرمجيات ومهندسو DevOps المنتقلون إلى MLOps أو أدوار بنية الذكاء الاصطناعي، الباحثون عن مسار منظّم وعملي',
    'القادة التقنيون والمعماريون الذين يحتاجون فهم منظومة الإنتاج كاملة لاتخاذ قرارات أفضل بشأن الأدوات والبنية التحتية',
  ],
  description: {
    hook: 'معظم مهندسي التعلّم الآلي يعرفون كيف يدرّبون نموذجًا. وقليلون جدًا يعرفون كيف يشغّلونه في الإنتاج.',
    body: [
      'تسدّ هذه الدورة الفجوة بين علم البيانات وهندسة الإنتاج. ستأخذ نموذج تعلّم آلي من دفتر بحثي وصولًا إلى نظام إنتاجي حيّ ومراقَب ويعيد تدريب نفسه تلقائيًا — خطوة بخطوة، بكود حقيقي وأدوات حقيقية تستخدمها شركات مثل Uber وSpotify وMeta وNetflix.',
    ],
    learnIntro: 'عبر 5 جلسات ستتعلّم كيف:',
    learn: [
      'تحزّم كود التعلّم الآلي باحتراف وتبني واجهات REST بـ FastAPI وLitestar — داخل حاويات Docker ومختبرة بـ pytest',
      'تتبّع التجارب بـ MLflow، وتصدر نسخ البيانات بـ DVC، وتؤتمت مسارك بالكامل عبر GitHub Actions وTerraform',
      'تنسّق إعادة التدريب بـ Apache Airflow، وتخدم النماذج على نطاق واسع عبر BentoML وTriton وvLLM، وتطلقها بأمان عبر النشر التدريجي ووضع الظل',
      'تراقب نماذج الإنتاج بحثًا عن انحراف البيانات والمفهوم والتضمينات عبر Evidently AI وPrometheus وGrafana وLangfuse',
      'تحسّن النماذج سرعةً وحجمًا عبر التقليم والتكميم وتقطير المعرفة وTensorRT وOpenVINO — وتقيس كل مفاضلة',
    ],
    outro:
      'كل جلسة تنتهي بمشروع قابل للنشر يبني على ما قبله. وبنهاية الدورة سيكون لديك ملف أعمال MLOps كامل يثبت مهارات هندسة إنتاج حقيقية.',
  },
  resources: {
    'Course repository': { label: 'مستودع الدورة', desc: 'كل الأكواد والدفاتر ومشاريع الوحدات.' },
    'All session slides': {
      label: 'شرائح كل الجلسات',
      desc: 'مجلد Google Drive يحوي شرائح الجلسات الخمس.',
    },
    'Session 1 slides': { label: 'شرائح الجلسة الأولى', desc: 'رابط مباشر إلى عرض الجلسة الأولى.' },
    'Mini projects & final project': {
      label: 'المشاريع المصغّرة والمشروع النهائي',
      desc: 'كتيّب PDF يغطّي كل مشاريع الوحدات والمشروع النهائي.',
    },
    'Session recordings': { label: 'تسجيلات الجلسات', desc: 'الدروس المباشرة الخمسة على يوتيوب.' },
  } as Record<string, { label: string; desc: string }>,
  /** Week notes and module projects. Keyed by week number. */
  outline: {
    1: {
      project: 'واجهة API لنموذج تعلّم آلي داخل حاوية بالكامل، مع مجموعة اختبارات وسجلّات منظّمة وملف README من ثلاثة أوامر.',
    },
    2: {
      project:
        'مسار مؤتمت بالكامل تُطلقه GitHub Actions — يدرّب ويقيّم مقابل نسخة الإنتاج ولا يرقّي إلا إذا تحسّنت المؤشرات، ثم يبني صورة Docker. كل تشغيل في MLflow، وكل إصدار بيانات في DVC.',
    },
    3: {
      title: 'النصف الأول من المشروع (تنفيذ ومراجعة)',
      note: 'لا محاضرة. ابدأ العمل على مشروعك المختار وطبّق المبادئ من المحاضرتين الأوليين.',
    },
    4: {
      project:
        'قدّم نموذج مدة الرحلة بثلاث طرق، واختبر الحِمل حتى 100 مستخدم متزامن، ووثّق عنق الزجاجة، ثم انشر إصدارًا جديدًا عبر نشر تدريجي مع تراجع تلقائي.',
    },
    7: {
      title: 'المشروع النهائي',
      note: 'أنجز المشروع من طرفه إلى طرفه، واعرضه على المجتمع، واحصل على مراجعة للمستودع.',
    },
  } as Record<number, { title?: string; project?: string; note?: string }>,
}

export function tCourseResource(lang: Lang, r: { label: string; desc: string }) {
  if (lang !== 'ar') return r
  return courseAr.resources[r.label] ?? r
}

/* ------------------------------------------------------------------ */
/* Translation coverage                                                 */
/* ------------------------------------------------------------------ */

/**
 * Whether an item has an Arabic overlay.
 *
 * A sibling predicate rather than a field on what `tSession`/`tArticle` return:
 * those are generic over their argument, and widening the return type would
 * ripple through every call site's inference.
 *
 * Used to show a small "in English" marker on /ar, so a reader is not left
 * wondering why one card switched language. Scoped to body copy on purpose —
 * English is deliberate for tool names and course titles, and badging those
 * would be pure noise.
 */
export function isTranslated(kind: 'session' | 'article' | 'roadmap', key: string): boolean {
  if (kind === 'session') return key in sessionsAr
  if (kind === 'article') return key in articlesAr
  return key in roadmapsAr
}
