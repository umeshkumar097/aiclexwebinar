'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Zap, Play, BarChart3, Globe2, Check, X, ChevronDown,
  Video, Calendar, Radio, MessageSquare, Clock,
  Star, ArrowRight, Menu, Twitter, Linkedin, Youtube,
  Users, Sparkles,
} from 'lucide-react';


// ─── Counter Hook ───────────────────────────────────────────────────────────────
function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setCount(start);
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);
  return { count, ref };
}

// ─── Fade Up Variant ────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
};

// ─── Nav Links ──────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: 'Product', href: '#features' },
  { label: 'Solutions', href: '#use-cases' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Resources', href: '#faq' },
];

// ─── Fake logos (SVG text) ──────────────────────────────────────────────────────
const LOGOS = ['Notion', 'Figma', 'Stripe', 'Linear', 'Vercel', 'Loom', 'Intercom', 'Hubspot'];

// ─── Features ───────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Video,        title: 'Semi-Live Streaming',     desc: 'Pre-recorded content that feels 100% live — no audience will ever know.',    size: 'lg', color: 'blue' },
  { icon: Zap,          title: 'Hybrid Takeover',          desc: 'Switch to live mid-stream with one click. Surprise your audience.',            size: 'sm', color: 'violet' },
  { icon: MessageSquare,title: 'Real-Time Chat & Q&A',     desc: 'Full chat, Q&A, polls, and reactions — audience is fully engaged.',           size: 'sm', color: 'emerald' },
  { icon: Clock,        title: 'Multi-Timezone Scheduling',desc: 'One recording. Five time slots. Every timezone covered automatically.',        size: 'sm', color: 'amber' },
  { icon: BarChart3,    title: 'Deep Analytics',           desc: 'Heatmaps, drop-off curves, engagement scores, and conversion tracking.',      size: 'sm', color: 'rose' },
  { icon: Globe2,       title: 'API & Integrations',       desc: 'Zapier, webhooks, white-label. Build your own webinar workflows.',             size: 'sm', color: 'slate' },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  blue:    { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'group-hover:border-blue-200' },
  violet:  { bg: 'bg-violet-50', text: 'text-violet-600', border: 'group-hover:border-violet-200' },
  emerald: { bg: 'bg-emerald-50',text: 'text-emerald-600',border: 'group-hover:border-emerald-200' },
  amber:   { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'group-hover:border-amber-200' },
  rose:    { bg: 'bg-rose-50',   text: 'text-rose-600',   border: 'group-hover:border-rose-200' },
  slate:   { bg: 'bg-slate-100', text: 'text-slate-600',  border: 'group-hover:border-slate-300' },
};

// ─── Use Cases ──────────────────────────────────────────────────────────────────
const USE_CASES = [
  {
    tab: 'Course Creators',
    icon: '🎓',
    benefits: ['Record once, sell forever as "live" cohorts', 'Automated drip scheduling across timezones', 'Engagement analytics per student'],
    quote: '"Zonvo tripled my webinar show-up rate. Students think it\'s live every time."',
    author: 'Priya S. — Online Educator',
  },
  {
    tab: 'SaaS Marketing',
    icon: '📈',
    benefits: ['Product demos without live pressure', 'A/B test different recording cuts', 'CRM integrations & lead scoring'],
    quote: '"We run 20 webinars a week with a 2-person team. Zonvo makes it possible."',
    author: 'Marcus T. — Head of Growth',
  },
  {
    tab: 'Enterprise Training',
    icon: '🏢',
    benefits: ['Onboarding at scale across 50+ countries', 'Compliance recording & audit logs', 'SSO & SCIM provisioning'],
    quote: '"Replaced Zoom + LMS with just Zonvo. Our IT team loves us now."',
    author: 'Linda K. — L&D Director',
  },
  {
    tab: 'Coaches',
    icon: '🧠',
    benefits: ['One recording = multiple revenue streams', 'No timezone scheduling nightmare', 'White-label your coaching brand'],
    quote: '"I went from 1 live call/week to 40 automated sessions. Income 10x\'d."',
    author: 'James R. — Business Coach',
  },
];

