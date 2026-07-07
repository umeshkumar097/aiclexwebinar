import type { Metadata } from 'next';
import Link from 'next/link';
import { Zap, Play, BarChart3, Shield, Globe2, ArrowRight, Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Zonvo — Enterprise Semi-Live Webinar Platform',
  description:
    'The most powerful semi-live webinar platform. Pre-record your content, go live when it matters. Trusted by 50K+ creators worldwide.',
};

const features = [
  {
    icon: Play,
    title: 'Semi-Live Webinars',
    description:
      'Pre-record your content and schedule it as a live-feeling webinar. Go live at any point for real-time interaction.',
  },
  {
    icon: Zap,
    title: 'Hybrid Live Takeover',
    description:
      'Seamlessly switch from pre-recorded content to a live session with a single click — no interruption for attendees.',
  },
  {
    icon: BarChart3,
    title: 'Enterprise Analytics',
    description:
      'Deep attendance heatmaps, watch-rate curves, engagement scores, and conversion tracking built-in.',
  },
  {
    icon: Shield,
    title: 'RBAC & Multi-Org',
    description:
      'Granular role-based access control across unlimited organizations. Perfect for agencies and resellers.',
  },
  {
    icon: Globe2,
    title: 'API-First',
    description:
      'Full REST API with webhooks, SDKs, and Zapier integration. Build custom workflows and white-label solutions.',
  },
];

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'For individuals getting started',
    features: ['3 webinars', '100 attendees/webinar', '5 GB storage', 'Basic analytics'],
    cta: 'Start for free',
    highlighted: false,
    id: 'plan-free',
  },
  {
    name: 'Pro',
    price: '$99',
    period: '/month',
    description: 'For serious creators and businesses',
    features: [
      '50 webinars',
      '2,000 attendees/webinar',
      '100 GB storage',
      'Advanced analytics',
      'Custom branding',
      'WhatsApp notifications',
      'API access',
      'Certificate issuance',
    ],
    cta: 'Start Pro trial',
    highlighted: true,
    id: 'plan-pro',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: [
      'Unlimited webinars',
      'Unlimited attendees',
      'Unlimited storage',
      'White-label',
      'Dedicated support',
      'SLA guarantee',
      'Custom integrations',
    ],
    cta: 'Contact sales',
    highlighted: false,
    id: 'plan-enterprise',
  },
];

export default function HomePage(): React.ReactElement {
  return (
    <div className="min-h-screen">
      {/* ─── Navbar ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/50" style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(12px)' }}>
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" id="nav-logo" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: 'linear-gradient(135deg, #1d6fe8, #f4b413)' }}
            >
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="font-bold text-foreground">Zonvo</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#features" id="nav-features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#pricing" id="nav-pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/docs" id="nav-docs" className="hover:text-foreground transition-colors">Docs</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              id="nav-login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              id="nav-register"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white btn-glow shadow-sm"
              style={{ background: 'linear-gradient(135deg, #1d6fe8, #3b82f6)' }}
            >
              Get started free
            </Link>
          </div>
        </nav>
      </header>

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative py-24 lg:py-36 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-15" style={{ background: '#1d6fe8' }} />
          <div className="absolute bottom-0 right-1/4 translate-x-1/4 w-[500px] h-[500px] rounded-full blur-3xl opacity-10" style={{ background: '#f4b413' }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{ background: 'hsl(217 91% 60% / 0.1)', border: '1px solid hsl(217 91% 60% / 0.3)', color: 'hsl(217 91% 40%)' }}
          >
            <Zap className="w-3 h-3" />
            Now in public beta — free forever
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight text-balance">
            The future of{' '}
            <span className="gradient-text">semi-live</span>{' '}
            webinars is here.
          </h1>

          <p className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance">
            Pre-record your content, schedule it like a live event, and go live whenever you want.
            Deliver a premium webinar experience at massive scale — without the stress.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              id="hero-cta-primary"
              className="px-8 py-3.5 rounded-xl text-base font-semibold text-white btn-glow flex items-center gap-2 shadow-md"
              style={{ background: 'linear-gradient(135deg, #1d6fe8, #3b82f6)' }}
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#features"
              id="hero-cta-secondary"
              className="px-8 py-3.5 rounded-xl text-base font-semibold text-foreground bg-white hover:bg-gray-50 transition-colors border border-border"
            >
              See how it works
            </Link>
          </div>

          {/* Social Proof */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> Free forever plan</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> Set up in 5 minutes</span>
          </div>
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 border-t border-border/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Everything you need</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Built for coaches, educators, and enterprises who need a reliable, scalable webinar platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <div
                key={i}
                id={`feature-${i}`}
                className="glass-card p-6 space-y-3 hover:border-primary/30 transition-colors"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'hsl(217 91% 60% / 0.1)' }}
                >
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 border-t border-border/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Simple, transparent pricing</h2>
            <p className="mt-4 text-muted-foreground">Start free. Scale as you grow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                id={plan.id}
                className={`glass-card p-6 flex flex-col gap-6 ${plan.highlighted ? 'border-primary' : ''}`}
                style={plan.highlighted ? { borderColor: '#1d6fe8', boxShadow: '0 8px 32px rgba(29, 111, 232, 0.1)' } : {}}
              >
                {plan.highlighted && (
                  <div
                    className="text-center py-1 rounded-full text-xs font-semibold text-white -mt-2 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #1d6fe8, #f4b413)' }}
                  >
                    Most Popular
                  </div>
                )}

                <div>
                  <h3 className="font-bold text-foreground">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.name === 'Enterprise' ? '/contact' : '/register'}
                  id={`${plan.id}-cta`}
                  className={`py-2.5 rounded-lg text-sm font-semibold text-center transition-all ${
                    plan.highlighted
                      ? 'text-white btn-glow shadow-md'
                      : 'text-foreground border border-border bg-white hover:bg-gray-50'
                  }`}
                  style={
                    plan.highlighted
                      ? { background: 'linear-gradient(135deg, #1d6fe8, #3b82f6)' }
                      : {}
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #1d6fe8, #f4b413)' }}>
              <Zap className="w-3.5 h-3.5 text-white" fill="white" />
            </div>
            <span className="font-bold text-foreground text-sm">Zonvo</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Zonvo. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/privacy" id="footer-privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" id="footer-terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/contact" id="footer-contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
