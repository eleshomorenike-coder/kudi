'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { CategoryIcon } from '@/components/category-visuals'
import { useStore } from '@/lib/store'
import { formatNaira, isSameDay } from '@/lib/finance'
import { categoryLabel } from '@/lib/insights'
import type { Expense } from '@/lib/types'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

function dayKey(d: Date): string {
  return startOfDay(d).toISOString().slice(0, 10)
}

export function Calendar() {
  const { expenses, categories } = useStore()
  const today = startOfDay(new Date())

  // The month currently being viewed (first of the month).
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<Date>(today)

  // Total spend keyed by ISO day for quick lookup + heat colouring.
  const dayTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      const k = dayKey(new Date(e.date))
      map.set(k, (map.get(k) ?? 0) + e.amount)
    }
    return map
  }, [expenses])

  const maxDay = useMemo(() => Math.max(1, ...dayTotals.values()), [dayTotals])

  // Build the calendar grid (leading blanks + each day of the month).
  const cells = useMemo(() => {
    const firstWeekday = month.getDay()
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const arr: (Date | null)[] = []
    for (let i = 0; i < firstWeekday; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push(new Date(month.getFullYear(), month.getMonth(), d))
    }
    return arr
  }, [month])

  const monthTotal = useMemo(() => {
    return expenses
      .filter((e) => {
        const d = new Date(e.date)
        return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()
      })
      .reduce((s, e) => s + e.amount, 0)
  }, [expenses, month])

  const selectedExpenses = useMemo(
    () =>
      expenses
        .filter((e) => isSameDay(new Date(e.date), selected))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses, selected],
  )
  const selectedTotal = selectedExpenses.reduce((s, e) => s + e.amount, 0)

  const firstExpenseDate = useMemo(() => {
    if (expenses.length === 0) return null
    return expenses.reduce(
      (min, e) => (new Date(e.date) < min ? new Date(e.date) : min),
      new Date(expenses[0].date),
    )
  }, [expenses])

  function shiftMonth(delta: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
  }

  const isCurrentMonth =
    month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        {/* Month header */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="text-center">
            <p className="font-semibold">
              {month.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {formatNaira(monthTotal)} spent
            </p>
          </div>
          <button
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            disabled={isCurrentMonth}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Weekday labels */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="py-1 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`b-${i}`} />
            const total = dayTotals.get(dayKey(date)) ?? 0
            const isFuture = date > today
            const isToday = isSameDay(date, today)
            const isSelected = isSameDay(date, selected)
            const intensity = total > 0 ? 0.15 + (total / maxDay) * 0.75 : 0
            return (
              <button
                key={dayKey(date)}
                onClick={() => setSelected(date)}
                disabled={isFuture}
                className={cn(
                  'relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-all',
                  isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                  isFuture ? 'cursor-not-allowed text-muted-foreground/40' : 'hover:bg-muted',
                  isToday && !isSelected && 'font-semibold text-primary',
                )}
                style={
                  total > 0 && !isFuture
                    ? { backgroundColor: `color-mix(in oklch, var(--color-primary) ${Math.round(intensity * 100)}%, transparent)` }
                    : undefined
                }
                aria-label={`${date.toLocaleDateString('en-NG', { day: 'numeric', month: 'long' })}${total > 0 ? `, ${formatNaira(total)} spent` : ''}`}
              >
                <span className={cn(intensity > 0.5 && 'text-primary-foreground')}>{date.getDate()}</span>
                {total > 0 && (
                  <span
                    className={cn(
                      'mt-0.5 size-1 rounded-full',
                      intensity > 0.5 ? 'bg-primary-foreground' : 'bg-primary',
                    )}
                    aria-hidden
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
          <span>Less</span>
          {[0.15, 0.4, 0.65, 0.9].map((v) => (
            <span
              key={v}
              className="size-3 rounded-sm"
              style={{ backgroundColor: `color-mix(in oklch, var(--color-primary) ${Math.round(v * 100)}%, transparent)` }}
            />
          ))}
          <span>More</span>
        </div>
      </Card>

      {/* Selected day detail */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            <h2 className="font-semibold">
              {isSameDay(selected, today)
                ? 'Today'
                : selected.toLocaleDateString('en-NG', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
            </h2>
          </div>
          <span className="font-mono text-sm font-semibold">{formatNaira(selectedTotal)}</span>
        </div>

        {selectedExpenses.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nothing logged on this day.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selectedExpenses.map((e) => (
              <DayRow key={e.id} expense={e} categories={categories} />
            ))}
          </ul>
        )}
      </Card>

      {firstExpenseDate && (
        <p className="px-1 text-center text-xs text-muted-foreground text-pretty">
          Your history goes back to{' '}
          {firstExpenseDate.toLocaleDateString('en-NG', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          . Use the arrows to look back at any month.
        </p>
      )}
    </div>
  )
}

function DayRow({
  expense,
  categories,
}: {
  expense: Expense
  categories: ReturnType<typeof useStore>['categories']
}) {
  const meta = categories.find((c) => c.id === expense.category)
  return (
    <li className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
      <CategoryIcon
        icon={meta?.icon ?? 'tag'}
        color={meta?.color ?? 'slate'}
        className="size-9 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {expense.note || categoryLabel(categories, expense.category)}
        </p>
        <p className="text-xs text-muted-foreground">
          {categoryLabel(categories, expense.category)} ·{' '}
          {new Date(expense.date).toLocaleTimeString('en-NG', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      </div>
      <span className="shrink-0 font-mono text-sm font-semibold">{formatNaira(expense.amount)}</span>
    </li>
  )
}
