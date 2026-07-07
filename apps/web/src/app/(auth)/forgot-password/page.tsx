'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Zap, ArrowLeft, MailCheck } from 'lucide-react';
import { motion } from 'framer-motion';

import { authApi, ApiError } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage(): React.ReactElement {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form): Promise<void> => {
    setServerError(null);
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('An unexpected error occurred.');
      }
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-10 max-w-md w-full text-center space-y-6"
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: 'rgba(82, 113, 255, 0.1)', border: '2px solid rgba(82, 113, 255, 0.25)' }}
          >
            <MailCheck className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Check your email</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              If an account exists for <strong className="text-foreground">{getValues('email')}</strong>,
              you&apos;ll receive a password reset link within a few minutes.
            </p>
          </div>
          <Link
            href="/login"
            id="back-to-login-from-sent"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="flex items-center gap-2.5 justify-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg, #5271ff, #ff914d)' }}
          >
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="text-xl font-bold text-foreground">Zonvo</span>
        </div>

        <div className="glass-card p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Forgot your password?</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a secure reset link.
            </p>
          </div>

          {serverError && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{
                background: 'hsl(0 84% 55% / 0.1)',
                border: '1px solid hsl(0 84% 55% / 0.25)',
                color: 'hsl(0 84% 45%)',
              }}
              role="alert"
            >
              {serverError}
            </div>
          )}

          <form id="forgot-password-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className="text-sm font-medium text-foreground">
                Email address
              </label>
              <input
                {...register('email')}
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="input-field"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'forgot-email-error' : undefined}
              />
              {errors.email && (
                <p id="forgot-email-error" className="text-xs text-destructive" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              id="forgot-password-submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-60 btn-glow flex items-center justify-center gap-2 shadow-md"
              style={{ background: 'linear-gradient(135deg, #5271ff, #5271ff)' }}
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
              ) : (
                'Send reset link'
              )}
            </button>
          </form>

          <Link
            href="/login"
            id="back-to-login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
