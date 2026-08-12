'use client'

import { useState } from 'react'
import { HelpCircle, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useStore } from '@/lib/store'
import { canIAfford, formatNaira, type AffordResult } from '@/lib/finance'
import { cn } from '@/lib/utils'

const resultStyles: Record<AffordResult['level'], string> = {
  safe: 'bg-safe text-safe-foreground',
  caution: 'bg-caution text-caution-foreground',
  danger: 'bg-danger text-danger-foreground',
}

const quickAmounts = [1000, 2000, 5000, 10000]

export function Afford() {
  const { setup, expenses } = useStore()
  const [amount, setAmount] = useState('')
  const [result, setResult] = useState<AffordResult | null>(null)
  const [checkedAmount, setCheckedAmount] = useState(0)

  if (!setup) return null

  function check(value: number) {
    if (value <= 0) return
    setResult(canIAfford(setup!, expenses, value))
    setCheckedAmount(value)
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <Card className="p-6">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <HelpCircle className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold leading-tight">Can I afford this?</h2>
            <p className="text-xs text-muted-foreground">
              Not &quot;do I have the money&quot; — &quot;can I spend it and still be fine&quot;
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            check(Number(amount) || 0)
          }}
          className="mt-5 flex flex-col gap-3"
        >
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-mono text-xl text-muted-foreground">
              ₦
            </span>
            <Input
              inputMode="numeric"
              placeholder="0"
              aria-label="Amount to check"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              className="h-16 pl-10 font-mono text-3xl"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {quickAmounts.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setAmount(String(q))
                  check(q)
                }}
                className="rounded-full border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                {formatNaira(q, { compact: true })}
              </button>
            ))}
          </div>

          <Button type="submit" size="lg" className="h-12" disabled={(Number(amount) || 0) <= 0}>
            <ShoppingBag className="size-4" /> Check it
          </Button>
        </form>
      </Card>

      {result && (
        <Card className={cn('overflow-hidden border-0 p-6', resultStyles[result.level])}>
          <p className="text-sm font-medium opacity-90">On {formatNaira(checkedAmount)}</p>
          <p className="mt-1 text-3xl font-semibold text-balance">{result.headline}</p>
          <p className="mt-3 text-sm leading-relaxed opacity-95 text-pretty">{result.detail}</p>
        </Card>
      )}
    </div>
  )
}
