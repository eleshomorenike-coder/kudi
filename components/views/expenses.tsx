'use client'

import { useState } from 'react'
import {
  Keyboard,
  Mic,
  Trash2,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { QuickAdd } from '@/components/quick-add'
import { VoiceAdd } from '@/components/voice-add'
import { AlertParserModal } from '@/components/alert-parser-modal'
import { useStore } from '@/lib/store'
import type { CategoryMeta, Expense } from '@/lib/types'
import { formatNaira, isSameDay } from '@/lib/finance'
import { cn } from '@/lib/utils'

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
  const { expenses, deleteExpense, categories } = useStore()
  const [alertModalOpen, setAlertModalOpen] = useState(false)
  const [inputMode, setInputMode] = useState<'type' | 'voice'>('type')
  const [filter, setFilter] = useState<'all' | 'manual' | 'auto'>('all')

  const filteredExpenses = expenses.filter((e) => {
    if (filter === 'manual') return e.source !== 'bank'
    if (filter === 'auto') return e.source === 'bank'
    return true
  })

  const groups = groupByDay(filteredExpenses)

  const catLabel = (id: Expense['category']) =>
    categories.find((c: CategoryMeta) => c.id === id)?.label ?? id

  return (
    <div className="flex flex-col gap-5">
      <AlertParserModal isOpen={alertModalOpen} onClose={() => setAlertModalOpen(false)} />

      {/* Logging toolbar */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Log a spend</h2>
            <div className="inline-flex rounded-full bg-muted p-0.5">
              <button
                type="button"
                onClick={() => setInputMode('type')}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  inputMode === 'type'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Keyboard className="size-3" /> Type
              </button>
              <button
                type="button"
                onClick={() => setInputMode('voice')}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  inputMode === 'voice'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Mic className="size-3" /> Voice
              </button>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAlertModalOpen(true)}
            className="flex items-center gap-1.5 font-semibold text-primary border-primary/40 bg-primary/5 hover:bg-primary/10"
          >
            <Zap className="size-3.5" /> Paste Alert
          </Button>
        </div>

        {inputMode === 'voice' ? <VoiceAdd /> : <QuickAdd />}
      </Card>

      {/* Filter tabs */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-xl bg-muted p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-lg px-3 py-1.5 transition-colors',
              filter === 'all'
                ? 'bg-background font-semibold text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            All ({expenses.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('manual')}
            className={cn(
              'rounded-lg px-3 py-1.5 transition-colors',
              filter === 'manual'
                ? 'bg-background font-semibold text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Manual ({expenses.filter((e) => e.source !== 'bank').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('auto')}
            className={cn(
              'rounded-lg px-3 py-1.5 transition-colors',
              filter === 'auto'
                ? 'bg-background font-semibold text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Auto-Tracked ({expenses.filter((e) => e.source === 'bank').length})
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No expenses found. Log your first spend above or paste a bank alert text.
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
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {e.note || catLabel(e.category)}
                      </p>
                      {e.source === 'bank' && (
                        <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[0.65rem] font-semibold text-primary">
                          <Zap className="size-2.5" /> Auto
                        </span>
                      )}
                    </div>
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
