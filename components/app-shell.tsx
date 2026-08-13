'use client'

import { useEffect, useState } from 'react'
import {
  CalendarDays,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MessageSquareHeart,
  MoreHorizontal,
  PieChart,
  PiggyBank,
  Receipt,
  RotateCcw,
  Search,
  User,
  Wallet,
  Wallet2,
  X,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { computeDailyStatus, formatNaira } from '@/lib/finance'
import { getPermission, sendDailyAlertOnce } from '@/lib/notifications'
import { StatusPill } from '@/components/status-pill'
import { Overview } from '@/components/views/overview'
import { Expenses } from '@/components/views/expenses'
import { Afford } from '@/components/views/afford'
import { Leaks } from '@/components/views/leaks'
import { Budget } from '@/components/views/budget'
import { Savings } from '@/components/views/savings'
import { Feedback } from '@/components/views/feedback'
import { Summary } from '@/components/views/summary'
import { Calendar } from '@/components/views/calendar'
import { Insights } from '@/components/views/insights'
import { Profile } from '@/components/views/profile'
import { cn } from '@/lib/utils'

export type ViewId =
  | 'overview'
  | 'summary'
  | 'expenses'
  | 'calendar'
  | 'insights'
  | 'afford'
  | 'leaks'
  | 'budget'
  | 'savings'
  | 'feedback'
  | 'profile'

type NavItem = { id: ViewId; label: string; icon: React.ComponentType<{ className?: string }> }

const nav: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'summary', label: 'Summary', icon: PieChart },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
  { id: 'afford', label: 'Can I afford?', icon: HelpCircle },
  { id: 'leaks', label: 'Leaks', icon: Search },
  { id: 'budget', label: 'Budget', icon: Wallet2 },
  { id: 'savings', label: 'Savings', icon: PiggyBank },
  { id: 'feedback', label: 'Feedback', icon: MessageSquareHeart },
]

// Primary destinations on the mobile bottom bar; the rest live in "More".
const primaryMobile: ViewId[] = ['overview', 'summary', 'calendar', 'insights']

const titles: Record<ViewId, string> = {
  overview: 'Overview',
  summary: 'Expense summary',
  expenses: 'Expenses',
  calendar: 'Spending calendar',
  insights: 'Insights & advice',
  afford: 'Can I afford this?',
  leaks: 'Money leak detector',
  budget: 'Weekly & monthly budget',
  savings: 'Savings & streaks',
  feedback: 'Send feedback',
  profile: 'Profile',
}

export function AppShell() {
  const { setup, expenses, resetAll } = useStore()
  const { user, logOut } = useAuth()
  const [view, setView] = useState<ViewId>('overview')
  const [moreOpen, setMoreOpen] = useState(false)

  const status = setup ? computeDailyStatus(setup, expenses) : null

  // Opt-in budget notifications: nudge (once a day) when today's spend goes
  // over the safe limit. Only fires if the user turned notifications on and
  // the browser granted permission.
  useEffect(() => {
    if (!user?.notifyOptIn || !status) return
    if (getPermission() !== 'granted') return
    if (status.level === 'danger') {
      sendDailyAlertOnce(
        'over-budget',
        "You're over today's limit",
        status.message,
      )
    } else if (status.level === 'caution') {
      sendDailyAlertOnce(
        'near-limit',
        'Getting close to your daily limit',
        status.message,
      )
    }
  }, [status?.level, status?.message, user?.notifyOptIn])

  function go(id: ViewId) {
    setView(id)
    setMoreOpen(false)
  }

  function render() {
    switch (view) {
      case 'overview':
        return <Overview goTo={setView} />
      case 'summary':
        return <Summary />
      case 'expenses':
        return <Expenses />
      case 'calendar':
        return <Calendar />
      case 'insights':
        return <Insights />
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
      case 'profile':
        return <Profile />
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

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {nav.map((item) => (
            <NavButton
              key={item.id}
              active={view === item.id}
              onClick={() => go(item.id)}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </nav>

        <div className="mt-4 flex flex-col gap-3">
          {status && (
            <div className="rounded-xl bg-sidebar-accent p-3 text-sidebar-accent-foreground">
              <p className="text-xs font-medium opacity-80">Safe to spend today</p>
              <p className="font-mono text-xl font-semibold">
                {formatNaira(Math.max(status.remainingToday, 0))}
              </p>
            </div>
          )}

          {/* Account row */}
          <button
            onClick={() => go('profile')}
            className={cn(
              'flex items-center gap-2.5 rounded-xl p-2 text-left transition-colors',
              view === 'profile' ? 'bg-muted' : 'hover:bg-muted',
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary font-mono text-sm font-semibold text-primary-foreground">
              {initials(user?.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{user?.name ?? 'Account'}</span>
              <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm('Reset all budget and expense data?')) resetAll()
              }}
              className="flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="size-4" /> Reset
            </button>
            <button
              onClick={logOut}
              className="flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <LogOut className="size-4" /> Log out
            </button>
          </div>
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
            {/* Profile avatar (mobile) */}
            <button
              onClick={() => go('profile')}
              aria-label="Open profile"
              className={cn(
                'flex size-8 items-center justify-center rounded-lg font-mono text-xs font-semibold transition-colors lg:hidden',
                view === 'profile'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/70',
              )}
            >
              {initials(user?.name)}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-6 lg:px-8">{render()}</main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-border bg-background/90 px-1 py-1.5 backdrop-blur lg:hidden">
        {nav
          .filter((item) => primaryMobile.includes(item.id))
          .map((item) => {
            const Icon = item.icon
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
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
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[0.65rem] font-medium transition-colors',
            moreOpen ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <MoreHorizontal className="size-5" />
          <span>More</span>
        </button>
      </nav>

      {/* More menu (mobile) */}
      {moreOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-background p-5 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">More</h2>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {nav
                .filter((item) => !primaryMobile.includes(item.id))
                .map((item) => {
                  const Icon = item.icon
                  const active = view === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => go(item.id)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-2xl border p-4 text-center text-xs font-medium transition-colors',
                        active
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="size-5" />
                      <span className="leading-tight">{item.label}</span>
                    </button>
                  )
                })}
              <button
                onClick={() => go('profile')}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-2xl border p-4 text-center text-xs font-medium transition-colors',
                  view === 'profile'
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <User className="size-5" />
                <span className="leading-tight">Profile</span>
              </button>
            </div>

            <button
              onClick={() => {
                setMoreOpen(false)
                logOut()
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-danger/40 py-3 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
            >
              <LogOut className="size-4" /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function initials(name?: string): string {
  if (!name) return 'U'
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'U'
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
