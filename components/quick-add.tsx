'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useStore } from '@/lib/store'
import { CATEGORIES, type CategoryId } from '@/lib/types'
import { cn } from '@/lib/utils'

export function QuickAdd({ onAdded }: { onAdded?: () => void }) {
  const { addExpense } = useStore()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<CategoryId>('food')
  const [note, setNote] = useState('')
  const [justAdded, setJustAdded] = useState(false)

  const value = Number(amount) || 0

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (value <= 0) return
    addExpense({ amount: value, category, note: note.trim() })
    setAmount('')
    setNote('')
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
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
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

      <Button type="submit" size="lg" className="h-11" disabled={value <= 0}>
        <Plus className="size-4" />
        {justAdded ? 'Added!' : `Log ${value > 0 ? '₦' + value.toLocaleString('en-NG') : 'expense'}`}
      </Button>
    </form>
  )
}
