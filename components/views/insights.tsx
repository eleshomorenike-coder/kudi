'use client'

import { useMemo } from 'react'
import {
  CheckCircle2,
  Info,
  Lightbulb,
  Sparkles,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useStore } from '@/lib/store'
import {
  generateAdvice,
  spendingPatterns,
  type Advice,
  type AdviceTone,
} from '@/lib/insights'
import { cn } from '@/lib/utils'

const toneStyles: Record<AdviceTone, { ring: string; icon: string; badge: string }> = {
  positive: {
    ring: 'border-safe/30',
    icon: 'bg-safe/15 text-safe',
    badge: 'bg-safe/15 text-safe',
  },
  neutral: {
    ring: 'border-border',
    icon: 'bg-primary/12 text-primary',
    badge: 'bg-primary/12 text-primary',
  },
  warning: {
    ring: 'border-caution/40',
    icon: 'bg-caution/15 text-caution',
    badge: 'bg-caution/15 text-caution',
  },
}

const toneIcon: Record<AdviceTone, React.ComponentType<{ className?: string }>> = {
  positive: CheckCircle2,
  neutral: Info,
  warning: TriangleAlert,
}

export function Insights() {
  const { setup, expenses, goal, categories } = useStore()

  const advice = useMemo(
    () => (setup ? generateAdvice(setup, expenses, goal) : []),
    [setup, expenses, goal],
  )
  const patterns = useMemo(
    () => spendingPatterns(expenses, categories),
    [expenses, categories],
  )

  if (!setup) return null

  const hasData = expenses.length > 0

  return (
    <div className="flex flex-col gap-6">
      {/* Advice */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <Lightbulb className="size-4" />
          </span>
          <div>
            <h2 className="font-semibold leading-tight">Advice for you</h2>
            <p className="text-xs text-muted-foreground">Personal tips based on your real numbers</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {advice.map((a) => (
            <AdviceCard key={a.id} advice={a} />
          ))}
        </div>
      </section>

      {/* Spending patterns */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <TrendingUp className="size-4" />
          </span>
          <div>
            <h2 className="font-semibold leading-tight">Your spending patterns</h2>
            <p className="text-xs text-muted-foreground">What we&apos;ve noticed in your habits</p>
          </div>
        </div>

        {patterns.length === 0 ? (
          <Card className="flex items-center gap-3 p-5">
            <Sparkles className="size-5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground text-pretty">
              {hasData
                ? 'Keep logging for a few more days and clear patterns will start to appear here.'
                : "Log a few expenses and we'll start spotting your spending patterns automatically."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {patterns.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug text-pretty">{p.title}</p>
                  {p.figure && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-mono text-xs font-semibold">
                      {p.figure}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground text-pretty">{p.detail}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function AdviceCard({ advice }: { advice: Advice }) {
  const s = toneStyles[advice.tone]
  const Icon = toneIcon[advice.tone]
  return (
    <Card className={cn('flex items-start gap-3 p-4', s.ring)}>
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', s.icon)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug text-pretty">{advice.title}</p>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{advice.detail}</p>
      </div>
    </Card>
  )
}
