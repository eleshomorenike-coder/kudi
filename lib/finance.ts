import type {
  BudgetSetup,
  CategoryId,
  Expense,
  Period,
} from './types'
import { ESSENTIAL_CATEGORIES } from './types'

export function formatNaira(amount: number, opts?: { compact?: boolean }): string {
  const value = Math.round(amount)
  if (opts?.compact && Math.abs(value) >= 1000) {
    const k = value / 1000
    return `₦${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`
  }
  return `₦${value.toLocaleString('en-NG')}`
}

export function periodLengthDays(period: Period): number {
  return period === 'weekly' ? 7 : 30
}

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

/** Sum of all planned essential category amounts. */
export function essentialsTotal(setup: BudgetSetup): number {
  return ESSENTIAL_CATEGORIES.reduce(
    (sum, c) => sum + (setup.essentials[c.id as keyof typeof setup.essentials] || 0),
    0,
  )
}

/** Money left over for day-to-day discretionary spending (after essentials, savings, buffer). */
export function flexiblePool(setup: BudgetSetup): number {
  return Math.max(
    0,
    setup.income - essentialsTotal(setup) - setup.savingsTarget - setup.emergencyBuffer,
  )
}

/**
 * All money a student can actually spend during the period — everything
 * except what's committed to savings and the emergency buffer. This is what
 * the daily limit is built from, so every expense (food, transport, fun)
 * counts against it.
 */
export function spendablePool(setup: BudgetSetup): number {
  return Math.max(0, setup.income - setup.savingsTarget - setup.emergencyBuffer)
}

export interface PeriodProgress {
  totalDays: number
  daysElapsed: number
  daysRemaining: number
  fractionElapsed: number
}

export function periodProgress(setup: BudgetSetup, now = new Date()): PeriodProgress {
  const totalDays = periodLengthDays(setup.period)
  const start = startOfDay(new Date(setup.startDate))
  const today = startOfDay(now)
  const diff = Math.floor((today.getTime() - start.getTime()) / 86_400_000)
  const daysElapsed = Math.min(Math.max(diff, 0), totalDays)
  const daysRemaining = Math.max(totalDays - daysElapsed, 1)
  return {
    totalDays,
    daysElapsed,
    daysRemaining,
    fractionElapsed: totalDays ? daysElapsed / totalDays : 0,
  }
}

export function expensesInCurrentPeriod(setup: BudgetSetup, expenses: Expense[], now = new Date()): Expense[] {
  const start = startOfDay(new Date(setup.startDate))
  const end = new Date(start)
  end.setDate(end.getDate() + periodLengthDays(setup.period))
  return expenses.filter((e) => {
    const d = new Date(e.date)
    return d >= start && d < end && d <= now
  })
}

export function spentByCategory(expenses: Expense[]): Record<CategoryId, number> {
  const totals = {
    food: 0,
    transport: 0,
    data: 0,
    school: 0,
    personal: 0,
    fun: 0,
  } as Record<CategoryId, number>
  for (const e of expenses) {
    totals[e.category] += e.amount
  }
  return totals
}

export function totalSpent(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + e.amount, 0)
}

export function spentToday(expenses: Expense[], now = new Date()): number {
  return expenses
    .filter((e) => isSameDay(new Date(e.date), now))
    .reduce((s, e) => s + e.amount, 0)
}

export type StatusLevel = 'safe' | 'caution' | 'danger'

export interface DailyStatus {
  dailyLimit: number
  adaptiveDailyLimit: number
  spentToday: number
  remainingToday: number
  usedFraction: number
  level: StatusLevel
  message: string
}

/**
 * The core "safe daily spending" calculation. The flexible pool is spread
 * across the days that remain in the period, then measured against what has
 * already been spent today.
 */
export function computeDailyStatus(
  setup: BudgetSetup,
  expenses: Expense[],
  now = new Date(),
): DailyStatus {
  const pool = flexiblePool(setup)
  const progress = periodProgress(setup, now)
  const periodExpenses = expensesInCurrentPeriod(setup, expenses, now)

  const baseDaily = pool / progress.totalDays
  const flexSpentSoFar = periodExpenses.reduce((s, e) => s + e.amount, 0)
  const remainingPool = Math.max(pool - flexSpentSoFar, 0)
  const adaptiveDailyLimit = remainingPool / progress.daysRemaining

  const today = spentToday(expenses, now)
  const limit = adaptiveDailyLimit
  const remainingToday = limit - today
  const usedFraction = limit > 0 ? today / limit : today > 0 ? 1 : 0

  let level: StatusLevel = 'safe'
  let message = ''
  if (usedFraction >= 1) {
    level = 'danger'
    message = `You've gone ${formatNaira(Math.abs(remainingToday))} over today's limit.`
  } else if (usedFraction >= 0.8) {
    level = 'caution'
    message = `You've used ${Math.round(usedFraction * 100)}% of today's allowance.`
  } else {
    level = 'safe'
    message = `You can still spend ${formatNaira(remainingToday)} today.`
  }

  return {
    dailyLimit: baseDaily,
    adaptiveDailyLimit,
    spentToday: today,
    remainingToday,
    usedFraction,
    level,
    message,
  }
}