// ─── FAQ ────────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'What exactly is a semi-live webinar?', a: 'A semi-live webinar is a pre-recorded session that\'s streamed on a schedule — exactly as if it\'s happening live. Attendees join at a set time, see the "LIVE" indicator, interact via real-time chat, and have no idea it\'s pre-recorded unless you tell them.' },
  { q: 'Will my audience know it\'s pre-recorded?', a: 'No — if you don\'t tell them, they won\'t know. The stream looks, feels, and behaves like a live event. Chat, Q&A, polls, and reactions all work in real time. You can even jump in live anytime for personal interaction.' },
  { q: 'How is this different from YouTube or Vimeo?', a: 'YouTube and Vimeo are on-demand platforms — people watch whenever they want. Zonvo creates urgency with scheduled "live" sessions, real-time chat, registration flows, email reminders, and conversion-focused CTA overlays.' },
  { q: 'Can I go live halfway through?', a: 'Yes! Zonvo\'s Hybrid Takeover lets you switch from pre-recorded to live mid-stream with one click. Great for Q&A sessions at the end, or surprise live moments to delight your audience.' },
  { q: 'What integrations do you support?', a: 'Zapier, Webhooks, REST API, Stripe, ConvertKit, Mailchimp, HubSpot, Salesforce, and more. Our white-label API lets you embed Zonvo inside your own product.' },
  { q: 'Is there really a free forever plan?', a: 'Yes! 3 webinars, up to 100 attendees each, basic analytics — forever free. No credit card required to start. Upgrade when you\'re ready to scale.' },
];

