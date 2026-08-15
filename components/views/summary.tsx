'use client'

import { useMemo } from 'react'
import { ArrowDownRight, ArrowUpRight, Layers, Receipt, TrendingUp, Wallet } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { CategoryIcon } from '@/components/category-visuals'
import { colorValue } from '@/components/category-visuals'
import { useStore } from '@/lib/store'
import {
  expensesInCurrentPeriod,
  extraSavingsInCurrentPeriod,
  flexiblePool,
  formatNaira,
  periodProgress,
  spendablePool,
} from '@/lib/finance'
import { buildSummary, categoryLabel } from '@/lib/insights'
import { cn } from '@/lib/utils'

export function Summary() {
  const { setup, expenses, categories, incentives } = useStore()

  const summary = useMemo(() => (setup ? buildSummary(setup, expenses, new Date(), incentives.history) : null), [setup, expenses, incentives.history])

  // Last 6 weeks trend of total weekly spend.
  const weekly = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }).map((_, i) => {
      const end = new Date(now)
      end.setDate(end.getDate() - (5 - i) * 7)
      const start = new Date(end)
      start.setDate(start.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      const total = expenses
        .filter((e) => {
          const d = new Date(e.date)
          return d >= start && d <= end
        })
        .reduce((s, e) => s + e.amount, 0)
      return { label: end.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }), total }
    })
  }, [expenses])

  if (!setup || !summary) return null

  const pool = spendablePool(setup)
  const progress = periodProgress(setup)
  const periodExpenses = expensesInCurrentPeriod(setup, expenses)
  const periodSpent = periodExpenses.reduce((s, e) => s + e.amount, 0)
  const periodPct = pool > 0 ? Math.min((periodSpent / pool) * 100, 100) : 0
  const flexPool = flexiblePool(setup)
  const maxWeek = Math.max(1, ...weekly.map((w) => w.total))

  const lastWeek = weekly[weekly.length - 1]?.total ?? 0
  const prevWeek = weekly[weekly.length - 2]?.total ?? 0
  const weekChange = prevWeek > 0 ? (lastWeek - prevWeek) / prevWeek : 0

  return (
    <div className="flex flex-col gap-5">
      {/* Headline board */}
      <Card className="overflow-hidden border-0 bg-primary p-6 text-primary-foreground">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium opacity-90">Spent this period</p>
          <span className="text-xs font-semibold opacity-90">
            {progress.daysElapsed + 1} / {progress.totalDays} days
          </span>
        </div>
        <p className="mt-2 font-mono text-5xl font-semibold tracking-tight">
          {formatNaira(periodSpent)}
        </p>
        <p className="mt-1 text-sm opacity-90">
          of {formatNaira(pool)} spendable · {formatNaira(Math.max(pool - periodSpent, 0))} left
        </p>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-black/15">
          <div
            className="h-full rounded-full bg-current transition-all duration-500"
            style={{ width: `${periodPct}%` }}
          />
        </div>
      </Card>

      {/* Key figures */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={<Receipt className="size-4" />}
          label="Entries"
          value={String(summary.count)}
        />
        <StatTile
          icon={<Layers className="size-4" />}
          label="Avg / entry"
          value={formatNaira(summary.averagePerEntry, { compact: true })}
        />
        <StatTile
          icon={<Wallet className="size-4" />}
          label="All time"
          value={formatNaira(summary.totalAllTime, { compact: true })}
        />
        <StatTile
          icon={<TrendingUp className="size-4" />}
          label="Flexible left"
          value={formatNaira(
            Math.max(
              flexPool -
                periodExpenses
                  .filter((e) => !['food', 'transport', 'data', 'school', 'personal'].includes(e.category))
                  .reduce((s, e) => s + e.amount, 0) -
                extraSavingsInCurrentPeriod(setup, incentives.history).beforeToday -
                extraSavingsInCurrentPeriod(setup, incentives.history).today,
              0
            ),
            { compact: true }
          )}
        />
      </div>

      {/* Category breakdown */}
      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Where your money went</h2>
        {summary.byCategory.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No spending logged this period yet.
          </p>
        ) : (
          <>
            {/* Stacked share bar */}
            <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full bg-muted">
              {summary.byCategory.map((c) => {
                const meta = categories.find((m) => m.id === c.id)
                return (
                  <div
                    key={c.id}
                    style={{
                      width: `${c.share * 100}%`,
                      backgroundColor: colorValue(meta?.color ?? 'slate'),
                    }}
                    title={`${categoryLabel(categories, c.id)} · ${Math.round(c.share * 100)}%`}
                  />
                )
              })}
            </div>
            <ul className="flex flex-col gap-3">
              {summary.byCategory.map((c) => {
                const meta = categories.find((m) => m.id === c.id)
                return (
                  <li key={c.id} className="flex items-center gap-3">
                    <CategoryIcon
                      icon={meta?.icon ?? 'tag'}
                      color={meta?.color ?? 'slate'}
                      className="size-9 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {categoryLabel(categories, c.id)}
                        </span>
                        <span className="shrink-0 font-mono text-sm">{formatNaira(c.spent)}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${c.share * 100}%`,
                            backgroundColor: colorValue(meta?.color ?? 'slate'),
                          }}
                        />
                      </div>
                    </div>
                    <span className="w-9 shrink-0 text-right text-xs text-muted-foreground">
                      {Math.round(c.share * 100)}%
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Card>

      {/* Weekly trend */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Last 6 weeks</h2>
          {prevWeek > 0 && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs font-semibold',
                weekChange > 0 ? 'text-danger' : 'text-safe',
              )}
            >
              {weekChange > 0 ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {Math.abs(Math.round(weekChange * 100))}% vs prev week
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-2" style={{ height: 140 }}>
          {weekly.map((w, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
              <span className="font-mono text-[0.65rem] text-muted-foreground">
                {w.total > 0 ? formatNaira(w.total, { compact: true }) : ''}
              </span>
              <div
                className={cn(
                  'w-full rounded-t-md transition-all',
                  i === weekly.length - 1 ? 'bg-primary' : 'bg-primary/35',
                )}
                style={{ height: `${Math.max((w.total / maxWeek) * 100, 3)}%` }}
              />
              <span className="text-[0.65rem] text-muted-foreground">{w.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Biggest single spend */}
      {summary.largest && (
        <Card className="flex items-center gap-3 p-5">
          <CategoryIcon
            icon={categories.find((m) => m.id === summary.largest!.category)?.icon ?? 'tag'}
            color={categories.find((m) => m.id === summary.largest!.category)?.color ?? 'slate'}
            className="size-11 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">Biggest single spend</p>
            <p className="truncate text-sm font-medium">
              {summary.largest.note || categoryLabel(categories, summary.largest.category)}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(summary.largest.date).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <span className="shrink-0 font-mono text-lg font-semibold">
            {formatNaira(summary.largest.amount)}
          </span>
        </Card>
      )}
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 font-mono text-lg font-semibold">{value}</p>
    </Card>
  )
}