export interface AffordResult {
  level: StatusLevel
  headline: string
  detail: string
}

/**
 * The "Can I Afford This?" logic. Considers the flexible pool, remaining
 * days, and how many days of daily allowance the purchase would consume.
 */
export function canIAfford(
  setup: BudgetSetup,
  expenses: Expense[],
  amount: number,
  now = new Date(),
): AffordResult {
  const status = computeDailyStatus(setup, expenses, now)
  const progress = periodProgress(setup, now)
  const pool = flexiblePool(setup)
  const periodExpenses = expensesInCurrentPeriod(setup, expenses, now)
  const flexSpentSoFar = periodExpenses.reduce((s, e) => s + e.amount, 0)
  const remainingPool = Math.max(pool - flexSpentSoFar, 0)

  const afterToday = status.remainingToday - amount
  const daysOfAllowance = status.adaptiveDailyLimit > 0
    ? amount / status.adaptiveDailyLimit
    : Infinity

  if (amount > remainingPool) {
    return {
      level: 'danger',
      headline: 'Not recommended',
      detail: `This is ${formatNaira(amount - remainingPool)} more than your remaining flexible money. It would eat into your food, transport or savings before your next allowance.`,
    }
  }

  if (afterToday >= 0) {
    return {
      level: 'safe',
      headline: 'Yes, go ahead',
      detail: `You can afford this and still have ${formatNaira(afterToday)} left for today without touching your essentials or savings.`,
    }
  }

  return {
    level: 'caution',
    headline: 'Yes, but be careful',
    detail: `You can afford this, but it uses about ${daysOfAllowance.toFixed(1)} days of your allowance. Your daily spending will be tighter for the next ${Math.min(Math.ceil(daysOfAllowance), progress.daysRemaining)} day(s).`,
  }
}

export interface Leak {
  id: string
  title: string
  detail: string
  amount: number
  level: StatusLevel
}

/**
 * The Money Leak Detector. Scans recent spending for patterns worth
 * flagging: heavy discretionary spend, essential overspend, and death by
 * a thousand small purchases.
 */
export function detectLeaks(setup: BudgetSetup, expenses: Expense[], now = new Date()): Leak[] {
  const leaks: Leak[] = []
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const recent = expenses.filter((e) => new Date(e.date) >= weekAgo && new Date(e.date) <= now)
  const byCat = spentByCategory(recent)
  const pool = flexiblePool(setup)

  // 1. Heavy discretionary / fun spending
  if (byCat.fun > 0) {
    const share = pool > 0 ? byCat.fun / pool : 0
    if (share >= 0.4) {
      leaks.push({
        id: 'fun-heavy',
        title: 'Flexible spending is running hot',
        detail: `${formatNaira(byCat.fun)} on flexible/fun spending this week — about ${Math.round(share * 100)}% of your whole flexible budget for the period.`,
        amount: byCat.fun,
        level: share >= 0.7 ? 'danger' : 'caution',
      })
    }
  }

  // 2. Essential category overspend vs. expected pace
  const progress = periodProgress(setup, now)
  for (const c of ESSENTIAL_CATEGORIES) {
    const planned = setup.essentials[c.id as keyof typeof setup.essentials] || 0
    if (planned <= 0) continue
    const expectedByNow = planned * progress.fractionElapsed
    const actual = spentByCategory(expensesInCurrentPeriod(setup, expenses, now))[c.id]
    if (actual > expectedByNow * 1.25 && actual - expectedByNow > 500) {
      leaks.push({
        id: `over-${c.id}`,
        title: `${c.label} is above your usual pace`,
        detail: `You've spent ${formatNaira(actual)} on ${c.label.toLowerCase()} — about ${formatNaira(actual - expectedByNow)} more than expected by this point in the period.`,
        amount: actual - expectedByNow,
        level: 'caution',
      })
    }
  }

  // 3. Small purchases adding up
  const small = recent.filter((e) => e.amount > 0 && e.amount < 1000)
  const smallTotal = small.reduce((s, e) => s + e.amount, 0)
  if (small.length >= 5 && smallTotal >= 2000) {
    leaks.push({
      id: 'small-cuts',
      title: 'Small purchases are adding up',
      detail: `${small.length} purchases under ₦1,000 quietly added up to ${formatNaira(smallTotal)} this week.`,
      amount: smallTotal,
      level: 'caution',
    })
  }

  return leaks
}

export interface StreakInfo {
  trackingStreak: number
  daysWithinBudget: number
}

/** Consecutive days (ending today or yesterday) with at least one logged expense. */
export function computeStreaks(expenses: Expense[], now = new Date()): StreakInfo {
  const days = new Set(
    expenses.map((e) => {
      const d = new Date(e.date)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }),
  )

  let streak = 0
  const cursor = new Date(now)
  cursor.setHours(0, 0, 0, 0)
  // Allow the streak to count even if nothing logged *yet* today.
  if (!days.has(cursor.getTime())) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (days.has(cursor.getTime())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return { trackingStreak: streak, daysWithinBudget: days.size }
}
