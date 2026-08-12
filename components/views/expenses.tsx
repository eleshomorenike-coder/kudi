'use client'

import { Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { QuickAdd } from '@/components/quick-add'
import { useStore } from '@/lib/store'
import { CATEGORIES, type Expense } from '@/lib/types'
import { formatNaira, isSameDay } from '@/lib/finance'

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
  const groups = groupByDay(expenses)

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Log a spend</h2>
        <QuickAdd />
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
