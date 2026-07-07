'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Zap, Check } from 'lucide-react';
import { motion } from 'framer-motion';

import { authApi, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const registerSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(100),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export default function RegisterPage(): React.ReactElement {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  // Watch password for strength indicator
  const watchedPassword = watch('password', '');

  const onSubmit = async (data: RegisterForm): Promise<void> => {
    setServerError(null);
    try {
      await authApi.register({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-10 max-w-md w-full text-center space-y-6"
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: 'hsl(142 60% 40% / 0.1)', border: '2px solid hsl(142 60% 40% / 0.25)' }}
          >
            <Check className="w-8 h-8" style={{ color: 'hsl(142 60% 40%)' }} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Account Created!</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We&apos;ve sent a verification email to your inbox. Please verify your email address to activate your account.
            </p>
          </div>
          <button
            id="go-to-login"
            onClick={() => router.push('/login')}
            className="w-full py-3 rounded-xl font-bold text-sm text-white btn-glow shadow-md"
            style={{ background: 'linear-gradient(135deg, #5271ff, #5271ff)' }}
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2.5 justify-center mb-8"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg, #5271ff, #ff914d)' }}
          >
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="text-xl font-bold text-foreground">Zonvo</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card p-8 space-y-6"
        >
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
            <p className="text-sm text-muted-foreground">
              Join thousands of creators on Zonvo. Free to start.
            </p>
          </div>

          {/* Server Error */}
          {serverError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm"
              style={{
                background: 'hsl(0 84% 55% / 0.1)',
                border: '1px solid hsl(0 84% 55% / 0.25)',
                color: 'hsl(0 84% 45%)',
              }}
              role="alert"
            >
              {serverError}
            </motion.div>
          )}

          <form id="register-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Name Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="reg-first-name" className="text-sm font-medium text-foreground">
                  First name
                </label>
                <input
                  {...register('firstName')}
                  id="reg-first-name"
                  type="text"
                  autoComplete="given-name"
                  placeholder="John"
                  className={cn('input-field', errors.firstName && 'border-destructive')}
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? 'reg-first-name-error' : undefined}
                />
                {errors.firstName && (
                  <p id="reg-first-name-error" className="text-xs text-destructive" role="alert">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-last-name" className="text-sm font-medium text-foreground">
                  Last name
                </label>
                <input
                  {...register('lastName')}
                  id="reg-last-name"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Doe"
                  className={cn('input-field', errors.lastName && 'border-destructive')}
                  aria-invalid={!!errors.lastName}
                  aria-describedby={errors.lastName ? 'reg-last-name-error' : undefined}
                />
                {errors.lastName && (
                  <p id="reg-last-name-error" className="text-xs text-destructive" role="alert">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="text-sm font-medium text-foreground">
                Email address
              </label>
              <input
                {...register('email')}
                id="reg-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={cn('input-field', errors.email && 'border-destructive')}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'reg-email-error' : undefined}
              />
              {errors.email && (
                <p id="reg-email-error" className="text-xs text-destructive" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="reg-password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    onChange: (e) => setPasswordValue((e.target as HTMLInputElement).value),
                  })}
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  className={cn('input-field pr-11', errors.password && 'border-destructive')}
                  aria-invalid={!!errors.password}
                  aria-describedby="password-rules"
                />
                <button
                  type="button"
                  id="toggle-reg-password"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Rules */}
              {(watchedPassword.length > 0 || passwordValue.length > 0) && (
                <div id="password-rules" className="grid grid-cols-2 gap-1.5 mt-2">
                  {passwordRules.map((rule) => {
                    const passed = rule.test(watchedPassword || passwordValue);
                    return (
                      <div
                        key={rule.label}
                        className="flex items-center gap-1.5 text-xs"
                        style={{ color: passed ? 'hsl(142 60% 40%)' : 'hsl(220 15% 45%)' }}
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: passed
                              ? 'hsl(142 60% 40% / 0.1)'
                              : 'hsl(220 20% 90%)',
                            border: `1px solid ${passed ? 'hsl(142 60% 40% / 0.3)' : 'hsl(220 20% 80%)'}`,
                          }}
                        >
                          {passed && <Check className="w-2 h-2" style={{ color: 'hsl(142 60% 40%)' }} />}
                        </div>
                        {rule.label}
                      </div>
                    );
                  })}
                </div>
              )}

              {errors.password && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="reg-confirm-password" className="text-sm font-medium text-foreground">
                Confirm password
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  id="reg-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  className={cn('input-field pr-11', errors.confirmPassword && 'border-destructive')}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'reg-confirm-error' : undefined}
                />
                <button
                  type="button"
                  id="toggle-reg-confirm"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="reg-confirm-error" className="text-xs text-destructive" role="alert">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Terms */}
            <p className="text-xs text-muted-foreground">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>

            {/* Submit */}
            <button
              type="submit"
              id="register-submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed btn-glow flex items-center justify-center gap-2 shadow-md"
              style={{
                background: isSubmitting
                  ? '#5271ff'
                  : 'linear-gradient(135deg, #5271ff, #5271ff)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create free account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              id="login-link"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
