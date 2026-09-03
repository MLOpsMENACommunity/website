/**
 * The privacy policy, in both editions.
 *
 * This is a binding public commitment, and it is what LinkedIn, Google and Meta
 * read when reviewing our API applications — every one of them refuses review
 * without a reachable policy URL. So it lives in data rather than in a CMS: it
 * is reviewed in a pull request, and its history is the git history.
 *
 * **Keep it true.** Every claim below describes what MLOps MENA Studio
 * (studio.mlopsmena.com) actually does. If the system changes, this changes in
 * the same commit — a policy that drifts from the software is worse than none,
 * because it is a promise we are quietly breaking.
 *
 * The retention periods in §7 were chosen deliberately and are longer than
 * strict data minimisation would suggest. That was a considered governance
 * decision, not an oversight.
 */

export type PolicyBlock =
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'table'; head: [string, string]; rows: [string, string][] }
  | { kind: 'note'; text: string }

export interface PolicySection {
  id: string
  heading: string
  blocks: PolicyBlock[]
}

/** Bumped whenever the substance changes, so people can tell versions apart. */
export const policyUpdated = '2026-08-29'

const en: PolicySection[] = [
  {
    id: 'who-we-are',
    heading: '1. Who we are',
    blocks: [
      {
        kind: 'p',
        text: 'MLOps MENA Community is an educational community and a services business. We publish free MLOps and AI learning for engineers across the Middle East and North Africa, and we provide paid training, talent outsourcing, software delivery and consultation to companies.',
      },
      {
        kind: 'ul',
        items: [
          'Website: https://mlopsmena.com',
          'Contact: hello@mlopsmena.com',
          'Data protection enquiries: hello@mlopsmena.com',
        ],
      },
    ],
  },
  {
    id: 'scope',
    heading: '2. What this policy covers',
    blocks: [
      { kind: 'p', text: 'This policy covers two things:' },
      {
        kind: 'ul',
        items: [
          'mlopsmena.com — our public website.',
          'MLOps MENA Studio (studio.mlopsmena.com) — an internal tool used only by our core team to plan, review and publish the community’s own social media content, and to read how that content performed on our own accounts.',
        ],
      },
      {
        kind: 'p',
        text: 'It does not cover the platforms we publish to. When you interact with our posts on LinkedIn, X, YouTube, Facebook, WhatsApp, Discord or Medium, that platform’s own privacy policy governs your data, not this one.',
      },
    ],
  },
  {
    id: 'what-we-collect',
    heading: '3. What we collect',
    blocks: [
      { kind: 'p', text: 'The public website sets no tracking cookies, runs no advertising network, and builds no profile of visitors. It is a set of static pages.' },
      {
        kind: 'p',
        text: 'For core-team members who use Studio — who authenticate through Cloudflare Access before reaching it — we store their name, email address, community team, their role in the tool, and a timestamped record of the actions they take: content created, edited, reviewed, approved, scheduled, published or deleted.',
      },
      {
        kind: 'p',
        text: 'Where we connect our own community accounts to Studio, we store that account’s identifier and name, OAuth tokens for it, and aggregate performance figures for our own posts — impressions, views, reactions, comments, shares, clicks, follower counts and watch time.',
      },
      {
        kind: 'note',
        text: 'We do not collect, request or store personal data about the people who follow, view, like or comment on our content. We read only the aggregate figures a platform reports for our own account. We do not build audience profiles, and we do not sell or share platform data with anyone.',
      },
    ],
  },
  {
    id: 'how-we-use-it',
    heading: '4. How we use it',
    blocks: [
      {
        kind: 'ul',
        items: [
          'To plan, review and schedule the community’s own educational content.',
          'To enforce an internal approval process, so nothing is published without being checked.',
          'To keep a record of who approved and published what.',
          'To understand, in aggregate, which of our educational content is useful.',
        ],
      },
      {
        kind: 'p',
        text: 'We do not use any of it for advertising, profiling, automated decision-making about individuals, or resale.',
      },
    ],
  },
  {
    id: 'credentials',
    heading: '5. Account credentials',
    blocks: [
      {
        kind: 'ul',
        items: [
          'We never ask for, collect or store passwords for any social platform.',
          'Connections are made through each platform’s official OAuth flow.',
          'We request the minimum permissions needed to publish our own content and read our own analytics, and nothing more.',
          'Tokens are encrypted at rest with AES-256-GCM. The encryption key is held separately from the database, so a copy of the database alone cannot be used to reach any account.',
          'Tokens are never shown in the application, never returned by our API, never written to logs, and never included in data exports.',
          'Disconnecting an account deletes its stored tokens immediately.',
        ],
      },
    ],
  },
  {
    id: 'where',
    heading: '6. Where data is stored',
    blocks: [
      {
        kind: 'p',
        text: 'Studio runs on Cloudflare’s infrastructure. Data may be processed in data centres outside your country of residence. Cloudflare acts as our processor.',
      },
    ],
  },
  {
    id: 'retention',
    heading: '7. How long we keep it',
    blocks: [
      {
        kind: 'table',
        head: ['Data', 'Retained for'],
        rows: [
          ['Content, approvals and publication history', 'Indefinitely — it is the record of what the community published'],
          ['Aggregate performance data', 'Indefinitely — non-personal, and its value is the long-term trend'],
          ['Raw responses from platform APIs', '12 months, then deleted'],
          ['Internal audit logs', '7 years'],
          ['OAuth tokens', 'Until the account is disconnected, then deleted immediately'],
          ['Core-team member accounts', 'While they are on the team. On departure the account is disabled and personal details removed, though their authorship of past content is preserved'],
        ],
      },
    ],
  },
  {
    id: 'your-rights',
    heading: '8. Your rights',
    blocks: [
      {
        kind: 'p',
        text: 'If you are somewhere that grants data protection rights — including the EU and UK under GDPR, and Egypt under the Personal Data Protection Law — you may ask us for access to, correction of, or deletion of personal data we hold about you, object to how we process it, or ask for a copy in a portable format.',
      },
      { kind: 'p', text: 'Write to hello@mlopsmena.com. We will respond within 30 days.' },
      {
        kind: 'note',
        text: 'Because we hold almost no personal data about people outside our core team, the honest answer to most access requests will be that we hold nothing about you. If you want data removed from a platform where you interacted with our content, that request goes to the platform.',
      },
    ],
  },
  {
    id: 'third-parties',
    heading: '9. Third parties',
    blocks: [
      {
        kind: 'p',
        text: 'We publish to, and read our own analytics from: LinkedIn, X, YouTube, Facebook, WhatsApp, Discord and Medium. Each has its own privacy policy, and your relationship with them is not governed by this one.',
      },
      {
        kind: 'p',
        text: 'We use Cloudflare for hosting, security and access control, and Google Forms for referral submissions made by core-team members.',
      },
    ],
  },
  {
    id: 'security',
    heading: '10. Security',
    blocks: [
      {
        kind: 'ul',
        items: [
          'Studio is not publicly reachable. Access is enforced at Cloudflare’s edge, before a request reaches the application.',
          'All traffic is served over HTTPS.',
          'Credentials are encrypted at rest, with keys stored separately.',
          'Access within the tool is role-based and least-privilege.',
          'Security-relevant actions are logged.',
          'Access to community platform accounts is reviewed periodically and revoked when someone leaves the team.',
        ],
      },
    ],
  },
  {
    id: 'children',
    heading: '11. Children',
    blocks: [
      {
        kind: 'p',
        text: 'Our content is aimed at working engineers and students in higher education. We do not knowingly collect personal data from anyone under 16.',
      },
    ],
  },
  {
    id: 'changes',
    heading: '12. Changes to this policy',
    blocks: [
      {
        kind: 'p',
        text: 'We will update this page when our practices change, and change the date above. Where a change materially affects how we handle personal data, we will say so in our community channels.',
      },
    ],
  },
  {
    id: 'contact',
    heading: '13. Contact',
    blocks: [{ kind: 'p', text: 'Questions or requests: hello@mlopsmena.com' }],
  },
]

