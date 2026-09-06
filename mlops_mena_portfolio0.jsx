import { useState, useEffect, useRef, useCallback } from "react";
import {
  Menu, X, Sun, Moon, Users, GraduationCap, Code2, BookOpen,
  Presentation, Award, FileText, Linkedin, Youtube, MessageCircle,
  MessagesSquare, Mail, ArrowUpRight, CheckCircle2,
} from "lucide-react";

const LINKS = {
  linkedin: "https://www.linkedin.com/company/mlops-mena/",
  youtube: "http://www.youtube.com/@MLOpsMENACommunity",
  whatsapp: "https://chat.whatsapp.com/HBJqyUFqktQL3Kybgp1oVn",
  discord: "https://discord.gg/HbJYqVEcw",
  phiAi: "https://www.linkedin.com/company/phi-ai-2025/posts/",
};


/* ---------------------------------------------------------------
   Design tokens
   navy   #0A1730 (dark bg)      paper  #F6F8FB (light bg)
   navy2  #14284A (dark surface) paper2 #ECF1F7 (light surface)
   ink    #0B1F3A (light text)
   cyan   #23C6E0   blue #2F6FED   gold  #F0AC1D
--------------------------------------------------------------- */

function useReveal() {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, shown];
}

function Counter({ to, suffix = "", duration = 1400, start }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, to, duration]);
  return (
    <span>
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}

function InfinityMark({ size = 40, glow = true }) {
  return (
    <span
      className={glow ? "logo-glow" : ""}
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        borderRadius: size * 0.24,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <img
        src={LOGO_SRC}
        alt="MLOps MENA Community"
        width={size}
        height={size}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </span>
  );
}

const LOGO_SRC =
  "data:image/webp;base64,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";

const NAV_LINKS = ["Home", "About", "Impact", "Services", "Projects", "Community", "Contact"];

const FOCUS = [
  { icon: BookOpen, title: "Learn", body: "Practical technical education and sessions built around real MLOps workflows, not slideware." },
  { icon: Code2, title: "Build", body: "Real projects and hands-on engineering experience across the full delivery lifecycle." },
  { icon: Users, title: "Connect", body: "Connecting engineers, mentors, companies, and opportunities across the region." },
];

const IMPACT = [
  { to: 4000, suffix: "+", label: "LinkedIn Followers", platform: "linkedin" },
  { to: 1300, suffix: "+", label: "YouTube Subscribers", platform: "youtube" },
  { to: 16000, suffix: "+", label: "YouTube Views", platform: "youtube" },
  { to: 3000, suffix: "+", label: "YouTube Watch Hours", platform: "youtube" },
  { to: 2000, suffix: "+", label: "WhatsApp Community Members", platform: "whatsapp" },
  { to: 1000, suffix: "+", label: "Discord Members", platform: "discord" },
];

const CONTENT_ROWS = [
  { label: "Articles", count: 2 },
  { label: "YouTube video-summary posts", count: 3 },
  { label: "Educational posts — Session 1 & 2 topics", count: 13 },
  { label: "Announcement posts", count: 7 },
];

const SERVICES = [
  {
    icon: Users,
    title: "Talent & Outsourcing",
    body: "Access skilled AI and MLOps engineering talent for your projects and technical teams.",
    highlight: "Delivered a team of 2 Senior Engineers + 1 Junior Engineer for a client through a contract with Phi.ai.",
    link: LINKS.phiAi,
    linkLabel: "Phi.ai on LinkedIn",
  },
  {
    icon: GraduationCap,
    title: "Corporate Training",
    body: "Practical AI and MLOps training programs designed for corporate teams, focused on the tools, workflows, and engineering practices used in real production environments.",
    topics: ["AI Engineering", "Machine Learning", "MLOps", "Docker", "CI/CD", "Model Deployment", "LLM Engineering"],
  },
  {
    icon: Code2,
    title: "Software Project Delivery",
    body: "End-to-end AI software development — from problem definition and model development to deployment and production-ready systems.",
    highlight: "Egyptian Legal Consultations AI System",
    badge: "Client Confidential / Under NDA",
  },
];

const PROJECTS = [
  { title: "Egyptian Legal Consultations AI System", status: "Client Confidential / Under NDA", type: "Software Delivery" },
  { title: "Engineering Team Placement", status: "2 Senior Engineers + 1 Junior Engineer — Client: Phi.ai", type: "Talent & Outsourcing", link: LINKS.phiAi },
];

