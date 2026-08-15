'use client'

import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useStore } from '@/lib/store'
import { ESSENTIAL_CATEGORIES, type Period } from '@/lib/types'
import {
  essentialsTotal,
  expensesInCurrentPeriod,
  flexiblePool,
  formatNaira,
  periodLengthDays,
  spentByCategory,
} from '@/lib/finance'
import { cn } from '@/lib/utils'

const segments = [
  { key: 'needs', label: 'Needs', className: 'bg-primary' },
  { key: 'flexible', label: 'Flexible', className: 'bg-chart-2' },
  { key: 'savings', label: 'Savings', className: 'bg-safe' },
  { key: 'emergency', label: 'Emergency', className: 'bg-muted-foreground/50' },
] as const

export function Budget() {
  const { setup, expenses, saveSetup } = useStore()
  if (!setup) return null

  const needs = essentialsTotal(setup)
  const flexible = flexiblePool(setup)
  const values = {
    needs,
    flexible,
    savings: setup.savingsTarget,
    emergency: setup.emergencyBuffer,
  }
  const income = setup.income || 1
  const byCat = spentByCategory(expensesInCurrentPeriod(setup, expenses))

  function switchPeriod(p: Period) {
    if (p === setup!.period) return
    saveSetup({ ...setup!, period: p, startDate: new Date().toISOString() })
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Your budget</h2>
            <p className="text-xs text-muted-foreground">
              {formatNaira(setup.income)} across {periodLengthDays(setup.period)} days
            </p>
          </div>
          <div className="flex rounded-full border border-border p-0.5">
            {(['weekly', 'monthly'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => switchPeriod(p)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors',
                  setup.period === p
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Allocation bar */}
        <div className="flex h-4 w-full overflow-hidden rounded-full">
          {segments.map((seg) => {
            const w = (values[seg.key] / income) * 100
            if (w <= 0) return null
            return (
              <div
                key={seg.key}
                className={seg.className}
                style={{ width: `${w}%` }}
                title={`${seg.label}: ${formatNaira(values[seg.key])}`}
              />
            )
          })}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3">
          {segments.map((seg) => (
            <div key={seg.key} className="flex items-center gap-2">
              <span className={cn('size-3 rounded-full', seg.className)} />
              <div>
                <dt className="text-xs text-muted-foreground">{seg.label}</dt>
                <dd className="font-mono text-sm font-semibold">{formatNaira(values[seg.key])}</dd>
              </div>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 font-semibold">Essential spending vs plan</h3>
        <ul className="flex flex-col gap-4">
          {ESSENTIAL_CATEGORIES.map((c) => {
            const planned = setup.essentials[c.id as keyof typeof setup.essentials] || 0
            const spent = byCat[c.id] || 0
            const pct = planned > 0 ? (spent / planned) * 100 : 0
            const tone = pct > 100 ? 'danger' : pct > 85 ? 'caution' : 'safe'
            const left = planned - spent
            return (
              <li key={c.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{c.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatNaira(spent)} / {formatNaira(planned)}
                  </span>
                </div>
                <Progress value={pct} tone={planned > 0 ? tone : 'muted'} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {planned <= 0
                    ? 'No budget set'
                    : left >= 0
                      ? `${formatNaira(left)} left`
                      : `${formatNaira(-left)} over`}
                </p>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
