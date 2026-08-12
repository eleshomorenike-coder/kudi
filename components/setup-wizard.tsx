'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Sparkles, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useStore } from '@/lib/store'
import { ESSENTIAL_CATEGORIES, type BudgetSetup, type Period } from '@/lib/types'
import { formatNaira, periodLengthDays } from '@/lib/finance'
import { cn } from '@/lib/utils'

type EssentialKey = 'food' | 'transport' | 'data' | 'school' | 'personal'

const emptyEssentials: Record<EssentialKey, string> = {
  food: '',
  transport: '',
  data: '',
  school: '',
  personal: '',
}

export function SetupWizard() {
  const { saveSetup, loadDemoData } = useStore()
  const [step, setStep] = useState(0)
  const [income, setIncome] = useState('')
  const [period, setPeriod] = useState<Period>('monthly')
  const [essentials, setEssentials] = useState<Record<EssentialKey, string>>(emptyEssentials)
  const [savings, setSavings] = useState('')
  const [emergency, setEmergency] = useState('')

  const num = (v: string) => Math.max(0, Number(v) || 0)

  const essentialsTotal = useMemo(
    () => Object.values(essentials).reduce((s, v) => s + num(v), 0),
    [essentials],
  )
  const flexible = useMemo(
    () => num(income) - essentialsTotal - num(savings) - num(emergency),
    [income, essentialsTotal, savings, emergency],
  )
  const dailyLimit = flexible > 0 ? flexible / periodLengthDays(period) : 0

  const steps = ['Your money', 'Essentials', 'Savings & buffer', 'Your plan']

  function finish() {
    const setup: BudgetSetup = {
      income: num(income),
      period,
      startDate: new Date().toISOString(),
      essentials: {
        food: num(essentials.food),
        transport: num(essentials.transport),
        data: num(essentials.data),
        school: num(essentials.school),
        personal: num(essentials.personal),
      },
      savingsTarget: num(savings),
      emergencyBuffer: num(emergency),
    }
    saveSetup(setup)
  }

  const canContinue =
    (step === 0 && num(income) > 0) ||
    (step === 1 && essentialsTotal > 0 && essentialsTotal <= num(income)) ||
    step === 2 ||
    step === 3

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 py-8">
      <header className="mb-8 flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Wallet className="size-5" />
        </div>
        <div>
          <p className="font-mono text-sm font-semibold tracking-tight">KUDI</p>
          <p className="text-xs text-muted-foreground">Student money, made simple</p>
        </div>
      </header>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">{steps[step]}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {step + 1} / {steps.length}
          </p>
        </div>
        <Progress value={((step + 1) / steps.length) * 100} />
      </div>

      <Card className="flex-1 p-6">
        {step === 0 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-semibold text-balance">
                How much do you have to work with?
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                Enter the allowance you just received. We&apos;ll turn it into a safe amount you can
                spend each day.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="income">Money available</Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-muted-foreground">
                  ₦
                </span>
                <Input
                  id="income"
                  inputMode="numeric"
                  placeholder="50,000"
                  value={income}
                  onChange={(e) => setIncome(e.target.value.replace(/[^0-9]/g, ''))}
                  className="pl-8 font-mono text-lg"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>This money should last</Label>
              <div className="grid grid-cols-2 gap-3">
                {(['weekly', 'monthly'] as Period[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'rounded-xl border px-4 py-3 text-left transition-colors',
                      period === p
                        ? 'border-primary bg-accent text-accent-foreground'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    <span className="block text-sm font-semibold capitalize">
                      {p === 'weekly' ? 'A week' : 'A month'}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {periodLengthDays(p)} days
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-semibold text-balance">
                What are your must-pay expenses?
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                Estimate what you need for the basics this {period === 'weekly' ? 'week' : 'month'}.
                Leave any at zero if they don&apos;t apply.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {ESSENTIAL_CATEGORIES.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3">
                  <Label htmlFor={c.id} className="w-28 shrink-0">
                    {c.label}
                  </Label>
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                      ₦
                    </span>
                    <Input
                      id={c.id}
                      inputMode="numeric"
                      placeholder="0"
                      value={essentials[c.id as EssentialKey]}
                      onChange={(e) =>
                        setEssentials((prev) => ({
                          ...prev,
                          [c.id]: e.target.value.replace(/[^0-9]/g, ''),
                        }))
                      }
                      className="pl-8 font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm">
              <span className="text-muted-foreground">Essentials total</span>
              <span className="font-mono font-semibold">{formatNaira(essentialsTotal)}</span>
            </div>
            {essentialsTotal > num(income) && (
              <p className="text-sm text-danger">
                That&apos;s more than your {formatNaira(num(income))}. Trim a category to continue.
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-semibold text-balance">
                Set aside a little safety net
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                Optional, but powerful. Whatever&apos;s left becomes your flexible day-to-day money.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="savings">Savings goal for this {period === 'weekly' ? 'week' : 'month'}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-muted-foreground">
                  ₦
                </span>
                <Input
                  id="savings"
                  inputMode="numeric"
                  placeholder="5,000"
                  value={savings}
                  onChange={(e) => setSavings(e.target.value.replace(/[^0-9]/g, ''))}
                  className="pl-8 font-mono"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="emergency">Emergency buffer</Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-muted-foreground">
                  ₦
                </span>
                <Input
                  id="emergency"
                  inputMode="numeric"
                  placeholder="3,000"
                  value={emergency}
                  onChange={(e) => setEmergency(e.target.value.replace(/[^0-9]/g, ''))}
                  className="pl-8 font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                For the unexpected — a surprise fee, a sick day, a friend in need.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-semibold text-balance">Here&apos;s your plan</h1>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                This is the number to remember. Everything in the app builds on it.
              </p>
            </div>

            <div className="rounded-2xl bg-primary p-6 text-primary-foreground">
              <p className="flex items-center gap-1.5 text-sm opacity-90">
                <Sparkles className="size-4" /> Safe to spend each day
              </p>
              <p className="mt-1 font-mono text-5xl font-semibold tracking-tight">
                {formatNaira(dailyLimit)}
              </p>
              <p className="mt-1 text-sm opacity-90">
                from {formatNaira(flexible > 0 ? flexible : 0)} flexible over {periodLengthDays(period)}{' '}
                days
              </p>
            </div>

            <dl className="flex flex-col gap-2 text-sm">
              <Row label="Money available" value={formatNaira(num(income))} />
              <Row label="Planned essentials" value={formatNaira(essentialsTotal)} />
              <Row label="Savings goal" value={formatNaira(num(savings))} />
              <Row label="Emergency buffer" value={formatNaira(num(emergency))} />
              <Row
                label="Flexible spending"
                value={formatNaira(flexible > 0 ? flexible : 0)}
                strong
              />
            </dl>

            {flexible < 0 && (
              <p className="text-sm text-danger">
                Your essentials, savings and buffer add up to more than your allowance. Go back and
                adjust so there&apos;s room to spend.
              </p>
            )}
          </div>
        )}
      </Card>

      <div className="mt-6 flex items-center gap-3">
        {step > 0 && (
          <Button
            variant="outline"
            size="lg"
            className="h-11 px-4"
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft className="size-4" /> Back
          </Button>
        )}
        {step < 3 ? (
          <Button
            size="lg"
            className="h-11 flex-1"
            disabled={!canContinue}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            size="lg"
            className="h-11 flex-1"
            disabled={flexible < 0}
            onClick={finish}
          >
            <Check className="size-4" /> Start tracking
          </Button>
        )}
      </div>

      {step === 0 && (
        <button
          type="button"
          onClick={loadDemoData}
          className="mt-4 text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Just exploring? Load a demo budget with sample spending
        </button>
      )}
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg px-1 py-1.5',
        strong && 'bg-accent/60 px-3 font-semibold text-accent-foreground',
      )}
    >
      <dt className={cn('text-muted-foreground', strong && 'text-accent-foreground')}>{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  )
}
