'use client'

import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'signup'

const perks = [
  'Turn your allowance into a safe daily number',
  'Catch money leaks before they add up',
  'Get encouraging, personal money advice',
]

export function AuthScreen() {
  const { logIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res =
      mode === 'signup'
        ? await signUp(name, email, password)
        : await logIn(email, password)
    if (!res.ok) {
      setError(res.error ?? 'Something went wrong.')
      setBusy(false)
    }
    // On success the provider swaps this screen out, so no reset needed.
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary-foreground/15">
            <Wallet className="size-5" />
          </div>
          <div>
            <p className="font-mono text-sm font-semibold tracking-tight">KUDI</p>
            <p className="text-xs opacity-80">Money, made simple</p>
          </div>
        </div>

        <div className="max-w-sm">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">
            <ShieldCheck className="size-3.5" /> Built for students
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-balance">
            Spend with confidence, save without stress.
          </h1>
          <ul className="mt-6 flex flex-col gap-3">
            {perks.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm opacity-95">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-foreground" />
                <span className="text-pretty">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs opacity-70">Your data stays private on your device.</p>
      </section>

      {/* Form panel */}
      <section className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Wallet className="size-4" />
            </div>
            <span className="font-mono text-sm font-semibold">KUDI</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-balance">
                {mode === 'signup' ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                {mode === 'signup'
                  ? 'Start managing your money in under a minute.'
                  : 'Log in to pick up where you left off.'}
              </p>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4">
              {mode === 'signup' && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="e.g. Ada"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-danger/12 px-3 py-2 text-sm font-medium text-danger text-pretty">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="h-11" disabled={busy}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                    mode === 'signup' ? 'Create account' : 'Log in'
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')}
                className={cn('font-semibold text-primary hover:underline')}
              >
                {mode === 'signup' ? 'Log in' : 'Sign up'}
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
