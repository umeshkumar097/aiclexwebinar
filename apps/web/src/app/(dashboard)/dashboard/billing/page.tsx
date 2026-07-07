'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Zap,
  Crown,
  Building2,
  FileText,
  CreditCard,
  X,
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  borderColor: string;
  badge?: string;
  features: string[];
  cta: string;
  current?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'plan-free',
    name: 'Free',
    price: '$0',
    period: '/month',
    icon: Zap,
    iconColor: '#5271ff',
    iconBg: 'rgba(82, 113, 255, 0.1)',
    borderColor: 'rgba(82, 113, 255, 0.2)',
    current: true,
    features: [
      '1 webinar / month',
      '50 attendees max',
      '1 GB storage',
      'Basic analytics',
      'Standard support',
    ],
    cta: 'Current Plan',
  },
  {
    id: 'plan-pro',
    name: 'Pro',
    price: '$49',
    period: '/month',
    icon: Crown,
    iconColor: '#ff914d',
    iconBg: 'rgba(255, 145, 77, 0.1)',
    borderColor: 'rgba(255, 145, 77, 0.3)',
    badge: 'Most Popular',
    features: [
      '10 webinars / month',
      '500 attendees max',
      '10 GB storage',
      'Advanced analytics',
      'Email reminders',
      'Custom branding',
      'Recordings (30 days)',
    ],
    cta: 'Upgrade to Pro',
  },
  {
    id: 'plan-business',
    name: 'Business',
    price: '$149',
    period: '/month',
    icon: Building2,
    iconColor: '#5271ff',
    iconBg: 'rgba(82, 113, 255, 0.15)',
    borderColor: 'rgba(82, 113, 255, 0.4)',
    features: [
      'Unlimited webinars',
      '2,000 attendees max',
      '100 GB storage',
      'All Pro features',
      'Priority support',
      'White-label branding',
      'API access',
      'Custom domain',
    ],
    cta: 'Upgrade to Business',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function BillingPage(): React.ReactElement {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border backdrop-blur-md text-foreground text-sm font-medium shadow-md bg-white border-slate-200 animate-in slide-in-from-top-2 duration-300">
          <span>🚀</span>
          <span>{toast}</span>
        </div>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* ─── Header ──────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-primary" />
            Billing & Plans
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your subscription and billing details.
          </p>
        </motion.div>

        {/* ─── Current Plan Banner ──────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div
            className="glass-card p-5 flex items-center gap-4"
            style={{
              background: '#ffffff',
              borderColor: 'rgba(82, 113, 255, 0.2)',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(82, 113, 255, 0.1)' }}
            >
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="text-lg font-bold text-foreground">Free Plan</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                1 webinar/month · 50 attendees · 1 GB storage
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Active
            </span>
          </div>
        </motion.div>

        {/* ─── Plan Cards ─────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <h2 className="text-sm font-semibold text-foreground mb-4">Compare Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                id={plan.id}
                className="glass-card p-6 flex flex-col relative overflow-hidden"
                style={{ borderColor: plan.current ? plan.borderColor : undefined }}
              >
                {/* Badge */}
                {plan.badge && (
                  <span
                    className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255, 145, 77, 0.15)', color: '#d97706' }}
                  >
                    {plan.badge}
                  </span>
                )}

                {/* Icon + Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: plan.iconBg }}
                  >
                    <plan.icon className="w-5 h-5" style={{ color: plan.iconColor }} />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-xl font-extrabold text-foreground">{plan.price}</span>
                      {plan.period}
                    </p>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1 mb-5">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: plan.iconColor }} />
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {plan.current ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-muted-foreground bg-slate-50 border border-slate-200 cursor-default"
                  >
                    ✓ Current Plan
                  </button>
                ) : (
                  <button
                    id={`upgrade-${plan.id}`}
                    onClick={() =>
                      showToast(`${plan.name} plan is Coming Soon! We'll notify you when it's available.`)
                    }
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm hover:opacity-90 active:scale-[0.98]"
                    style={{
                      background: `linear-gradient(135deg, ${plan.iconColor}, ${
                        plan.id === 'plan-pro'
                          ? '#5271ff'
                          : '#5271ff'
                      })`,
                    }}
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─── Invoice History ──────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40 flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Invoice History</h2>
            </div>
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(82, 113, 255, 0.08)' }}
              >
                <FileText className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No invoices yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your billing history will appear here once you upgrade.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Payment Method ────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40 flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Payment Method</h2>
            </div>
            <div className="p-5 flex items-center gap-3 text-muted-foreground text-sm">
              <X className="w-4 h-4" />
              No payment method on file.
              <button
                onClick={() =>
                  showToast('Payment method management is Coming Soon!')
                }
                className="ml-auto text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Add payment method →
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
