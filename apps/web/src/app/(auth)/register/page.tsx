'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Zap, ArrowRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';

import { authApi, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const registerSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(100),
    lastName:  z.string().min(2, 'Last name must be at least 2 characters').max(100),
    email:     z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const passwordRules = [
  { label: 'At least 8 characters',  test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter',   test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number',             test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character',  test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function RegisterPage(): React.ReactElement {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const watchedPassword = watch('password', '');

  const onSubmit = async (data: RegisterForm): Promise<void> => {
    setServerError(null);
    try {
      await authApi.register({ email: data.email, password: data.password, firstName: data.firstName, lastName: data.lastName });
      setRegisteredEmail(data.email);
      setSuccess(true);
      setResendCooldown(60);
      const tick = setInterval(() => {
        setResendCooldown((c) => { if (c <= 1) { clearInterval(tick); return 0; } return c - 1; });
      }, 1000);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'An unexpected error occurred. Please try again.');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading || !registeredEmail) return;
    setResendLoading(true);
    try {
      await authApi.resendVerification(registeredEmail);
      setResendDone(true);
      setResendCooldown(60);
      const tick = setInterval(() => {
        setResendCooldown((c) => { if (c <= 1) { clearInterval(tick); return 0; } return c - 1; });
      }, 1000);
      setTimeout(() => setResendDone(false), 3000);
    } catch { /* ignore */ } finally {
      setResendLoading(false);
    }
  };

  // ── Success State ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 font-sans antialiased"
        style={{ background: 'linear-gradient(160deg, #EFF6FF 0%, #FFFFFF 60%, #F5F3FF 100%)' }}>
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl opacity-25"
            style={{ background: '#BFDBFE' }} />
        </div>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 text-center space-y-6">

          {/* Icon */}
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/25"
            style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-900">Check your email! 📬</h2>
            <p className="text-slate-500 text-sm">We&apos;ve sent a verification link to:</p>
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
              <span className="text-blue-600 font-bold text-sm">{registeredEmail}</span>
            </div>
          </div>

          <div className="text-left space-y-2.5">
            {[
              { icon: '📥', text: 'Open your email inbox' },
              { icon: '🔗', text: 'Click the verification link from Zonvo' },
              { icon: '✅', text: 'Come back and sign in to your account' },
            ].map((s) => (
              <div key={s.text} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <span className="text-lg">{s.icon}</span>
                <span className="text-slate-700 text-sm">{s.text}</span>
              </div>
            ))}
          </div>

          <button id="go-to-login" onClick={() => router.push('/login')}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98]">
            Go to Sign in <ArrowRight className="w-4 h-4" />
          </button>

          <div className="space-y-1.5">
            <p className="text-slate-400 text-xs">Didn&apos;t receive it? Check your spam folder, or</p>
            <button id="resend-verification" onClick={() => void handleResend()}
              disabled={resendCooldown > 0 || resendLoading}
              className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50">
              {resendLoading ? 'Sending…' : resendDone ? '✓ Sent!' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification email'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Register Form ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-white font-sans antialiased">

      {/* ── Left: Brand Panel ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-[42%] xl:w-[45%] flex-col justify-between p-12 relative overflow-hidden flex-shrink-0"
        style={{ background: 'linear-gradient(160deg, #EFF6FF 0%, #F0F9FF 50%, #F5F3FF 100%)' }}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, #BFDBFE, transparent 70%)' }} />
          <div className="absolute bottom-20 right-0 w-72 h-72 rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, #DDD6FE, transparent 70%)' }} />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">Zonvo</span>
        </div>

        {/* Hero */}
        <div className="relative space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-xs font-semibold mb-5">
              ✨ Join 2,000+ creators
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
              Start for{' '}
              <span className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
                free.
              </span>
              <br />Scale when ready.
            </h1>
            <p className="mt-5 text-lg text-slate-500 leading-relaxed max-w-sm">
              Set up your first semi-live webinar in under 5 minutes. No credit card required.
            </p>
          </div>

          {/* Benefit list */}
          <ul className="space-y-3">
            {[
              '3 free webinars, forever',
              'Up to 100 attendees per session',
              'Real-time chat & Q&A',
              'Basic analytics included',
            ].map((b) => (
              <li key={b} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-slate-700 text-sm font-medium">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom quote */}
        <div className="relative">
          <blockquote className="bg-white/60 backdrop-blur-sm border border-slate-200 rounded-2xl p-5">
            <p className="text-slate-700 text-sm italic leading-relaxed mb-3">
              "Setup took 4 minutes. My first webinar had 320 attendees. I was floored."
            </p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">JR</div>
              <p className="text-xs text-slate-500 font-medium">James R. — Business Coach</p>
            </div>
          </blockquote>
        </div>
      </motion.div>

      {/* ── Right: Form ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1 flex items-start justify-center p-6 py-10 lg:p-12 bg-white overflow-y-auto"
      >
        <div className="w-full max-w-lg space-y-7">

          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-2.5 justify-center">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="text-xl font-extrabold text-slate-900">Zonvo</span>
          </div>

          {/* Header */}
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create your account</h1>
            <p className="mt-2 text-slate-500">Join thousands of creators on Zonvo. Free to start.</p>
          </div>

          {/* Server Error */}
          {serverError && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="px-4 py-3 rounded-xl text-sm bg-red-50 border border-red-200 text-red-600" role="alert">
              {serverError}
            </motion.div>
          )}

          <form id="register-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="reg-first-name" className="text-sm font-semibold text-slate-700">First name</label>
                <input {...register('firstName')} id="reg-first-name" type="text" autoComplete="given-name"
                  placeholder="John"
                  className={cn('w-full px-4 py-3 rounded-xl border-2 text-sm text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:border-blue-500 bg-white',
                    errors.firstName ? 'border-red-300' : 'border-slate-200 hover:border-slate-300')}
                  aria-invalid={!!errors.firstName} />
                {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reg-last-name" className="text-sm font-semibold text-slate-700">Last name</label>
                <input {...register('lastName')} id="reg-last-name" type="text" autoComplete="family-name"
                  placeholder="Doe"
                  className={cn('w-full px-4 py-3 rounded-xl border-2 text-sm text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:border-blue-500 bg-white',
                    errors.lastName ? 'border-red-300' : 'border-slate-200 hover:border-slate-300')}
                  aria-invalid={!!errors.lastName} />
                {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="text-sm font-semibold text-slate-700">Email address</label>
              <input {...register('email')} id="reg-email" type="email" autoComplete="email"
                placeholder="you@example.com"
                className={cn('w-full px-4 py-3 rounded-xl border-2 text-sm text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:border-blue-500 bg-white',
                  errors.email ? 'border-red-300' : 'border-slate-200 hover:border-slate-300')}
                aria-invalid={!!errors.email} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="reg-password" className="text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input {...register('password', { onChange: (e) => setPasswordValue((e.target as HTMLInputElement).value) })}
                  id="reg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="Create a strong password"
                  className={cn('w-full px-4 py-3 pr-12 rounded-xl border-2 text-sm text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:border-blue-500 bg-white',
                    errors.password ? 'border-red-300' : 'border-slate-200 hover:border-slate-300')}
                  aria-invalid={!!errors.password} aria-describedby="password-rules" />
                <button type="button" id="toggle-reg-password" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength */}
              {(watchedPassword.length > 0 || passwordValue.length > 0) && (
                <div id="password-rules" className="grid grid-cols-2 gap-1.5 mt-2">
                  {passwordRules.map((rule) => {
                    const ok = rule.test(watchedPassword || passwordValue);
                    return (
                      <div key={rule.label} className="flex items-center gap-1.5 text-xs"
                        style={{ color: ok ? '#059669' : '#94a3b8' }}>
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: ok ? '#d1fae5' : '#f1f5f9', border: `1px solid ${ok ? '#6ee7b7' : '#e2e8f0'}` }}>
                          {ok && <Check className="w-2 h-2 text-emerald-600" />}
                        </div>
                        {rule.label}
                      </div>
                    );
                  })}
                </div>
              )}
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="reg-confirm-password" className="text-sm font-semibold text-slate-700">Confirm password</label>
              <div className="relative">
                <input {...register('confirmPassword')} id="reg-confirm-password"
                  type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="Repeat your password"
                  className={cn('w-full px-4 py-3 pr-12 rounded-xl border-2 text-sm text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:border-blue-500 bg-white',
                    errors.confirmPassword ? 'border-red-300' : 'border-slate-200 hover:border-slate-300')}
                  aria-invalid={!!errors.confirmPassword} />
                <button type="button" id="toggle-reg-confirm" onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p id="reg-confirm-error" className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            {/* Terms */}
            <p className="text-xs text-slate-400 leading-relaxed">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-blue-600 hover:underline font-medium">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline font-medium">Privacy Policy</Link>.
            </p>

            {/* Submit */}
            <button type="submit" id="register-submit" disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm rounded-xl transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:scale-100">
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Creating account…</>
              ) : (
                <><span>Create free account</span><ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" id="login-link" className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
              Sign in →
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
