'use client'

import { useState } from 'react'
import {
  HelpCircle,
  LayoutDashboard,
  MessageSquareHeart,
  PiggyBank,
  Receipt,
  RotateCcw,
  Search,
  Wallet,
  Wallet2,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { computeDailyStatus, formatNaira } from '@/lib/finance'
import { StatusPill } from '@/components/status-pill'
import { Overview } from '@/components/views/overview'
import { Expenses } from '@/components/views/expenses'
import { Afford } from '@/components/views/afford'
import { Leaks } from '@/components/views/leaks'
import { Budget } from '@/components/views/budget'
import { Savings } from '@/components/views/savings'
import { Feedback } from '@/components/views/feedback'
import { cn } from '@/lib/utils'

export type ViewId =
  | 'overview'
  | 'expenses'
  | 'afford'
  | 'leaks'
  | 'budget'
  | 'savings'
  | 'feedback'

const nav: { id: ViewId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'afford', label: 'Can I afford?', icon: HelpCircle },
  { id: 'leaks', label: 'Leaks', icon: Search },
  { id: 'budget', label: 'Budget', icon: Wallet2 },
  { id: 'savings', label: 'Savings', icon: PiggyBank },
  { id: 'feedback', label: 'Feedback', icon: MessageSquareHeart },
]

const titles: Record<ViewId, string> = {
  overview: 'Overview',
  expenses: 'Expenses',
  afford: 'Can I afford this?',
  leaks: 'Money leak detector',
  budget: 'Weekly & monthly budget',
  savings: 'Savings & streaks',
  feedback: 'Send feedback',
}

export function AppShell() {
  const { setup, expenses, resetAll } = useStore()
  const [view, setView] = useState<ViewId>('overview')

  const status = setup ? computeDailyStatus(setup, expenses) : null

  function render() {
    switch (view) {
      case 'overview':
        return <Overview goTo={setView} />
      case 'expenses':
        return <Expenses />
      case 'afford':
        return <Afford />
      case 'leaks':
        return <Leaks />
      case 'budget':
        return <Budget />
      case 'savings':
        return <Savings />
      case 'feedback':
        return <Feedback />
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="size-5" />
          </div>
          <div>
            <p className="font-mono text-sm font-semibold tracking-tight">KUDI</p>
            <p className="text-xs text-muted-foreground">Money, made simple</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <NavButton
              key={item.id}
              active={view === item.id}
              onClick={() => setView(item.id)}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          {status && (
            <div className="rounded-xl bg-sidebar-accent p-3 text-sidebar-accent-foreground">
              <p className="text-xs font-medium opacity-80">Safe to spend today</p>
              <p className="font-mono text-xl font-semibold">
                {formatNaira(Math.max(status.remainingToday, 0))}
              </p>
            </div>
          )}
          <button
            onClick={() => {
              if (confirm('Reset all budget and expense data?')) resetAll()
            }}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="size-4" /> Reset data
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:hidden">
              <Wallet className="size-4" />
            </div>
            <h1 className="text-lg font-semibold text-balance">{titles[view]}</h1>
          </div>
          <div className="flex items-center gap-2">
            {status && <StatusPill level={status.level} />}
            <button
              onClick={() => setView('feedback')}
              aria-label="Send feedback"
              className={cn(
                'flex size-8 items-center justify-center rounded-lg transition-colors lg:hidden',
                view === 'feedback'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <MessageSquareHeart className="size-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-6 lg:px-8">{render()}</main>
      </div>

      {/* Bottom nav (mobile) — primary destinations only; Feedback lives in the header menu */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-border bg-background/90 px-1 py-1.5 backdrop-blur lg:hidden">
        {nav
          .filter((item) => item.id !== 'feedback')
          .map((item) => {
          const Icon = item.icon
          const active = view === item.id
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[0.65rem] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-5" />
              <span className="max-w-full truncate px-0.5">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function NavButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}
