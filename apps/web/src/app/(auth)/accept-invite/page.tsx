'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  Loader2,
  CheckCircle2,
  ShieldAlert,
  Building2,
  User,
  Mail,
  Calendar,
  Shield,
  ChevronDown,
  Lock,
  FileText,
  BarChart2,
  Video,
  UserCog,
  AlertTriangle,
  Briefcase,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────── */
interface InviteInfo {
  email: string;
  firstName: string;
  lastName?: string | null;
  invitedByEmail: string;
  invitedByName?: string;
  role: string;
  invitedAt: string;
  expiresAt: string;
  userExists: boolean;
}

/* ── Agreement Sections ─────────────────────────────────── */
const AGREEMENT_SECTIONS = [
  {
    id: 'billing',
    icon: FileText,
    title: 'Billing Management',
    content: `By accepting this invitation, I understand that my subscription, billing, invoices, payments, renewals, and plan management will be controlled by the organization administrator who invited me.\n\nI cannot directly modify organization billing while I remain under this managed workspace.`,
  },
  {
    id: 'invoice',
    icon: FileText,
    title: 'Invoice Ownership',
    content: `All invoices generated for organization services will belong to the managing administrator.\n\nInvoices may not be issued in my individual name unless I purchase my own independent subscription.`,
  },
  {
    id: 'subscription',
    icon: UserCog,
    title: 'Subscription Control',
    content: `The administrator may upgrade plans, downgrade plans, purchase licenses, remove licenses, assign licenses, cancel licenses, or renew subscriptions without requiring approval from invited members.`,
  },
  {
    id: 'reports',
    icon: BarChart2,
    title: 'Usage Reports',
    content: `I understand that my organization administrator may access usage reports including:\n• Meeting history\n• Webinar history\n• License usage\n• Storage usage\n• Device usage\n• Login history\n• Activity logs\n\nwhere permitted by the organization policy.`,
  },
  {
    id: 'recordings',
    icon: Video,
    title: 'Recording Sharing',
    content: `I understand that cloud recordings and related meeting assets may be visible to or managed by the organization administrator according to workspace policies.\n\nThis includes:\n• Cloud Recordings\n• Webinar Recordings\n• Meeting Chat\n• Attendance Reports\n• Registration Reports\n• Poll Reports\n• Q&A Reports\n• Analytics`,
  },
  {
    id: 'workspace',
    icon: Briefcase,
    title: 'Workspace Ownership',
    content: `This account becomes part of the organization's managed workspace.\n\nOwnership of workspace resources belongs to the organization administrator.`,
  },
  {
    id: 'privacy',
    icon: Shield,
    title: 'Privacy',
    content: `My data will be processed according to the organization's privacy policy.`,
  },
  {
    id: 'leaving',
    icon: AlertTriangle,
    title: 'Leaving the Organization',
    content: `If I leave this organization:\n• My managed license may be removed.\n• Organization-owned resources may no longer be accessible.\n• Billing responsibility may change.\n• Features may be downgraded depending on my new subscription.`,
  },
  {
    id: 'independent',
    icon: Lock,
    title: 'Independent Purchase',
    content: `If I purchase my own subscription directly from the platform instead of joining through an invitation:\n• I become the Billing Owner.\n• I control invoices.\n• I control subscription plans.\n• I control renewals.\n• I manage my own licenses.\n• No external administrator can control my billing.`,
  },
];