// ─── Testimonials ────────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: 'Sarah Chen', role: 'Founder @ ContentScale', avatar: 'SC', stars: 5, text: 'Zonvo transformed how we do product demos. Our sales team closed 3x more deals after switching from live Zoom calls to Zonvo sessions.' },
  { name: 'Ravi Mehta', role: 'CMO @ GrowthLoop', avatar: 'RM', stars: 5, text: 'The analytics alone are worth it. I can see exactly where people drop off and what made them convert. It\'s like having a webinar CRO tool built-in.' },
  { name: 'Emma Torres', role: 'Course Creator', avatar: 'ET', stars: 5, text: 'I was skeptical about "fake live" but Zonvo\'s quality is insane. My students are more engaged than when I did real live sessions. Less stress, better results.' },
];

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [billingYearly, setBillingYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [attendeeCount, setAttendeeCount] = useState(247);
  const [chatMessages, setChatMessages] = useState([
    { user: 'Alex K.', msg: 'This is amazing! 🔥', time: '2m' },
    { user: 'Priya S.', msg: 'When does Q&A start?', time: '1m' },
    { user: 'Jordan M.', msg: 'Best webinar format ever 👏', time: 'now' },
  ]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fake live attendee tick
  useEffect(() => {
    const t = setInterval(() => {
      setAttendeeCount((c) => c + Math.floor(Math.random() * 3));
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // Fake chat messages
  useEffect(() => {
    const msgs = [
      { user: 'Mike D.', msg: 'Love the platform! 💯' },
      { user: 'Sarah L.', msg: 'Just signed up!' },
      { user: 'Raj P.', msg: 'Can we get the slides?' },
      { user: 'Emma T.', msg: 'This is 🔥🔥🔥' },
    ];
    let i = 0;
    const t = setInterval(() => {
      setChatMessages((prev) => [
        ...prev.slice(-4),
        { user: msgs[i % msgs.length].user, msg: msgs[i % msgs.length].msg, time: 'now' },
      ]);
      i++;
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const { count: webinarsCount, ref: webinarsRef } = useCounter(10000);
  const { count: attendeesCount, ref: attendeesRef } = useCounter(2000000);
  const { count: uptimeCount, ref: uptimeRef } = useCounter(999);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased overflow-x-hidden">

      {/* ══════════ ANNOUNCEMENT BAR ══════════ */}
      <AnimatePresence>
        {announcementVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-blue-600 text-white text-sm overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 relative">
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">Now in Public Beta — Free Forever, No Credit Card Required</span>
              <Link href="/register" className="underline font-semibold hover:no-underline ml-1">Get started →</Link>
              <button
                onClick={() => setAnnouncementVisible(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                aria-label="Close announcement"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ NAVBAR ══════════ */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm' : 'bg-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Zonvo</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Sign In
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-50 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1 overflow-hidden"
            >
              {NAV_LINKS.map((l) => (
                <a key={l.label} href={l.href} onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  {l.label}
                </a>
              ))}
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2 mt-2">
                <Link href="/login" className="block text-center px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Sign In</Link>
                <Link href="/register" className="block text-center px-4 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700">Get Started Free</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ══════════ HERO ══════════ */}
      <section className="relative overflow-hidden py-20 md:py-28" style={{ background: 'linear-gradient(180deg, #F0F7FF 0%, #FFFFFF 100%)' }}>
        {/* BG blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #BFDBFE, transparent)' }} />
          <div className="absolute top-60 -left-20 w-72 h-72 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #DDD6FE, transparent)' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row items-center gap-16">
          {/* Left */}
          <div className="flex-1 text-center lg:text-left">
            <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              New: AI-Powered Scheduling
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight text-slate-900 mb-6"
            >
              The Future of{' '}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
                Semi-Live
              </span>{' '}
              Webinars Is Here
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8">
              Pre-record your content once. Schedule it like a live event. Deliver to thousands without tech failures, stage fright, or 3 AM timezone calls.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-8">
              <Link href="/register"
                className="flex items-center gap-2 px-7 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95 w-full sm:w-auto justify-center">
                Start for Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button className="flex items-center gap-2 px-7 py-4 bg-white border-2 border-slate-200 hover:border-blue-300 text-slate-700 font-semibold text-base rounded-xl transition-all hover:scale-105 w-full sm:w-auto justify-center">
                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                </div>
                Watch 2-Min Demo
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-5 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <div className="flex">{[1,2,3,4,5].map((i) => <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}</div>
                Loved by 2,000+ creators
              </span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" />No credit card</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" />Setup in 5 min</span>
            </motion.div>
          </div>

          {/* Right — Interactive Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="flex-1 w-full max-w-lg lg:max-w-none"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200"
              style={{ background: '#0f0f18' }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/80" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 mx-4 h-6 rounded-md bg-slate-700/60 flex items-center px-3">
                  <span className="text-slate-400 text-[10px]">webinar.zonvo.tech/live/growth-masterclass</span>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="flex" style={{ minHeight: '280px' }}>
                {/* Video area */}
                <div className="flex-1 relative flex items-center justify-center"
                  style={{ background: 'linear-gradient(160deg, #0a0a14, #0d1a2a)' }}>
                  {/* Fake video */}
                  <div className="relative w-full h-full flex items-center justify-center p-4">
                    <div className="w-full aspect-video rounded-xl overflow-hidden relative"
                      style={{ background: 'linear-gradient(135deg, #1e3a5f, #0d1a2a)' }}>
                      {/* Presenter silhouette */}
                      <div className="absolute inset-0 flex items-end justify-center pb-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full bg-blue-600/40 flex items-center justify-center text-2xl">👤</div>
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-blue-600/80 text-white text-[8px] font-bold whitespace-nowrap">Sarah Chen • Host</div>
                        </div>
                      </div>
                      {/* LIVE badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[9px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
                      </div>
                      {/* Attendee count ticking */}
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[9px] font-bold"
                        style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <Users className="w-2.5 h-2.5" />
                        <motion.span
                          key={attendeeCount}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {attendeeCount.toLocaleString()}
                        </motion.span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat sidebar */}
                <div className="w-[140px] flex flex-col flex-shrink-0"
                  style={{ background: '#0f0f18', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="px-2 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    Live Chat
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-hidden">
                    <AnimatePresence>
                      {chatMessages.slice(-4).map((m, i) => (
                        <motion.div key={`${m.user}-${i}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-[8px] leading-snug">
                          <span className="text-blue-400 font-semibold">{m.user}</span>
                          <span className="text-slate-400 ml-1">{m.msg}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <div className="p-2">
                    <div className="w-full h-5 rounded-md text-[8px] px-2 flex items-center text-slate-600"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      Type message…
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="px-4 py-2 flex items-center justify-between"
                style={{ background: '#080810', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                    <Radio className="w-2.5 h-2.5 text-emerald-400" />
                  </div>
                  <span className="text-[9px] text-emerald-400 font-semibold">Streaming • 45:12</span>
                </div>
                <div className="flex gap-1">
                  {['💬','📊','🎙'].map((e) => (
                    <div key={e} className="w-5 h-5 rounded text-[10px] flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.05)' }}>{e}</div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Floating toast */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -bottom-4 -left-4 hidden lg:flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-xl border border-slate-200 text-xs font-semibold text-slate-700"
            >
              🎉 Someone just registered!
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════ LOGO CLOUD ══════════ */}
      <section className="py-14 border-y border-slate-100 overflow-hidden" style={{ background: '#F9FAFB' }}>
        <div className="max-w-7xl mx-auto px-4 mb-8 text-center">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Trusted by teams at</p>
        </div>
        <div className="relative">
          <motion.div
            animate={{ x: [0, -1200] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="flex gap-16 whitespace-nowrap"
            style={{ width: 'max-content' }}
          >
            {[...LOGOS, ...LOGOS, ...LOGOS].map((logo, i) => (
              <div key={`${logo}-${i}`}
                className="flex items-center justify-center px-8 py-3 text-slate-300 text-xl font-black tracking-tight select-none"
                style={{ filter: 'grayscale(1)', opacity: 0.5 }}>
                {logo}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════ PROBLEM SECTION ══════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center mb-16">
            <p className="text-sm font-semibold text-red-500 uppercase tracking-widest mb-3">The Problem</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
              Why Live Webinars<br />Are Broken
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '📡', title: 'Tech Failures Kill Trust', desc: 'Stream crashes, audio cuts, screen share fails. Every live webinar is a gamble with your reputation.', color: 'red' },
              { icon: '😰', title: 'Speaker Anxiety Hurts Conversion', desc: 'Stumbling on words, losing confidence mid-pitch, filler words — they all destroy your close rate.', color: 'orange' },
              { icon: '🌍', title: 'Timezones Are Impossible', desc: 'You can\'t be live for APAC, EMEA, and Americas simultaneously. Someone always misses out.', color: 'rose' },
            ].map((p, i) => (
              <motion.div key={p.title}
                initial="hidden" whileInView="show" viewport={{ once: true }}
                custom={i}
                variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } } }}
                className="group p-8 rounded-2xl border border-slate-100 hover:border-red-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-default"
              >
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-3xl mb-5 group-hover:scale-110 transition-transform duration-300">
                  {p.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{p.title}</h3>
                <p className="text-slate-500 leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ SOLUTION INTRO ══════════ */}
      <section className="py-24" style={{ background: 'linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">The Solution</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-5">
              Zonvo Makes It Effortless
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-14">
              One platform. Zero live anxiety. Infinite scale.
            </p>
          </motion.div>

          {/* Big mockup */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-200 mb-14">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-amber-400" /><div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 mx-4 h-6 rounded bg-slate-100 flex items-center px-3">
                <span className="text-slate-400 text-xs">app.zonvo.tech — Studio Dashboard</span>
              </div>
            </div>
            <div className="h-72 md:h-96 flex"
              style={{ background: 'linear-gradient(135deg, #0f0f18, #0d1a2a)' }}>
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                  <div className="text-white/50 text-xs font-semibold mb-3 uppercase tracking-wider">Your Webinar Studio</div>
                  <div className="space-y-3">
                    {['📹 Growth Masterclass 2026', '🚀 SaaS Marketing Live Q&A', '💡 Beginner Workshop Series'].map((title, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="flex-1">
                          <div className="text-white/90 text-sm font-medium">{title}</div>
                          <div className="text-white/30 text-xs mt-0.5">{i === 0 ? '🔴 Live Now • 847 viewers' : i === 1 ? '📅 Scheduled • Tomorrow 3 PM' : '✅ Completed • 1,203 total views'}</div>
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${i === 0 ? 'bg-red-600/20 text-red-400' : i === 1 ? 'bg-blue-600/20 text-blue-400' : 'bg-emerald-600/20 text-emerald-400'}`}>
                          {i === 0 ? 'LIVE' : i === 1 ? 'SOON' : 'DONE'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="w-64 hidden md:block p-4 flex-shrink-0" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">Quick Stats</div>
                {[['Total Webinars', '24'], ['Total Attendees', '12,847'], ['Avg. Watch Time', '38 min'], ['Conversion Rate', '8.4%']].map(([label, val]) => (
                  <div key={label} className="mb-3">
                    <div className="text-white/30 text-[9px] mb-0.5">{label}</div>
                    <div className="text-white/90 text-lg font-bold">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { icon: '🎯', text: 'Record once, stream 24/7' },
              { icon: '💬', text: 'Real-time chat & engagement' },
              { icon: '📊', text: 'Deep analytics & insights' },
            ].map((f, i) => (
              <motion.div key={f.text}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">{f.icon}</div>
                <span className="font-semibold text-slate-700">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section className="py-24 bg-white" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900">How It Works</h2>
          </motion.div>
          <div className="relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
            <div className="grid md:grid-cols-3 gap-10">
              {[
                { icon: Video, step: '01', title: 'Record', desc: 'Upload your video or record directly in-browser. Edit, trim, and perfect it at your own pace.' },
                { icon: Calendar, step: '02', title: 'Schedule', desc: 'Pick dates and times. Add registration page, reminders, and customize your branding.' },
                { icon: Zap, step: '03', title: 'Go Live', desc: 'We stream it for you. You engage in real-time chat and jump live anytime you want.' },
              ].map((s, i) => (
                <motion.div key={s.title}
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15, duration: 0.6 }} viewport={{ once: true }}
                  className="flex flex-col items-center text-center relative">
                  <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/30 mb-5 relative z-10">
                    <s.icon className="w-9 h-9 text-white" />
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center text-blue-700 text-xs font-black">{s.step}</div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{s.title}</h3>
                  <p className="text-slate-500 leading-relaxed max-w-xs">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FEATURES BENTO GRID ══════════ */}
      <section className="py-24" id="features" style={{ background: '#F9FAFB' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900">Everything You Need.<br />Nothing You Don't.</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const c = COLOR_MAP[f.color];
              return (
                <motion.div key={f.title}
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.6 }} viewport={{ once: true }}
                  className={`group p-7 rounded-2xl bg-white border border-slate-200 hover:border-blue-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-default ${f.size === 'lg' ? 'md:col-span-2 lg:col-span-1' : ''}`}
                >
                  <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center mb-5 group-hover:rotate-6 transition-transform duration-300`}>
                    <f.icon className={`w-6 h-6 ${c.text}`} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════ USE CASES TABS ══════════ */}
      <section className="py-24 bg-white" id="use-cases">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-12">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Who It's For</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900">Built for Your Use Case</h2>
          </motion.div>
          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {USE_CASES.map((u, i) => (
              <button key={u.tab} onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === i ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                <span>{u.icon}</span>{u.tab}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="text-5xl mb-6">{USE_CASES[activeTab].icon}</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-5">{USE_CASES[activeTab].tab}</h3>
                <ul className="space-y-4 mb-8">
                  {USE_CASES[activeTab].benefits.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="text-slate-700">{b}</span>
                    </li>
                  ))}
                </ul>
                <blockquote className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-slate-700 italic mb-3 leading-relaxed">{USE_CASES[activeTab].quote}</p>
                  <p className="text-sm font-semibold text-slate-500">— {USE_CASES[activeTab].author}</p>
                </blockquote>
              </div>
              <div className="h-72 rounded-2xl flex items-center justify-center text-8xl"
                style={{ background: 'linear-gradient(135deg, #EFF6FF, #F0F9FF)', border: '1px solid #BFDBFE' }}>
                {USE_CASES[activeTab].icon}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ══════════ STATS ══════════ */}
      <section className="py-24" style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB, #7C3AED)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <div className="text-5xl font-extrabold mb-2 tabular-nums">
                <span ref={webinarsRef}>{webinarsCount.toLocaleString()}</span>+
              </div>
              <div className="text-blue-200 font-medium">Webinars Hosted</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} viewport={{ once: true }}>
              <div className="text-5xl font-extrabold mb-2 tabular-nums">
                <span ref={attendeesRef}>{(attendeesCount / 1000000).toFixed(1)}M</span>+
              </div>
              <div className="text-blue-200 font-medium">Attendees Reached</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} viewport={{ once: true }}>
              <div className="text-5xl font-extrabold mb-2 tabular-nums">
                <span ref={uptimeRef}>{(uptimeCount / 10).toFixed(1)}</span>%
              </div>
              <div className="text-blue-200 font-medium">Uptime SLA</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} viewport={{ once: true }}>
              <div className="text-5xl font-extrabold mb-2">4.9/5</div>
              <div className="text-blue-200 font-medium">Average Rating</div>
            </motion.div>
          </div>
          {/* Testimonials */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all">
                <div className="flex mb-3">{[1,2,3,4,5].map((s) => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}</div>
                <p className="text-white/90 italic leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-400/30 flex items-center justify-center text-white font-bold text-sm">{t.avatar}</div>
                  <div>
                    <div className="text-white font-semibold text-sm">{t.name}</div>
                    <div className="text-blue-200 text-xs">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ COMPARISON TABLE ══════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Comparison</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900">Zonvo vs. The Alternatives</h2>
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-5 bg-slate-50 font-semibold text-slate-500">Feature</th>
                  <th className="p-5 bg-blue-600 text-white font-bold text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Zap className="w-4 h-4 fill-white" />Zonvo
                    </div>
                  </th>
                  <th className="p-5 bg-slate-50 text-slate-600 font-semibold text-center">Live Webinars</th>
                  <th className="p-5 bg-slate-50 text-slate-600 font-semibold text-center">Pre-recorded Video</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Zero tech failures', true, false, true],
                  ['Feels live to audience', true, true, false],
                  ['Works across timezones', true, false, true],
                  ['Real-time chat & Q&A', true, true, false],
                  ['No presenter anxiety', true, false, true],
                  ['Deep analytics', true, false, false],
                  ['Affordable pricing', true, false, true],
                ].map(([label, zonvo, live, recorded], i) => (
                  <tr key={String(label)} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="p-5 text-slate-700 font-medium">{String(label)}</td>
                    <td className="p-5 text-center bg-blue-50/30">
                      {zonvo ? <Check className="w-5 h-5 text-blue-600 mx-auto" /> : <X className="w-5 h-5 text-slate-300 mx-auto" />}
                    </td>
                    <td className="p-5 text-center">
                      {live ? <Check className="w-5 h-5 text-emerald-500 mx-auto" /> : <X className="w-5 h-5 text-red-300 mx-auto" />}
                    </td>
                    <td className="p-5 text-center">
                      {recorded ? <Check className="w-5 h-5 text-emerald-500 mx-auto" /> : <X className="w-5 h-5 text-red-300 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* ══════════ PRICING ══════════ */}
      <section className="py-24" id="pricing" style={{ background: '#F9FAFB' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-4">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-slate-500 mb-8">Start free. Scale when you're ready.</p>
          </motion.div>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <span className={`text-sm font-medium ${!billingYearly ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
            <button
              onClick={() => setBillingYearly((v) => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors ${billingYearly ? 'bg-blue-600' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${billingYearly ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm font-medium ${billingYearly ? 'text-slate-900' : 'text-slate-400'}`}>
              Yearly <span className="ml-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Save 20%</span>
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Free', price: '$0', yearlyPrice: '$0', period: '/month',
                desc: 'For individuals getting started', popular: false,
                features: ['3 webinars/month', '100 attendees', 'Basic analytics', 'Zonvo branding', 'Community support'],
                cta: 'Start for Free', ctaStyle: 'border-2 border-slate-200 text-slate-700 hover:border-blue-300',
              },
              {
                name: 'Pro', price: '$29', yearlyPrice: '$23', period: '/month',
                desc: 'For serious creators & businesses', popular: true,
                features: ['Unlimited webinars', '1,000 attendees', 'Deep analytics', 'Custom branding', 'API access', 'Zapier integration', 'Priority support'],
                cta: 'Start Pro Trial', ctaStyle: 'bg-blue-600 text-white hover:bg-blue-700',
              },
              {
                name: 'Enterprise', price: 'Custom', yearlyPrice: 'Custom', period: '',
                desc: 'For organizations at scale', popular: false,
                features: ['Unlimited everything', 'Unlimited attendees', 'White-label', 'SSO & SCIM', 'Dedicated CSM', 'SLA guarantee', '24/7 support'],
                cta: 'Talk to Sales', ctaStyle: 'border-2 border-slate-200 text-slate-700 hover:border-blue-300',
              },
            ].map((plan, i) => (
              <motion.div key={plan.name}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className={`relative group rounded-2xl p-8 border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  plan.popular ? 'border-blue-600 bg-white shadow-xl shadow-blue-500/15' : 'border-slate-200 bg-white hover:border-blue-200'
                }`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg">
                    MOST POPULAR
                  </div>
                )}
                <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl transition-colors ${plan.popular ? 'bg-blue-600' : 'bg-transparent group-hover:bg-blue-400'}`} />
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
                  <p className="text-slate-500 text-sm mb-4">{plan.desc}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">
                      {billingYearly ? plan.yearlyPrice : plan.price}
                    </span>
                    {plan.period && <span className="text-slate-400 mb-1">{plan.period}</span>}
                  </div>
                  {billingYearly && plan.name === 'Pro' && (
                    <p className="text-emerald-600 text-xs font-semibold mt-1">Billed $276/year (save $72)</p>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Check className={`w-4 h-4 flex-shrink-0 ${plan.popular ? 'text-blue-600' : 'text-emerald-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register"
                  className={`block w-full text-center px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95 ${plan.ctaStyle}`}>
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section className="py-24 bg-white" id="faq">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900">Got Questions?</h2>
          </motion.div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }} viewport={{ once: true }}
                className="border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-200 transition-colors">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-semibold text-slate-900 pr-4">{faq.q}</span>
                  <motion.div animate={{ rotate: openFaq === i ? 45 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
                    <ChevronDown className={`w-5 h-5 transition-colors ${openFaq === i ? 'text-blue-600' : 'text-slate-400'}`} />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 text-slate-500 leading-relaxed">{faq.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, #DBEAFE, #EFF6FF)' }} />
        </div>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">
            Ready to Webinar<br />Without the Stress?
          </h2>
          <p className="text-lg text-slate-500 mb-10">Join 2,000+ creators who've reclaimed their time.</p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:outline-none text-sm transition-colors"
            />
            <Link href="/register"
              className="flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30 whitespace-nowrap">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-4">No credit card required • Cancel anytime • Setup in 5 minutes</p>
        </motion.div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white fill-white" />
                </div>
                <span className="text-white text-xl font-bold">Zonvo</span>
              </div>
              <p className="text-sm leading-relaxed mb-5">
                The semi-live webinar platform for creators who want results without the live stress.
              </p>
              <div className="flex gap-3">
                {[Twitter, Linkedin, Youtube].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors hover:text-white">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap', 'API Docs'] },
              { title: 'Resources', links: ['Documentation', 'Blog', 'Help Center', 'Community', 'Status'] },
              { title: 'Company', links: ['About', 'Careers', 'Contact', 'Privacy', 'Terms'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-white font-semibold text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm hover:text-white transition-colors hover:underline">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <p>© 2026 Zonvo, Inc. All rights reserved.</p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 font-medium">All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
