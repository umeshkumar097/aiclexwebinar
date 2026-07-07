'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

import { authApi, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
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
        console.error('[Login] Unexpected error:', err);
        setServerError(
          err instanceof Error
            ? `Error: ${err.message}`
            : 'An unexpected error occurred. Please try again.',
        );
      }
    }
  };


  return (
    <div className="min-h-screen flex">
      {/* ─── Left — Branding Panel ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, hsl(262 83% 8%) 0%, hsl(217 91% 5%) 100%)',
        }}
      >
        {/* Background blobs */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ background: 'hsl(262 83% 67%)' }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-15"
            style={{ background: 'hsl(217 91% 60%)' }}
          />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, hsl(262 83% 67%), hsl(217 91% 60%))',
            }}
          >
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Zonvo</span>
        </div>

        {/* Hero Content */}
        <div className="relative space-y-8">
          <div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              The future of{' '}
              <span className="gradient-text">semi-live</span>{' '}
              webinars.
            </h1>
            <p className="mt-4 text-lg text-white/60 max-w-md leading-relaxed">
              Pre-record your content, go live when it matters. Deliver a
              premium webinar experience at scale — without the stress.
            </p>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Webinars hosted', value: '50K+' },
              { label: 'Attendees served', value: '2M+' },
              { label: 'Avg. show rate', value: '78%' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass-card px-4 py-3 flex flex-col gap-0.5"
              >
                <span className="text-xl font-bold text-white">{stat.value}</span>
                <span className="text-xs text-white/50">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer quote */}
        <div className="relative">
          <blockquote className="text-sm text-white/40 italic">
            &ldquo;Zonvo changed how we run webinars. Our show rate went from 30% to 80%.&rdquo;
          </blockquote>
          <p className="mt-2 text-xs text-white/30">— Coach Sarah M., 12K students</p>
        </div>
      </motion.div>

      {/* ─── Right — Login Form ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        className="flex-1 flex items-center justify-center p-6 lg:p-12"
      >
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-2.5 justify-center">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, hsl(262 83% 67%), hsl(217 91% 60%))',
              }}
            >
              <Zap className="w-4.5 h-4.5 text-white" fill="white" />
            </div>
            <span className="text-lg font-bold text-white">Zonvo</span>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground text-sm">
              Sign in to your Zonvo account to continue.
            </p>
          </div>

          {/* Form */}
          <form id="login-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Server Error */}
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm"
                style={{
                  background: 'hsl(0 84% 60% / 0.12)',
                  border: '1px solid hsl(0 84% 60% / 0.3)',
                  color: 'hsl(0 84% 70%)',
                }}
                role="alert"
              >
                <span>{serverError}</span>
              </motion.div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="text-sm font-medium text-foreground"
              >
                Email address
              </label>
              <input
                {...register('email')}
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={cn(
                  'input-field',
                  errors.email && 'border-destructive focus:border-destructive',
                )}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p id="login-email-error" className="text-xs text-destructive mt-1" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  id="forgot-password-link"
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    'input-field pr-11',
                    errors.password && 'border-destructive',
                  )}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  id="toggle-password-visibility"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="login-password-error" className="text-xs text-destructive mt-1" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-lg font-semibold text-sm text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed btn-glow flex items-center justify-center gap-2"
              style={{
                background: isSubmitting
                  ? 'hsl(262 83% 55%)'
                  : 'linear-gradient(135deg, hsl(262 83% 67%), hsl(217 91% 60%))',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Register Link */}
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              id="register-link"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Create one for free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