const ar: PolicySection[] = [
  {
    id: 'who-we-are',
    heading: '١. من نحن',
    blocks: [
      {
        kind: 'p',
        text: 'مجتمع MLOps MENA مجتمع تعليمي وجهة تقدّم خدمات. ننشر تعلّمًا مجانيًا في هندسة تشغيل نماذج التعلّم الآلي والذكاء الاصطناعي للمهندسين في الشرق الأوسط وشمال أفريقيا، ونقدّم للشركات خدمات مدفوعة في التدريب وتوفير الكفاءات وتنفيذ المشاريع البرمجية والاستشارات.',
      },
      {
        kind: 'ul',
        items: [
          'الموقع: https://mlopsmena.com',
          'التواصل: hello@mlopsmena.com',
          'استفسارات حماية البيانات: hello@mlopsmena.com',
        ],
      },
    ],
  },
  {
    id: 'scope',
    heading: '٢. ما الذي تغطّيه هذه السياسة',
    blocks: [
      { kind: 'p', text: 'تغطّي هذه السياسة أمرين:' },
      {
        kind: 'ul',
        items: [
          'mlopsmena.com — موقعنا العام.',
          'MLOps MENA Studio على studio.mlopsmena.com — أداة داخلية يستخدمها فريقنا الأساسي وحده لتخطيط محتوى المجتمع على وسائل التواصل ومراجعته ونشره، ولقراءة أداء ذلك المحتوى على حساباتنا نحن.',
        ],
      },
      {
        kind: 'p',
        text: 'ولا تغطّي المنصّات التي ننشر عليها. فحين تتفاعل مع منشوراتنا على لينكدإن أو إكس أو يوتيوب أو فيسبوك أو واتساب أو ديسكورد أو ميديوم، تحكم بياناتِك سياسةُ تلك المنصّة لا هذه السياسة.',
      },
    ],
  },
  {
    id: 'what-we-collect',
    heading: '٣. ما الذي نجمعه',
    blocks: [
      {
        kind: 'p',
        text: 'الموقع العام لا يضع ملفات تتبّع، ولا يشغّل أي شبكة إعلانات، ولا يبني أي ملف تعريفي عن الزوّار. وهو مجموعة صفحات ثابتة.',
      },
      {
        kind: 'p',
        text: 'أما أعضاء الفريق الأساسي الذين يستخدمون Studio — ويتحقّق من هويّتهم عبر Cloudflare Access قبل الوصول إليه — فنحفظ أسماءهم وبريدهم الإلكتروني وفريقهم داخل المجتمع ودورهم في الأداة، وسجلًا مؤرَّخًا بما يقومون به: إنشاء محتوى أو تعديله أو مراجعته أو اعتماده أو جدولته أو نشره أو حذفه.',
      },
      {
        kind: 'p',
        text: 'وحين نربط حسابات المجتمع الخاصة بنا بـ Studio، نحفظ معرّف الحساب واسمه، ورموز OAuth الخاصة به، وأرقام الأداء الإجمالية لمنشوراتنا نحن — مرّات الظهور والمشاهدات والتفاعلات والتعليقات والمشاركات والنقرات وعدد المتابعين ومدّة المشاهدة.',
      },
      {
        kind: 'note',
        text: 'نحن لا نجمع ولا نطلب ولا نحفظ بيانات شخصية عن الأشخاص الذين يتابعون منشوراتنا أو يشاهدونها أو يتفاعلون معها أو يعلّقون عليها. نقرأ فقط الأرقام الإجمالية التي تعرضها المنصّة عن حسابنا نحن. ولا نبني ملفات تعريفية للجمهور، ولا نبيع بيانات المنصّات ولا نشاركها مع أحد.',
      },
    ],
  },
  {
    id: 'how-we-use-it',
    heading: '٤. كيف نستخدمها',
    blocks: [
      {
        kind: 'ul',
        items: [
          'لتخطيط محتوى المجتمع التعليمي ومراجعته وجدولته.',
          'لتطبيق مسار اعتماد داخلي، فلا يُنشر شيء دون مراجعة.',
          'للاحتفاظ بسجلّ لمن اعتمد ونشر كل عنصر.',
          'لفهم أي محتوى تعليمي كان مفيدًا، على المستوى الإجمالي.',
        ],
      },
      {
        kind: 'p',
        text: 'ولا نستخدم أيًّا منها في الإعلانات أو بناء الملفات التعريفية أو اتخاذ قرارات آلية بشأن أفراد أو إعادة البيع.',
      },
    ],
  },
  {
    id: 'credentials',
    heading: '٥. بيانات الدخول إلى الحسابات',
    blocks: [
      {
        kind: 'ul',
        items: [
          'لا نطلب ولا نجمع ولا نحفظ كلمات مرور أي منصّة تواصل.',
          'يتم الربط عبر مسار OAuth الرسمي لكل منصّة.',
          'نطلب أقل الصلاحيات اللازمة لنشر محتوانا وقراءة تحليلاتنا، لا أكثر.',
          'تُشفَّر الرموز أثناء التخزين بخوارزمية AES-256-GCM، ويُحفظ مفتاح التشفير بعيدًا عن قاعدة البيانات، فنسخة من قاعدة البيانات وحدها لا تكفي للوصول إلى أي حساب.',
          'لا تظهر الرموز في التطبيق، ولا تُعيدها واجهتنا البرمجية، ولا تُكتب في السجلات، ولا تُدرج في أي تصدير للبيانات.',
          'فصل أي حساب يحذف رموزه المخزّنة فورًا.',
        ],
      },
    ],
  },
  {
    id: 'where',
    heading: '٦. أين تُخزَّن البيانات',
    blocks: [
      {
        kind: 'p',
        text: 'يعمل Studio على بنية Cloudflare التحتية. وقد تُعالَج البيانات في مراكز بيانات خارج بلد إقامتك. وتعمل Cloudflare بصفتها معالِجًا للبيانات نيابةً عنّا.',
      },
    ],
  },
  {
    id: 'retention',
    heading: '٧. مدّة الاحتفاظ',
    blocks: [
      {
        kind: 'table',
        head: ['البيانات', 'مدّة الاحتفاظ'],
        rows: [
          ['المحتوى وسجلّ الاعتمادات والنشر', 'إلى أجل غير مسمّى — فهو سجلّ ما نشره المجتمع'],
          ['بيانات الأداء الإجمالية', 'إلى أجل غير مسمّى — غير شخصية، وقيمتها في تتبّع الاتجاه على المدى الطويل'],
          ['الاستجابات الخام من واجهات المنصّات', '١٢ شهرًا ثم تُحذف'],
          ['سجلّات التدقيق الداخلية', '٧ سنوات'],
          ['رموز OAuth', 'حتى فصل الحساب، ثم تُحذف فورًا'],
          ['حسابات أعضاء الفريق الأساسي', 'طوال عضويتهم. وعند المغادرة يُعطَّل الحساب وتُزال البيانات الشخصية، مع الإبقاء على نسبة ما أنتجوه إليهم'],
        ],
      },
    ],
  },
  {
    id: 'your-rights',
    heading: '٨. حقوقك',
    blocks: [
      {
        kind: 'p',
        text: 'إن كنت في نطاق قضائي يمنحك حقوقًا في حماية البيانات — ومنها الاتحاد الأوروبي والمملكة المتحدة بموجب اللائحة العامة لحماية البيانات، ومصر بموجب قانون حماية البيانات الشخصية — فيمكنك أن تطلب الاطّلاع على بياناتك الشخصية لدينا أو تصحيحها أو حذفها، أو الاعتراض على معالجتها، أو الحصول على نسخة بصيغة قابلة للنقل.',
      },
      { kind: 'p', text: 'راسلنا على hello@mlopsmena.com وسنردّ خلال ٣٠ يومًا.' },
      {
        kind: 'note',
        text: 'ولأننا لا نحتفظ تقريبًا بأي بيانات شخصية عن أشخاص خارج فريقنا الأساسي، فالإجابة الصادقة على معظم الطلبات هي أننا لا نحتفظ بشيء عنك. وإن أردت حذف بيانات من منصّة تفاعلت فيها مع محتوانا، فذلك الطلب يُوجَّه إلى المنصّة نفسها.',
      },
    ],
  },
  {
    id: 'third-parties',
    heading: '٩. أطراف ثالثة',
    blocks: [
      {
        kind: 'p',
        text: 'ننشر على المنصّات التالية ونقرأ تحليلاتنا منها: لينكدإن، وإكس، ويوتيوب، وفيسبوك، وواتساب، وديسكورد، وميديوم. ولكلٍّ منها سياسة خصوصية خاصة، وعلاقتك بها لا تحكمها هذه السياسة.',
      },
      {
        kind: 'p',
        text: 'ونستخدم Cloudflare للاستضافة والحماية وضبط الوصول، ونماذج Google لاستقبال الترشيحات من أعضاء الفريق الأساسي.',
      },
    ],
  },
  {
    id: 'security',
    heading: '١٠. الأمان',
    blocks: [
      {
        kind: 'ul',
        items: [
          'Studio غير متاح للعموم. ويُفرض التحقّق من الهوية على حافة شبكة Cloudflare قبل أن يصل أي طلب إلى التطبيق.',
          'كل الاتصالات تمرّ عبر HTTPS.',
          'تُشفَّر بيانات الاعتماد أثناء التخزين، وتُحفظ المفاتيح منفصلة عنها.',
          'الصلاحيات داخل الأداة قائمة على الأدوار ومحدودة بأقل قدر لازم.',
          'تُسجَّل الإجراءات ذات الأثر الأمني.',
          'تُراجَع صلاحيات الوصول إلى حسابات المجتمع دوريًا، وتُسحب عند مغادرة أي عضو.',
        ],
      },
    ],
  },
  {
    id: 'children',
    heading: '١١. الأطفال',
    blocks: [
      {
        kind: 'p',
        text: 'محتوانا موجَّه إلى المهندسين العاملين وطلاب التعليم الجامعي. ولا نجمع عن علم بيانات شخصية لمن هم دون السادسة عشرة.',
      },
    ],
  },
  {
    id: 'changes',
    heading: '١٢. تعديلات هذه السياسة',
    blocks: [
      {
        kind: 'p',
        text: 'سنحدّث هذه الصفحة كلما تغيّرت ممارساتنا، ونغيّر التاريخ أعلاه. وإن كان التغيير يمسّ جوهريًا طريقة تعاملنا مع البيانات الشخصية، فسنعلن ذلك في قنوات المجتمع.',
      },
    ],
  },
  {
    id: 'contact',
    heading: '١٣. التواصل',
    blocks: [{ kind: 'p', text: 'للأسئلة أو الطلبات: hello@mlopsmena.com' }],
  },
]

export const privacySections = { en, ar } as const
