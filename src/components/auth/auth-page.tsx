import { IconArrowLeft, IconArrowRight, IconEye, IconEyeOff } from '@tabler/icons-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';

import { BrandLockup } from '@/components/logo-icon';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'verify-email';
type FormFeedback = { kind: 'error' | 'notice'; message: string };

const PALETTE = ['#4558D8', '#E64C86', '#F4A40B', '#11A985', '#3883E8', '#8A5BE8'];

export function AuthPage({ mode, email }: { mode: AuthMode; email?: string }) {
  const isSignUp = mode === 'sign-up';
  const isSignIn = mode === 'sign-in';
  const isRecovery = mode === 'forgot-password';
  const isVerification = mode === 'verify-email';
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (isVerification) {
      const code = formData.get('code');
      if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
        setFeedback({ kind: 'error', message: 'Enter the 6-digit verification code.' });
        return;
      }
      setFeedback({
        kind: 'notice',
        message: 'Email verification is not connected yet. No code was checked.',
      });
      return;
    }

    if (isRecovery) {
      setFeedback({
        kind: 'notice',
        message: 'Password recovery is not connected yet. No email was sent.',
      });
      return;
    }

    if (isSignUp && formData.get('password') !== formData.get('confirm-password')) {
      setFeedback({ kind: 'error', message: 'Those passwords do not match.' });
      return;
    }

    if (isSignUp) {
      const emailValue = formData.get('email');
      void navigate({
        to: '/verify-email',
        search: { email: typeof emailValue === 'string' ? emailValue : '' },
      });
      return;
    }

    setFeedback({
      kind: 'notice',
      message: 'Authentication is not connected yet. No credentials were sent.',
    });
  };

  const eyebrow = isSignUp
    ? 'Create your workspace'
    : isSignIn
      ? 'Workspace access'
      : isRecovery
        ? 'Account recovery'
        : 'Email verification';
  const title = isSignUp
    ? 'Join Chroma.'
    : isSignIn
      ? 'Welcome back.'
      : isRecovery
        ? 'Reset your password.'
        : 'Verify your email.';
  const description = isSignUp
    ? 'Set up your account and start building your color library.'
    : isSignIn
      ? 'Sign in to return to your color workspace.'
      : isRecovery
        ? 'Enter the email address associated with your account.'
        : 'Enter the 6-digit code to confirm your email address.';

  return (
    <main className='min-h-svh bg-background text-foreground'>
      <header className='flex h-14 items-center justify-between border-b border-border px-4 sm:h-16 sm:px-8'>
        <BrandLockup compact />
        <Link
          to='/palette'
          className='inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground sm:text-sm'>
          <IconArrowLeft className='size-4' aria-hidden='true' />
          Back to Chroma
        </Link>
      </header>

      <div className='grid min-h-[calc(100svh-3.5rem)] lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]'>
        <aside className='relative hidden min-h-0 flex-col justify-between overflow-hidden border-r border-border bg-card p-8 lg:flex lg:p-12 xl:p-16'>
          <div className='flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase'>
            <span className='size-2 rounded-full bg-primary' />
            Chroma / Color workspace
          </div>

          <div className='my-12 max-w-xl'>
            <p className='font-mono text-[10px] font-semibold tracking-[0.18em] text-primary uppercase'>
              Space to explore
            </p>
            <h2 className='mt-5 font-display text-5xl leading-[1.02] font-bold xl:text-6xl'>
              Color with
              <br />
              <span className='text-primary'>intention.</span>
            </h2>
            <p className='mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground'>
              Your palettes, experiments, and color systems in one considered workspace.
            </p>
          </div>

          <div>
            <div className='grid h-36 grid-cols-6 gap-1.5 sm:h-44'>
              {PALETTE.map((color) => (
                <div key={color} className='rounded-sm' style={{ backgroundColor: color }} />
              ))}
            </div>
            <div className='mt-3 flex items-center justify-between border-t border-border pt-3 font-mono text-[9px] tracking-[0.12em] text-muted-foreground uppercase'>
              <span>Palette study / 001</span>
              <span>Six hues</span>
            </div>
          </div>
        </aside>

        <section className='flex min-w-0 flex-col justify-center'>
          <div className='mx-auto w-full max-w-110 px-5 py-8 sm:px-8 sm:py-12'>
            <div
              className='mb-8 flex h-1.5 overflow-hidden rounded-full lg:hidden'
              aria-hidden='true'>
              {PALETTE.map((color) => (
                <span key={color} className='flex-1' style={{ backgroundColor: color }} />
              ))}
            </div>

            <p className='font-mono text-[10px] font-semibold tracking-[0.16em] text-primary uppercase'>
              {eyebrow}
            </p>
            <h1 className='mt-3 font-display text-3xl leading-tight font-bold sm:text-4xl'>
              {title}
            </h1>
            <p className='mt-2 text-sm leading-relaxed text-muted-foreground'>{description}</p>

            <form className='mt-8 space-y-5' onSubmit={handleSubmit}>
              {isSignUp && (
                <div className='space-y-2'>
                  <Label htmlFor='full-name' className='text-xs font-semibold tracking-wide'>
                    Full name
                  </Label>
                  <Input
                    id='full-name'
                    name='name'
                    type='text'
                    autoComplete='name'
                    placeholder='Your name'
                    required
                    className='h-11 bg-background text-sm shadow-none'
                  />
                </div>
              )}

              {isVerification ? (
                <>
                  <div className='rounded-md border border-border bg-card px-3.5 py-3'>
                    <p className='text-[10px] font-semibold tracking-widest text-muted-foreground uppercase'>
                      Verification address
                    </p>
                    <p className='mt-1 truncate text-sm font-medium'>
                      {email || 'Your email address'}
                    </p>
                  </div>
                  <div className='space-y-2'>
                    <Label
                      htmlFor='verification-code'
                      className='text-xs font-semibold tracking-wide'>
                      Verification code
                    </Label>
                    <Input
                      id='verification-code'
                      name='code'
                      type='text'
                      inputMode='numeric'
                      autoComplete='one-time-code'
                      pattern='[0-9]{6}'
                      maxLength={6}
                      placeholder='000000'
                      required
                      className='h-12 bg-background text-center font-mono text-lg tracking-[0.35em] shadow-none'
                    />
                    <p className='text-xs leading-relaxed text-muted-foreground'>
                      Email delivery is not connected in this preview, so no code has been sent.
                    </p>
                  </div>
                </>
              ) : (
                <div className='space-y-2'>
                  <Label htmlFor='email' className='text-xs font-semibold tracking-wide'>
                    Email address
                  </Label>
                  <Input
                    id='email'
                    name='email'
                    type='email'
                    autoComplete='email'
                    placeholder='you@example.com'
                    defaultValue={email}
                    required
                    className='h-11 bg-background text-sm shadow-none'
                  />
                </div>
              )}

              {(isSignIn || isSignUp) && (
                <div className='space-y-2'>
                  <div className='flex items-center justify-between gap-3'>
                    <Label htmlFor='password' className='text-xs font-semibold tracking-wide'>
                      Password
                    </Label>
                    {isSignIn && (
                      <Link
                        to='/forgot-password'
                        className='text-xs font-semibold text-primary hover:underline'>
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <div className='relative'>
                    <Input
                      id='password'
                      name='password'
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      minLength={isSignUp ? 8 : undefined}
                      placeholder={isSignUp ? 'At least 8 characters' : 'Enter your password'}
                      required
                      className='h-11 bg-background pr-12 text-sm shadow-none'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon-sm'
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((visible) => !visible)}
                      className='absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground'>
                      {showPassword ? (
                        <IconEyeOff aria-hidden='true' />
                      ) : (
                        <IconEye aria-hidden='true' />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {isSignUp ? (
                <div className='space-y-2'>
                  <Label htmlFor='confirm-password' className='text-xs font-semibold tracking-wide'>
                    Confirm password
                  </Label>
                  <Input
                    id='confirm-password'
                    name='confirm-password'
                    type={showPassword ? 'text' : 'password'}
                    autoComplete='new-password'
                    minLength={8}
                    placeholder='Enter your password again'
                    required
                    className='h-11 bg-background text-sm shadow-none'
                  />
                </div>
              ) : isSignIn ? (
                <div className='flex items-center gap-2'>
                  <Checkbox
                    id='remember-me'
                    checked={remember}
                    onCheckedChange={(checked) => setRemember(checked === true)}
                  />
                  <Label
                    htmlFor='remember-me'
                    className='cursor-pointer text-xs text-muted-foreground'>
                    Remember me on this device
                  </Label>
                </div>
              ) : null}

              {feedback && (
                <p
                  role={feedback.kind === 'error' ? 'alert' : 'status'}
                  aria-live='polite'
                  className={
                    feedback.kind === 'error'
                      ? 'rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive'
                      : 'rounded-md border border-primary/25 bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground'
                  }>
                  {feedback.message}
                </p>
              )}

              <Button
                type='submit'
                size='lg'
                className='h-11 w-full justify-between px-4 font-semibold'>
                {isSignUp
                  ? 'Create account'
                  : isSignIn
                    ? 'Sign in'
                    : isRecovery
                      ? 'Send recovery link'
                      : 'Verify email'}
                <IconArrowRight className='size-4' aria-hidden='true' />
              </Button>
              {isVerification && (
                <button
                  type='button'
                  onClick={() =>
                    setFeedback({
                      kind: 'notice',
                      message: 'Email delivery is not connected yet. No code was sent.',
                    })
                  }
                  className='w-full cursor-pointer text-center text-xs font-semibold text-primary hover:underline'>
                  Resend code
                </button>
              )}
            </form>

            <p className='mt-7 text-center text-sm text-muted-foreground'>
              {isSignUp
                ? 'Already have an account?'
                : isSignIn
                  ? 'New to Chroma?'
                  : isRecovery
                    ? 'Remembered your password?'
                    : 'Need to change your email?'}{' '}
              <Link
                to={isSignIn || isVerification ? '/sign-up' : '/sign-in'}
                className='font-semibold text-primary hover:underline'>
                {isSignUp || isRecovery
                  ? 'Sign in'
                  : isVerification
                    ? 'Use another email'
                    : 'Create an account'}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