const PROGRAMS = [
  { icon: Award, title: "The MLOps Practitioner", body: "A practical learning program focused on MLOps and production ML engineering.", stat: "1,200+ learners" },
  { icon: Presentation, title: "Community Sessions", body: "Technical sessions delivered by experienced engineers and practitioners." },
  { icon: Users, title: "Community Standouts", body: "A weekly recognition program highlighting active members — activity, engagement, session attendance, projects, and contribution." },
  { icon: FileText, title: "Technical Content", body: "Articles, educational posts, video summaries, and practical technical resources." },
];

const TESTIMONIALS = [
  { quote: "Great technical content and a community that actually focuses on practical learning.", name: "Community Member" },
  { quote: "The sessions felt like working sessions, not lectures — I left with something I could actually use.", name: "Community Member" },
  { quote: "It's rare to find a community this new moving with this much discipline.", name: "Community Member" },
];

const WHY_US = [
  { title: "Technical Expertise", body: "Practical AI & MLOps knowledge, not just theory." },
  { title: "Real Engineering Experience", body: "Projects, deployment, infrastructure, and production workflows." },
  { title: "Growing Talent Network", body: "A community of engineers and technical learners across MENA." },
  { title: "Community + Industry", body: "We connect education, engineering talent, and real business needs." },
];

function Section({ id, className = "", children }) {
  return (
    <section id={id} className={`px-6 md:px-12 lg:px-20 py-20 md:py-28 ${className}`}>
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
}

function Kicker({ children }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="h-px w-8" style={{ background: "linear-gradient(90deg,#23C6E0,#F0AC1D)" }} />
      <span className="text-sm font-medium tracking-wide" style={{ color: "var(--muted)" }}>{children}</span>
    </div>
  );
}

