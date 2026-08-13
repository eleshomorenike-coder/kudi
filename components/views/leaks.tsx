'use client'

import { AlertTriangle, CheckCircle2, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StatusPill } from '@/components/status-pill'
import { useStore } from '@/lib/store'
import { detectLeaks, formatNaira, spentByCategory, totalSpent } from '@/lib/finance'

export function Leaks() {
  const { setup, expenses, categories } = useStore()
  if (!setup) return null

  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekExpenses = expenses.filter(
    (e) => new Date(e.date) >= weekAgo && new Date(e.date) <= now,
  )
  const leaks = detectLeaks(setup, expenses)
  const byCat = spentByCategory(weekExpenses)
  const weekTotal = totalSpent(weekExpenses)

  const borderTone: Record<string, string> = {
    safe: 'border-l-safe',
    caution: 'border-l-caution',
    danger: 'border-l-danger',
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Search className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold leading-tight">Money leak detector</h2>
            <p className="text-xs text-muted-foreground">
              Where your money quietly slips away, last 7 days
            </p>
          </div>
        </div>
      </Card>

      {leaks.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <CheckCircle2 className="size-8 text-safe" />
          <p className="font-medium">No leaks this week</p>
          <p className="max-w-xs text-sm text-muted-foreground text-pretty">
            Your spending is following your plan. Keep logging so we can keep watching for patterns.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {leaks.map((leak) => (
            <Card
              key={leak.id}
              className={`border-l-4 p-5 ${borderTone[leak.level]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="size-4 text-caution" />
                    {leak.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground text-pretty">{leak.detail}</p>
                </div>
                <StatusPill level={leak.level} label={formatNaira(leak.amount, { compact: true })} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">This week by category</h3>
          <span className="font-mono text-sm text-muted-foreground">{formatNaira(weekTotal)}</span>
        </div>
        <ul className="flex flex-col gap-3">
          {categories.map((c) => {
            const spent = byCat[c.id]
            const pct = weekTotal > 0 ? (spent / weekTotal) * 100 : 0
            return (
              <li key={c.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{c.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatNaira(spent)} · {Math.round(pct)}%
                  </span>
                </div>
                <Progress value={pct} tone={c.essential ? 'primary' : 'caution'} />
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