/* ── Loading Screen ──────────────────────────────────────── */
function JoiningScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)' }}>
      {/* Animated rings */}
      <div className="relative w-32 h-32 mb-10">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping"
            style={{ animationDelay: `${i * 0.4}s`, opacity: 0.3 - i * 0.08 }}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/40">
            <Building2 className="w-10 h-10 text-white" />
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">Joining Organization...</h2>
      <p className="text-blue-200 text-sm text-center max-w-xs leading-relaxed">
        Please wait while your workspace is being configured.
      </p>

      {/* Progress steps */}
      <div className="mt-10 flex flex-col gap-3 w-64">
        {[
          'Verifying agreement…',
          'Configuring workspace…',
          'Assigning your role…',
          'Setting up billing…',
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-600 animate-pulse"
              style={{ animationDelay: `${i * 0.6}s` }}
            >
              <span className="w-2 h-2 rounded-full bg-white" />
            </span>
            <span className="text-sm text-blue-200" style={{ animationDelay: `${i * 0.6}s` }}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Content ────────────────────────────────────────── */
function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const scrollRef = useRef<HTMLDivElement>(null);

  const [loadingInfo, setLoadingInfo] = useState(true);
  const [infoError, setInfoError] = useState('');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    if (!token) {
      setInfoError('Invalid or missing invitation token.');
      setLoadingInfo(false);
      return;
    }
    authApi.getInvitationInfo(token)
      .then((res) => setInviteInfo(res as unknown as InviteInfo))
      .catch((err: any) => setInfoError(err.message || 'This invitation link is invalid or has expired.'))
      .finally(() => setLoadingInfo(false));
  }, [token]);

  // Track scroll position to detect bottom
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 50) {
      setScrolledToBottom(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !inviteInfo) return;

    if (!inviteInfo.userExists && password.length < 8) {
      setSubmitError('Password must be at least 8 characters.');
      return;
    }
    if (!inviteInfo.userExists && password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }
    if (!agreed) {
      setSubmitError('You must accept the agreement to continue.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    // Show joining animation for 5 seconds as requested
    setJoining(true);
    await new Promise((r) => setTimeout(r, 5000));

    try {
      const res = await authApi.acceptInvite(token, password || undefined);
      login(res);
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 1000);
    } catch (err: any) {
      setJoining(false);
      setSubmitting(false);
      setSubmitError(err.message || 'Failed to accept invitation. Please try again.');
    }
  };

  /* ── Loading ── */
  if (loadingInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm text-slate-500">Loading invitation details…</p>
      </div>
    );
  }

  /* ── Error ── */
  if (infoError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
        <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Invitation Not Valid</h2>
        <p className="text-sm text-slate-500 max-w-sm">{infoError}</p>
        <Link href="/login"
          className="mt-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Go to Login
        </Link>
      </div>
    );
  }

  /* ── Success / Joining ── */
  if (joining || success) return <JoiningScreen />;

  const roleLabel = inviteInfo?.role
    ? inviteInfo.role.charAt(0).toUpperCase() + inviteInfo.role.slice(1)
    : 'Member';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc' }}>

      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Organization Invitation</p>
            <h1 className="text-sm font-bold text-slate-800">Accept Organization Invitation</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 pb-40">

        {/* ── Headline ── */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Accept Organization Invitation</h2>
          <p className="text-sm text-slate-500 mt-1">
            Before joining this organization, please review and accept the terms below.
          </p>
        </div>

        {/* ── Org Details Card ── */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 mb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Invitation Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: User, label: 'Invited For', value: `${inviteInfo?.firstName}${inviteInfo?.lastName ? ' ' + inviteInfo.lastName : ''}` },
              { icon: Mail, label: 'Email', value: inviteInfo?.email || '' },
              { icon: Building2, label: 'Invited By', value: inviteInfo?.invitedByName || inviteInfo?.invitedByEmail || '' },
              { icon: Mail, label: 'Admin Email', value: inviteInfo?.invitedByEmail || '' },
              { icon: Shield, label: 'Role Assigned', value: roleLabel },
              { icon: Calendar, label: 'Invitation Date', value: inviteInfo?.invitedAt ? new Date(inviteInfo.invitedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">{label}</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Agreement Scroll Box ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">Organization Terms & Conditions</h3>
            </div>
            {!scrolledToBottom && (
              <div className="flex items-center gap-1 text-xs text-blue-500 animate-bounce">
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Scroll to read all terms</span>
              </div>
            )}
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="overflow-y-auto"
            style={{ maxHeight: '400px' }}
          >
            <div className="px-5 py-4 space-y-6">
              {AGREEMENT_SECTIONS.map(({ id, icon: Icon, title, content }) => (
                <div key={id} className="pb-5 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-blue-50 rounded-md flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">{title}</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line pl-8">
                    {content}
                  </p>
                </div>
              ))}
              {/* Spacer to ensure scrolling reaches bottom */}
              <div className="h-2" />
            </div>
          </div>
        </div>

        {/* ── Password (new users only) ── */}
        {!inviteInfo?.userExists && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              Create Your Password
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky Footer ── */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-slate-200 shadow-2xl shadow-slate-900/10">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  agreed
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-slate-300 group-hover:border-blue-400'
                }`}
              >
                {agreed && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-slate-700 leading-snug select-none">
              I have read and agree to all{' '}
              <span className="font-semibold text-blue-600">Organization Terms & Conditions</span>.
              I understand that my billing, reports, and recordings may be managed by the organization administrator.
            </span>
          </label>

          {/* Error */}
          {submitError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              {submitError}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <Link
              href="/login"
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 text-center hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              onClick={handleSubmit as any}
              disabled={submitting || !agreed}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: agreed
                  ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                  : '#94a3b8',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Accept &amp; Join Organization
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page Export ────────────────────────────────────────── */
export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
