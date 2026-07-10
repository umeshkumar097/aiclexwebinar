'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Zap, ArrowRight, Star, Check } from 'lucide-react';
import { motion } from 'framer-motion';

import { authApi, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const STATS = [
  { value: '10K+', label: 'Webinars hosted' },
  { value: '2M+',  label: 'Attendees reached' },
  { value: '99.9%',label: 'Uptime SLA' },
];

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm): Promise<void> => {
    setServerError(null);
    try {
      const result = await authApi.login(data);
      login(result);
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans antialiased">

      {/* ── Left: Branding Panel ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #EFF6FF 0%, #F0F9FF 50%, #F5F3FF 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, #BFDBFE, transparent 70%)' }} />
          <div className="absolute bottom-20 right-0 w-80 h-80 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #DDD6FE, transparent 70%)' }} />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">Zonvo</span>
        </div>

        {/* Hero Copy */}
        <div className="relative space-y-8">
          <div>
            <h1 className="text-4xl xl:text-5xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
              The future of{' '}
              <span className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
                semi-live
              </span>{' '}
              webinars.
            </h1>
            <p className="mt-5 text-lg text-slate-500 leading-relaxed max-w-md">
              Pre-record your content, go live when it matters. Deliver a premium webinar experience at scale — without the stress.
            </p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-3">
            {STATS.map((s) => (
              <div key={s.label}
                className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl px-5 py-3.5 shadow-sm">
                <div className="text-2xl font-extrabold text-slate-900">{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Stars */}
          <div className="flex items-center gap-2">
            <div className="flex">{[1,2,3,4,5].map((i) => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}</div>
            <span className="text-sm text-slate-500 font-medium">Loved by 2,000+ creators</span>
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative">
          <blockquote className="bg-white/60 backdrop-blur-sm border border-slate-200 rounded-2xl p-5">
            <p className="text-slate-700 text-sm italic leading-relaxed mb-3">
              "Zonvo changed how we run webinars. Our show rate went from 30% to 80%."
            </p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">SM</div>
              <p className="text-xs text-slate-500 font-medium">Coach Sarah M., 12K students</p>
            </div>
          </blockquote>
        </div>
      </motion.div>

      {/* ── Right: Login Form ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white"
      >
        <div className="w-full max-w-md space-y-8">

          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-2.5 justify-center">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="text-xl font-extrabold text-slate-900">Zonvo</span>
          </div>

          {/* Header */}
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="mt-2 text-slate-500">Sign in to your Zonvo account to continue.</p>
          </div>

          {/* Server Error */}
          {serverError && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm bg-red-50 border border-red-200 text-red-600"
              role="alert">
              {serverError}
            </motion.div>
          )}

          {/* Form */}
          <form id="login-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-sm font-semibold text-slate-700">
                Email address
              </label>
              <input
                {...register('email')}
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={cn(
                  'w-full px-4 py-3 rounded-xl border-2 text-sm text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:border-blue-500 bg-white',
                  errors.email ? 'border-red-300 focus:border-red-400' : 'border-slate-200 hover:border-slate-300',
                )}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-semibold text-slate-700">
                  Password
                </label>
                <Link href="/forgot-password" id="forgot-password-link"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className={cn(
                    'w-full px-4 py-3 pr-12 rounded-xl border-2 text-sm text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:border-blue-500 bg-white',
                    errors.password ? 'border-red-300 focus:border-red-400' : 'border-slate-200 hover:border-slate-300',
                  )}
                  aria-invalid={!!errors.password}
                />
                <button type="button" id="toggle-password-visibility"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm rounded-xl transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:scale-100"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
              ) : (
                <><span>Sign in</span><ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Register Link */}
          <p className="text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" id="register-link"
              className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
              Create one for free →
            </Link>
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {['No credit card', 'Free forever plan', 'Cancel anytime'].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-xs text-slate-400">
                <Check className="w-3.5 h-3.5 text-emerald-500" />{t}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
