'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Keyboard,
  Mic,
  PiggyBank,
  Shield,
  TrendingUp,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StatusPill } from '@/components/status-pill'
import { QuickAdd } from '@/components/quick-add'
import { VoiceAdd } from '@/components/voice-add'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import type { ViewId } from '@/components/app-shell'
import {
  computeDailyStatus,
  detectLeaks,
  expensesInCurrentPeriod,
  flexiblePool,
  formatNaira,
  periodProgress,
  spentByCategory,
} from '@/lib/finance'

const statusBg: Record<string, string> = {
  safe: 'bg-safe',
  caution: 'bg-caution',
  danger: 'bg-danger',
}
const statusFg: Record<string, string> = {
  safe: 'text-safe-foreground',
  caution: 'text-caution-foreground',
  danger: 'text-danger-foreground',
}

export function Overview({ goTo }: { goTo: (v: ViewId) => void }) {
  const { setup, expenses, goal } = useStore()
  const [logMode, setLogMode] = useState<'speak' | 'type'>('speak')
  if (!setup) return null

  const status = computeDailyStatus(setup, expenses)
  const pool = flexiblePool(setup)
  const periodExpenses = expensesInCurrentPeriod(setup, expenses)
  const flexSpent = periodExpenses.reduce((s, e) => s + e.amount, 0)
  const flexRemaining = Math.max(pool - flexSpent, 0)
  const progress = periodProgress(setup)
  const leaks = detectLeaks(setup, expenses)
  const byCat = spentByCategory(periodExpenses)

  return (
    <div className="flex flex-col gap-5">
      {/* Hero daily limit */}
      <Card className={`overflow-hidden ${statusBg[status.level]} ${statusFg[status.level]} border-0`}>
        <div className="p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium opacity-90">Safe to spend today</p>
            <span className="rounded-full bg-black/10 px-2.5 py-1 text-xs font-semibold">
              Day {progress.daysElapsed + 1} of {progress.totalDays}
            </span>
          </div>
          <p className="mt-2 font-mono text-6xl font-semibold tracking-tight">
            {formatNaira(Math.max(status.remainingToday, 0))}
          </p>
          <p className="mt-1 text-sm font-medium opacity-90">{status.message}</p>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium opacity-90">
              <span>Spent today: {formatNaira(status.spentToday)}</span>
              <span>Limit: {formatNaira(status.adaptiveDailyLimit)}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/15">
              <div
                className="h-full rounded-full bg-current transition-all duration-500"
                style={{ width: `${Math.min(status.usedFraction * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Quick add */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Log a spend</h2>
          <div className="inline-flex rounded-full bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setLogMode('speak')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                logMode === 'speak'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Mic className="size-3.5" /> Speak
            </button>
            <button
              type="button"
              onClick={() => setLogMode('type')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                logMode === 'type'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Keyboard className="size-3.5" /> Type
            </button>
          </div>
        </div>
        {logMode === 'speak' ? <VoiceAdd /> : <QuickAdd />}
      </Card>

      {/* Buffers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat
          icon={<TrendingUp className="size-4" />}
          label="Flexible left"
          value={formatNaira(flexRemaining)}
          sub={`of ${formatNaira(pool)}`}
          progress={pool > 0 ? (flexRemaining / pool) * 100 : 0}
          tone="primary"
        />
        <MiniStat
          icon={<PiggyBank className="size-4" />}
          label="Savings goal"
          value={formatNaira(goal?.saved ?? setup.savingsTarget)}
          sub={goal ? `of ${formatNaira(goal.target)}` : 'this period'}
          progress={goal && goal.target > 0 ? (goal.saved / goal.target) * 100 : 100}
          tone="safe"
          onClick={() => goTo('savings')}
        />
        <MiniStat
          icon={<Shield className="size-4" />}
          label="Emergency buffer"
          value={formatNaira(setup.emergencyBuffer)}
          sub="untouched"
          progress={100}
          tone="muted"
        />
      </div>

      {/* Money leak preview */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4 text-caution" /> Money leaks
          </h2>
          <button
            onClick={() => goTo('leaks')}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="size-3.5" />
          </button>
        </div>
        {leaks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No leaks detected yet. Keep logging and we&apos;ll spot patterns for you.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {leaks.slice(0, 2).map((leak) => (
              <li
                key={leak.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-muted px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{leak.title}</p>
                  <p className="text-xs text-muted-foreground text-pretty">{leak.detail}</p>
                </div>
                <StatusPill level={leak.level} label={formatNaira(leak.amount, { compact: true })} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Essentials snapshot */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Essentials this period</h2>
          <button
            onClick={() => goTo('budget')}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Full budget <ArrowRight className="size-3.5" />
          </button>
        </div>
        <ul className="flex flex-col gap-3">
          {(['food', 'transport', 'data'] as const).map((id) => {
            const planned = setup.essentials[id]
            const spent = byCat[id]
            const pct = planned > 0 ? (spent / planned) * 100 : 0
            const tone = pct > 100 ? 'danger' : pct > 85 ? 'caution' : 'primary'
            return (
              <li key={id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="capitalize">{id}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatNaira(spent)} / {formatNaira(planned)}
                  </span>
                </div>
                <Progress value={pct} tone={tone} />
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}

function MiniStat({
  icon,
  label,
  value,
  sub,
  progress,
  tone,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  progress: number
  tone: 'primary' | 'safe' | 'muted'
  onClick?: () => void
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Card className="p-4">
      <Comp
        onClick={onClick}
        className={onClick ? 'block w-full text-left' : 'block w-full text-left'}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
        <p className="mb-2 text-xs text-muted-foreground">{sub}</p>
        <Progress value={progress} tone={tone} />
      </Comp>
    </Card>
  )
}