export default function MlopsMenaSite() {
  const [dark, setDark] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [impactRef, impactShown] = useReveal();
  const [teamRef, teamShown] = useReveal();

  const scrollTo = useCallback((id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const vars = dark
    ? { "--bg": "#0A1730", "--bg2": "#0E1D3B", "--surface": "#14284A", "--surface2": "#0F2140",
        "--text": "#EAF1FB", "--muted": "#8FA3C4", "--border": "rgba(255,255,255,0.10)" }
    : { "--bg": "#F6F8FB", "--bg2": "#EEF2F8", "--surface": "#FFFFFF", "--surface2": "#ECF1F7",
        "--text": "#0B1F3A", "--muted": "#5B6B84", "--border": "rgba(11,31,58,0.12)" };

  return (
    <div
      style={{ ...vars, background: "var(--bg)", color: "var(--text)", fontFamily: "'IBM Plex Sans', sans-serif" }}
      className="min-h-screen w-full transition-colors duration-300"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        .display { font-family: 'Space Grotesk', sans-serif; }
        .trace-line { background: linear-gradient(90deg, transparent, #23C6E0 20%, #F0AC1D 80%, transparent); height: 1px; }
        @keyframes floatPath { from { stroke-dashoffset: 400; } to { stroke-dashoffset: 0; } }
        .path-anim { stroke-dasharray: 6 10; animation: floatPath 18s linear infinite; }
        @keyframes heroIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .hero-in-1 { animation: heroIn 0.7s ease-out both; }
        .hero-in-2 { animation: heroIn 0.7s ease-out 0.12s both; }
        .hero-in-3 { animation: heroIn 0.7s ease-out 0.24s both; }
        .hero-in-4 { animation: heroIn 0.7s ease-out 0.36s both; }
        .card-border { border: 1px solid var(--border); }
        .reveal { opacity: 0; transform: translateY(16px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .reveal.shown { opacity: 1; transform: translateY(0); }

        .logo-glow { filter: drop-shadow(0 0 6px rgba(35,198,224,0.55)) drop-shadow(0 0 14px rgba(240,172,29,0.35)); }
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(35,198,224,0.5)) drop-shadow(0 0 12px rgba(240,172,29,0.3)); }
          50% { filter: drop-shadow(0 0 12px rgba(35,198,224,0.85)) drop-shadow(0 0 22px rgba(240,172,29,0.55)); }
        }
        .logo-glow-pulse { animation: glowPulse 3.2s ease-in-out infinite; }

        @keyframes orbDrift {
          0% { transform: translate(0,0) scale(1); }
          50% { transform: translate(30px,-24px) scale(1.08); }
          100% { transform: translate(0,0) scale(1); }
        }
        .orb { position: absolute; border-radius: 9999px; filter: blur(60px); pointer-events: none; animation: orbDrift 14s ease-in-out infinite; }

        .glow-card { transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease; }
        .glow-card:hover { transform: translateY(-3px); border-color: rgba(35,198,224,0.45); box-shadow: 0 12px 32px -12px rgba(35,198,224,0.35); }

        @keyframes ctaGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(35,198,224,0.35); }
          50% { box-shadow: 0 0 0 8px rgba(35,198,224,0); }
        }
        .cta-glow { animation: ctaGlow 2.4s ease-in-out infinite; }
      `}</style>

      {/* NAVBAR */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "backdrop-blur-md" : ""}`}
        style={{
          background: scrolled ? (dark ? "rgba(10,23,48,0.75)" : "rgba(246,248,251,0.75)") : "transparent",
          borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-20 h-16 flex items-center justify-between">
          <button onClick={() => scrollTo("home")} className="flex items-center gap-2.5">
            <span className="logo-glow-pulse" style={{ display: "inline-flex" }}>
              <InfinityMark size={34} glow={false} />
            </span>
            <span className="display font-semibold text-[15px] tracking-tight" style={{ color: "var(--text)" }}>
              MLOps MENA <span style={{ color: "var(--muted)", fontWeight: 400 }}>Community</span>
            </span>
          </button>

          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <button
                key={l}
                onClick={() => scrollTo(l.toLowerCase())}
                className="text-sm font-medium hover:opacity-70 transition-opacity"
                style={{ color: "var(--muted)" }}
              >
                {l}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark((d) => !d)}
              aria-label="Toggle theme"
              className="w-9 h-9 rounded-full flex items-center justify-center card-border"
              style={{ color: "var(--text)" }}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => scrollTo("contact")}
              className="hidden sm:flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-medium text-white"
              style={{ background: "linear-gradient(90deg,#2F6FED,#23C6E0)" }}
            >
              Contact Us
            </button>
            <button className="lg:hidden" onClick={() => setMenuOpen((m) => !m)} style={{ color: "var(--text)" }}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="lg:hidden px-6 pb-6 flex flex-col gap-4" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
            {NAV_LINKS.map((l) => (
              <button key={l} onClick={() => scrollTo(l.toLowerCase())} className="text-left text-sm font-medium" style={{ color: "var(--text)" }}>
                {l}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="home" className="relative overflow-hidden pt-40 pb-24 px-6 md:px-12 lg:px-20">
        <div className="orb" style={{ width: 340, height: 340, top: -80, left: -60, background: "#23C6E0", opacity: dark ? 0.22 : 0.14 }} />
        <div className="orb" style={{ width: 300, height: 300, top: 40, right: -80, background: "#F0AC1D", opacity: dark ? 0.18 : 0.12, animationDelay: "3s" }} />
        <svg className="absolute inset-0 w-full h-full opacity-40" preserveAspectRatio="none" viewBox="0 0 1000 500">
          <path d="M0 380 C 200 300, 300 420, 500 340 S 800 260, 1000 320" stroke="#23C6E0" strokeOpacity="0.35" strokeWidth="1.5" fill="none" className="path-anim" />
          <path d="M0 200 C 250 260, 350 120, 550 180 S 780 260, 1000 160" stroke="#F0AC1D" strokeOpacity="0.3" strokeWidth="1.5" fill="none" className="path-anim" style={{ animationDuration: "24s" }} />
        </svg>

        <div className="max-w-6xl mx-auto relative">
          <div className="hero-in-1"><Kicker>AI &amp; MLOps · Egypt &amp; the Middle East</Kicker></div>
          <h1 className="hero-in-2 display font-semibold leading-[1.05] tracking-tight text-[38px] sm:text-[52px] lg:text-[64px] max-w-3xl" style={{ color: "var(--text)" }}>
            Building the AI &amp; MLOps Community in MENA
          </h1>
          <p className="hero-in-3 mt-6 text-lg max-w-xl" style={{ color: "var(--muted)" }}>
            Contributing to the AI and MLOps community in Egypt and the Middle East.
          </p>
          <p className="hero-in-3 mt-3 text-base max-w-xl" style={{ color: "var(--muted)" }}>
            We bring together engineers, learners, and industry professionals through technical education, community initiatives, and real-world AI &amp; MLOps projects.
          </p>
          <div className="hero-in-4 mt-9 flex flex-wrap gap-4">
            <button onClick={() => scrollTo("contact")} className="px-6 h-11 rounded-full text-sm font-semibold text-white flex items-center gap-2" style={{ background: "linear-gradient(90deg,#2F6FED,#23C6E0)" }}>
              Work With Us
            </button>
            <button onClick={() => scrollTo("impact")} className="px-6 h-11 rounded-full text-sm font-semibold card-border flex items-center gap-2" style={{ color: "var(--text)" }}>
              Explore Our Impact
            </button>
          </div>
        </div>
      </section>

      <div className="trace-line max-w-6xl mx-auto" />

      {/* WHO WE ARE */}
      <Section id="about">
        <Kicker>Who We Are</Kicker>
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="display text-3xl md:text-4xl font-semibold tracking-tight max-w-md">More Than a Community</h2>
            <p className="mt-5 max-w-md" style={{ color: "var(--muted)" }}>
              MLOps MENA is a growing technical community focused on AI, Machine Learning, MLOps, and practical engineering — bringing together{" "}
              <span style={{ color: "var(--text)", fontWeight: 600 }}>30+ active team members</span> and a wider community of engineers and learners.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {FOCUS.map((f) => (
              <div key={f.title} className="p-5 rounded-lg card-border glow-card" style={{ background: "var(--surface)" }}>
                <f.icon size={20} style={{ color: "#23C6E0" }} />
                <h3 className="display font-semibold mt-4">{f.title}</h3>
                <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* IMPACT */}
      <Section id="impact" className="rounded-none" style={{ background: "var(--surface2)" }}>
        <div ref={impactRef}>
          <Kicker>Our Impact</Kicker>
          <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
            <h2 className="display text-3xl md:text-4xl font-semibold tracking-tight">Fast growth, real numbers</h2>
            <div className="px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ background: "linear-gradient(90deg,#F0AC1D,#2F6FED)" }}>
              Achieved in ~1 Month
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-px card-border rounded-lg overflow-hidden" style={{ background: "var(--border)" }}>
            {IMPACT.map((s) => {
              const platformMeta = {
                linkedin: { href: LINKS.linkedin, Icon: Linkedin },
                youtube: { href: LINKS.youtube, Icon: Youtube },
                whatsapp: { href: LINKS.whatsapp, Icon: MessageCircle },
                discord: { href: LINKS.discord, Icon: MessagesSquare },
              }[s.platform];
              const { href, Icon } = platformMeta;
              return (
                <a
                  key={s.label}
                  href={href}
                  target="_blank" rel="noreferrer"
                  className="p-6 block hover:opacity-80 transition-opacity"
                  style={{ background: "var(--surface)" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="display text-3xl md:text-4xl font-semibold" style={{ color: "var(--text)" }}>
                      <Counter to={s.to} suffix={s.suffix} start={impactShown} />
                    </div>
                    <Icon size={16} style={{ color: "var(--muted)" }} />
                  </div>
                  <div className="text-sm mt-2" style={{ color: "var(--muted)" }}>{s.label}</div>
                </a>
              );
            })}
          </div>
          <div ref={teamRef} className="mt-6 flex flex-wrap items-center justify-between gap-4 p-6 rounded-lg card-border" style={{ background: "var(--surface)" }}>
            <div>
              <div className="display text-3xl font-semibold">
                <Counter to={30} suffix="+" start={teamShown} /> <span className="text-lg font-normal" style={{ color: "var(--muted)" }}>Team Members</span>
              </div>
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                Built by a team of around 30 people working across content, community, technical education, and operations.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* CONTENT & COMMUNITY */}
      <Section>
        <Kicker>Content &amp; Community</Kicker>
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
          <h2 className="display text-3xl md:text-4xl font-semibold tracking-tight max-w-lg">A real content operation, not a blog</h2>
          <div className="text-right">
            <div className="display text-4xl font-semibold" style={{ color: "#F0AC1D" }}>25+</div>
            <div className="text-sm" style={{ color: "var(--muted)" }}>pieces of content — August</div>
          </div>
        </div>
        <div className="card-border rounded-lg overflow-hidden" style={{ background: "var(--surface)" }}>
          {CONTENT_ROWS.map((r, i) => (
            <div key={r.label} className={`flex items-center justify-between px-6 py-4 ${i !== 0 ? "border-t" : ""}`} style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--text)" }}>{r.label}</span>
              <span className="display font-semibold text-lg" style={{ color: "#23C6E0" }}>{r.count}</span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm max-w-xl" style={{ color: "var(--muted)" }}>
          Consistent technical content helped us grow our audience and strengthen community engagement.
        </p>
      </Section>

      {/* SERVICES */}
      <Section id="services" style={{ background: "var(--surface2)" }}>
        <Kicker>Services</Kicker>
        <h2 className="display text-3xl md:text-4xl font-semibold tracking-tight max-w-lg mb-10">What We Can Build With You</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {SERVICES.map((s) => (
            <div key={s.title} className="p-6 rounded-lg card-border glow-card flex flex-col" style={{ background: "var(--surface)" }}>
              <s.icon size={22} style={{ color: "#2F6FED" }} />
              <h3 className="display font-semibold text-lg mt-4">{s.title}</h3>
              <p className="text-sm mt-2 flex-1" style={{ color: "var(--muted)" }}>{s.body}</p>
              {s.topics && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {s.topics.map((t) => (
                    <span key={t} className="text-xs px-2 py-1 rounded-full card-border" style={{ color: "var(--muted)" }}>{t}</span>
                  ))}
                </div>
              )}
              {s.highlight && (
                <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                  {s.badge && (
                    <span className="inline-block text-xs font-semibold px-2 py-1 rounded-full mb-2" style={{ background: "rgba(240,172,29,0.15)", color: "#F0AC1D" }}>{s.badge}</span>
                  )}
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{s.highlight}</p>
                  {s.link && (
                    <a href={s.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs mt-2 font-medium" style={{ color: "#2F6FED" }}>
                      {s.linkLabel} <ArrowUpRight size={12} />
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* PROJECTS */}
      <Section id="projects">
        <Kicker>Our Work</Kicker>
        <h2 className="display text-3xl md:text-4xl font-semibold tracking-tight max-w-lg mb-10">Selected Engagements</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {PROJECTS.map((p) => {
            const Wrapper = p.link ? "a" : "div";
            return (
              <Wrapper
                key={p.title}
                {...(p.link ? { href: p.link, target: "_blank", rel: "noreferrer" } : {})}
                className="p-6 rounded-lg card-border glow-card block"
                style={{ background: "var(--surface)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{p.type}</span>
                  <ArrowUpRight size={16} style={{ color: "var(--muted)" }} />
                </div>
                <h3 className="display font-semibold text-lg mt-3">{p.title}</h3>
                <p className="text-sm mt-2" style={{ color: "#F0AC1D" }}>{p.status}</p>
              </Wrapper>
            );
          })}
        </div>
      </Section>

      {/* COMMUNITY PROGRAMS */}
      <Section id="community" style={{ background: "var(--surface2)" }}>
        <Kicker>Community Programs</Kicker>
        <h2 className="display text-3xl md:text-4xl font-semibold tracking-tight max-w-lg mb-10">What the Community Does</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PROGRAMS.map((p) => (
            <div key={p.title} className="p-5 rounded-lg card-border glow-card" style={{ background: "var(--surface)" }}>
              <div className="flex items-center justify-between">
                <p.icon size={20} style={{ color: "#23C6E0" }} />
                {p.stat && (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(240,172,29,0.15)", color: "#F0AC1D" }}>{p.stat}</span>
                )}
              </div>
              <h3 className="display font-semibold mt-4">{p.title}</h3>
              <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section>
        <Kicker>Testimonials</Kicker>
        <h2 className="display text-3xl md:text-4xl font-semibold tracking-tight max-w-lg mb-10">From the Community</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="p-6 rounded-lg card-border glow-card" style={{ background: "var(--surface)" }}>
              <p className="text-[15px] leading-relaxed" style={{ color: "var(--text)" }}>&ldquo;{t.quote}&rdquo;</p>
              <p className="text-sm mt-4" style={{ color: "var(--muted)" }}>&mdash; {t.name}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* WHY US */}
      <Section style={{ background: "var(--surface2)" }}>
        <Kicker>Why Work With Us</Kicker>
        <h2 className="display text-3xl md:text-4xl font-semibold tracking-tight max-w-lg mb-10">Why MLOps MENA</h2>
        <div className="grid sm:grid-cols-2 gap-x-10 gap-y-6">
          {WHY_US.map((w) => (
            <div key={w.title} className="flex gap-3">
              <CheckCircle2 size={20} style={{ color: "#F0AC1D" }} className="mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold" style={{ color: "var(--text)" }}>{w.title}</h3>
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{w.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* GROWTH */}
      <Section>
        <Kicker>Community Growth</Kicker>
        <h2 className="display text-3xl md:text-4xl font-semibold tracking-tight max-w-lg">Small team. Fast execution. Measurable impact.</h2>
        <div className="mt-10">
          {[
            { k: "~1 Month", v: "Timeframe" },
            { k: "4K+", v: "LinkedIn Followers" },
            { k: "1.3K+", v: "YouTube Subscribers" },
            { k: "16K+", v: "YouTube Views" },
            { k: "3K+", v: "Watch Hours" },
            { k: "30+", v: "Team Members" },
            { k: "2K+", v: "WhatsApp Community Members" },
            { k: "1K+", v: "Discord Members" },
          ].map((row, i, arr) => (
            <div key={row.v} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: i % 2 === 0 ? "#23C6E0" : "#F0AC1D" }} />
                {i !== arr.length - 1 && <span className="w-px flex-1 mt-1" style={{ background: "var(--border)" }} />}
              </div>
              <div className={i !== arr.length - 1 ? "pb-8" : ""}>
                <div className="flex items-baseline gap-3">
                  <span className="display font-semibold text-xl" style={{ color: "var(--text)" }}>{row.k}</span>
                  <span className="text-sm" style={{ color: "var(--muted)" }}>{row.v}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section className="text-center relative overflow-hidden" style={{ background: "linear-gradient(135deg,#0A1730,#14284A)" }}>
        <div className="orb" style={{ width: 280, height: 280, top: -60, left: "20%", background: "#23C6E0", opacity: 0.25 }} />
        <div className="orb" style={{ width: 260, height: 260, bottom: -60, right: "18%", background: "#F0AC1D", opacity: 0.2, animationDelay: "5s" }} />
        <h2 className="display text-3xl md:text-5xl font-semibold tracking-tight text-white max-w-2xl mx-auto relative">
          Let&rsquo;s Build Something With AI.
        </h2>
        <p className="mt-5 max-w-xl mx-auto relative" style={{ color: "#8FA3C4" }}>
          Whether you&rsquo;re looking for AI &amp; MLOps talent, corporate training, or an AI software solution, let&rsquo;s talk.
        </p>
        <div className="mt-8 flex flex-wrap gap-4 justify-center relative">
          <button onClick={() => scrollTo("contact")} className="cta-glow px-6 h-11 rounded-full text-sm font-semibold text-white" style={{ background: "linear-gradient(90deg,#2F6FED,#23C6E0)" }}>
            Work With Us
          </button>
          <button onClick={() => scrollTo("community")} className="px-6 h-11 rounded-full text-sm font-semibold text-white border border-white/25">
            Join the Community
          </button>
        </div>
      </Section>

      {/* FOOTER / CONTACT */}
      <footer id="contact" className="px-6 md:px-12 lg:px-20 py-16 card-border border-t-0" style={{ background: "var(--bg2)" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2.5">
              <InfinityMark size={32} />
              <span className="display font-semibold">MLOps MENA Community</span>
            </div>
            <p className="text-sm mt-4 max-w-xs" style={{ color: "var(--muted)" }}>
              Contributing to the AI and MLOps community in Egypt and the Middle East.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Elsewhere</h4>
            <div className="flex flex-col gap-3 text-sm">
              <a href={LINKS.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-80" style={{ color: "var(--muted)" }}>
                <Linkedin size={15} /> LinkedIn
              </a>
              <a href={LINKS.youtube} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-80" style={{ color: "var(--muted)" }}>
                <Youtube size={15} /> YouTube
              </a>
              <a href={LINKS.whatsapp} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-80" style={{ color: "var(--muted)" }}>
                <MessageCircle size={15} /> WhatsApp Community <span style={{ color: "var(--text)" }}>· 2K+</span>
              </a>
              <a href={LINKS.discord} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-80" style={{ color: "var(--muted)" }}>
                <MessagesSquare size={15} /> Discord <span style={{ color: "var(--text)" }}>· 1K+</span>
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Contact</h4>
            <a href="mailto:aya.nasser.mohammed@gmail.com" className="flex items-center gap-2 text-sm hover:opacity-80" style={{ color: "var(--muted)" }}>
              <Mail size={15} /> aya.nasser.mohammed@gmail.com
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-6 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          © {new Date().getFullYear()} MLOps MENA Community.
        </div>
      </footer>
    </div>
  );
}
