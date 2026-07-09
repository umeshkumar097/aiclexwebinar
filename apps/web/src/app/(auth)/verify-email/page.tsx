'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  let token = searchParams.get('token');

  // Fallback for malformed URLs where '=' was encoded to '%3D' (e.g. by Gmail auto-linking)
  if (!token) {
    for (const [key] of Array.from(searchParams.entries())) {
      if (key.startsWith('token=')) {
        token = key.substring('token='.length);
        break;
      }
    }
  }

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resending' | 'resent'>('loading');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Missing verification token.');
      return;
    }

    const verify = async () => {
      try {
        await authApi.verifyEmail(token);
        setStatus('success');
        setTimeout(() => router.push('/login?verified=true'), 3000);
      } catch (err: any) {
        setStatus('error');
        setError(err?.message || 'Verification failed. The link may have expired.');
      }
    };

    void verify();
  }, [token, router]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('resending');

    try {
      await authApi.resendVerification(email);
      setStatus('resent');
    } catch {
      setStatus('error');
      setError('Failed to resend. Please try again.');
    }
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-violet-600 dark:text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Verifying your email…</h2>
          <p className="text-gray-500 dark:text-white/50 text-sm">This will only take a moment</p>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Email Verified!</h2>
          <p className="text-gray-500 dark:text-white/50 text-sm">Your account is now active. Redirecting to sign in…</p>
        </div>
        <div className="flex justify-center">
          <div className="w-32 h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
        <Link
          href="/login?verified=true"
          className="inline-block text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-medium transition-colors"
        >
          Go to Sign In →
        </Link>
      </div>
    );
  }

  // Resent state
  if (status === 'resent') {
    return (
      <div className="text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Email Sent!</h2>
          <p className="text-gray-500 dark:text-white/50 text-sm">Check your inbox for a new verification link.</p>
        </div>
        <Link href="/login" className="inline-block text-sm text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 font-medium transition-colors">
          Back to Sign In
        </Link>
      </div>
    );
  }

  // Error state with resend form
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto">
        <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Verification Failed</h2>
        <p className="text-gray-500 dark:text-white/50 text-sm">{error}</p>
      </div>

      <div className="border-t border-gray-200 dark:border-white/5 pt-6">
        <p className="text-sm text-gray-600 dark:text-white/60 mb-4">Enter your email to receive a new verification link</p>
        <form onSubmit={handleResend} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-violet-500/60 transition-all"
          />
          <button
            type="submit"
            disabled={status === 'resending'}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20"
          >
            {status === 'resending' ? 'Sending…' : 'Resend Verification Email'}
          </button>
        </form>
      </div>

      <Link href="/login" className="inline-block text-sm text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 transition-colors">
        Back to Sign In
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Email Verification</h1>
        <p className="text-gray-500 dark:text-white/50 text-sm">Confirming your account</p>
      </div>
      <Suspense fallback={
        <div className="flex justify-center py-8">
          <svg className="w-8 h-8 text-violet-600 dark:text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </>
  );
}
