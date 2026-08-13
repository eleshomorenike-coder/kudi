'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useStore } from '@/lib/store'
import { formatNaira, remainingBudget } from '@/lib/finance'
import { CATEGORIES, type CategoryId } from '@/lib/types'
import { cn } from '@/lib/utils'

export function QuickAdd({ onAdded }: { onAdded?: () => void }) {
  const { addExpense, setup, expenses } = useStore()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<CategoryId>('food')
  const [note, setNote] = useState('')
  const [justAdded, setJustAdded] = useState(false)
  const [blocked, setBlocked] = useState<string | null>(null)

  const value = Number(amount) || 0
  const remaining = setup ? remainingBudget(setup, expenses) : Infinity
  const wouldExceed = value > remaining

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (value <= 0) return
    const result = addExpense({ amount: value, category, note: note.trim() })
    if (!result.ok) {
      setBlocked(
        `That would put you over budget. You only have ${formatNaira(
          result.remaining,
        )} left this period, so ${formatNaira(value)} can't be logged.`,
      )
      return
    }
    setAmount('')
    setNote('')
    setBlocked(null)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1400)
    onAdded?.()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative sm:w-40">
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-muted-foreground">
            ₦
          </span>
          <Input
            inputMode="numeric"
            placeholder="0"
            aria-label="Amount spent"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/[^0-9]/g, ''))
              setBlocked(null)
            }}
            className="pl-8 font-mono text-lg"
          />
        </div>
        <Input
          placeholder="What was it? (optional)"
          aria-label="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="flex-1"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              category === c.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-muted',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {(blocked || wouldExceed) && (
        <p className="rounded-lg bg-danger/12 px-3 py-2 text-sm font-medium text-danger text-pretty">
          {blocked ??
            `Only ${formatNaira(remaining)} left in your budget this period. Lower the amount to stay within it.`}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="h-11"
        disabled={value <= 0 || wouldExceed}
      >
        <Plus className="size-4" />
        {justAdded ? 'Added!' : `Log ${value > 0 ? '₦' + value.toLocaleString('en-NG') : 'expense'}`}
      </Button>
    </form>
  )
}
