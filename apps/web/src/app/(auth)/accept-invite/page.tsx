'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Loader2, CheckCircle2, Building, ShieldAlert } from 'lucide-react';

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loadingInfo, setLoadingInfo] = useState(true);
  const [infoError, setInfoError] = useState('');
  const [inviteInfo, setInviteInfo] = useState<{ email: string; firstName: string; invitedByEmail: string; userExists: boolean } | null>(null);

  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    if (!token) {
      setInfoError('Invalid or missing invitation token.');
      setLoadingInfo(false);
      return;
    }

    authApi.getInvitationInfo(token)
      .then((res) => {
        setInviteInfo(res);
      })
      .catch((err) => {
        setInfoError(err.message || 'Failed to load invitation info.');
      })
      .finally(() => {
        setLoadingInfo(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !inviteInfo) return;
    
    if (!inviteInfo.userExists && password.length < 8) {
      setSubmitError('Password must be at least 8 characters.');
      return;
    }

    if (!agreed) {
      setSubmitError('You must agree to the terms to continue.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      // Hold for 5 seconds as requested
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const res = await authApi.acceptInvite(token, password || undefined);
      
      // Update auth store
      login(res);

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to accept invitation.');
      setSubmitting(false);
    }
  };

  if (loadingInfo) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm">Loading invitation details...</p>
      </div>
    );
  }

  if (infoError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
          <ShieldAlert className="w-6 h-6 text-red-600" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Invitation Error</h2>
        <p className="text-muted-foreground text-sm">{infoError}</p>
        <Link href="/login" className="px-4 py-2 mt-4 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
          Go to Login
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Welcome to Zonvo!</h2>
        <p className="text-muted-foreground text-sm">Your invitation was accepted successfully. Redirecting you to your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Accept Invitation</h1>
        <p className="text-sm text-muted-foreground mt-2">
          You have been invited by <span className="font-semibold text-foreground">{inviteInfo?.invitedByEmail}</span>
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3 text-slate-800">
          <Building className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">Organization Agreement</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          By accepting this invitation, you agree that your billing will be managed by <span className="font-semibold">{inviteInfo?.invitedByEmail}</span>. 
          They will be responsible for your account's subscription. Furthermore, reports, meeting recordings, and webinar data may be shared with and managed by your organization administrator.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {!inviteInfo?.userExists && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Create a Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Min. 8 characters"
            />
            <p className="text-xs text-muted-foreground">Since you don't have an account, please set a password.</p>
          </div>
        )}

        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-slate-700 select-none">
            I agree to the organization terms and understand my billing and recordings will be managed by the administrator.
          </span>
        </label>

        {submitError && (
          <p className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !agreed}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing (Please wait)...
            </>
          ) : (
            'Agree and Join'
          )}
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
