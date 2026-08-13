'use client'

import { useState } from 'react'
import { Keyboard, Mic, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { QuickAdd } from '@/components/quick-add'
import { VoiceAdd } from '@/components/voice-add'
import { useStore } from '@/lib/store'
import { CATEGORIES, type Expense } from '@/lib/types'
import { formatNaira, isSameDay } from '@/lib/finance'
import { cn } from '@/lib/utils'

const catLabel = (id: Expense['category']) =>
  CATEGORIES.find((c) => c.id === id)?.label ?? id

function groupByDay(expenses: Expense[]) {
  const groups: { key: string; label: string; items: Expense[]; total: number }[] = []
  const sorted = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
  const now = new Date()
  const yest = new Date(now)
  yest.setDate(yest.getDate() - 1)

  for (const e of sorted) {
    const d = new Date(e.date)
    const key = d.toDateString()
    let label = d.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' })
    if (isSameDay(d, now)) label = 'Today'
    else if (isSameDay(d, yest)) label = 'Yesterday'
    let group = groups.find((g) => g.key === key)
    if (!group) {
      group = { key, label, items: [], total: 0 }
      groups.push(group)
    }
    group.items.push(e)
    group.total += e.amount
  }
  return groups
}

export function Expenses() {
  const { expenses, deleteExpense } = useStore()
  const [logMode, setLogMode] = useState<'speak' | 'type'>('speak')
  const groups = groupByDay(expenses)

  return (
    <div className="flex flex-col gap-5">
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

      {groups.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No expenses yet. Log your first spend above — it only takes a few seconds.
          </p>
        </Card>
      ) : (
        groups.map((group) => (
          <div key={group.key}>
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{group.label}</h3>
              <span className="font-mono text-sm text-muted-foreground">
                {formatNaira(group.total)}
              </span>
            </div>
            <Card className="divide-y divide-border">
              {group.items.map((e) => (
                <div key={e.id} className="group flex items-center gap-3 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {e.note || catLabel(e.category)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {catLabel(e.category)} ·{' '}
                      {new Date(e.date).toLocaleTimeString('en-NG', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold">{formatNaira(e.amount)}</span>
                  <button
                    onClick={() => deleteExpense(e.id)}
                    aria-label="Delete expense"
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </Card>
          </div>
        ))
      )}
    </div>
  )
}
