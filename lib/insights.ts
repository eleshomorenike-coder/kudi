import type { BudgetSetup, CategoryMeta, Expense, SavingsGoal } from './types'
import {
  computeDailyStatus,
  computeStreaks,
  expensesInCurrentPeriod,
  flexiblePool,
  formatNaira,
  periodProgress,
  spendablePool,
  spentByCategory,
  totalSpent,
  type StatusLevel,
} from './finance'

/* ------------------------------------------------------------------ *
 * Spending patterns
 *
 * Turns the raw expense log into human-readable observations about *how*
 * a student spends — busiest day, favourite category, weekday vs weekend,
 * average spend and week-over-week trend.
 * ------------------------------------------------------------------ */

export interface SpendingPattern {
  id: string
  title: string
  detail: string
  /** Optional headline figure shown alongside the pattern. */
  figure?: string
}

const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Human label for a category id, falling back to the raw id. */
export function categoryLabel(categories: CategoryMeta[], id: string): string {
  return categories.find((c) => c.id === id)?.label ?? id
}

export function spendingPatterns(
  expenses: Expense[],
  categories: CategoryMeta[],
  now = new Date(),
): SpendingPattern[] {
  const patterns: SpendingPattern[] = []
  if (expenses.length === 0) return patterns

  // Consider the last 30 days so patterns reflect recent behaviour.
  const monthAgo = new Date(now)
  monthAgo.setDate(monthAgo.getDate() - 30)
  const recent = expenses.filter((e) => new Date(e.date) >= monthAgo && new Date(e.date) <= now)
  const scope = recent.length >= 4 ? recent : expenses

  // 1. Favourite category
  const byCat = spentByCategory(scope)
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]
  if (topCat) {
    const [catId, amount] = topCat
    const share = totalSpent(scope) > 0 ? amount / totalSpent(scope) : 0
    patterns.push({
      id: 'top-category',
      title: `Most of your money goes to ${categoryLabel(categories, catId)}`,
      detail: `That's ${formatNaira(amount)} — about ${Math.round(share * 100)}% of everything you've logged recently.`,
      figure: `${Math.round(share * 100)}%`,
    })
  }

  // 2. Busiest day of week
  const byWeekday = new Array(7).fill(0) as number[]
  const countWeekday = new Array(7).fill(0) as number[]
  for (const e of scope) {
    const wd = new Date(e.date).getDay()
    byWeekday[wd] += e.amount
    countWeekday[wd] += 1
  }
  const busiest = byWeekday.indexOf(Math.max(...byWeekday))
  if (byWeekday[busiest] > 0) {
    patterns.push({
      id: 'busiest-day',
      title: `${WEEKDAY_LABELS[busiest]} is your biggest spending day`,
      detail: `You tend to spend the most on ${WEEKDAY_LABELS[busiest]}s — ${formatNaira(byWeekday[busiest])} in total so far.`,
      figure: WEEKDAY_LABELS[busiest].slice(0, 3),
    })
  }

  // 3. Weekday vs weekend
  const weekendTotal = byWeekday[0] + byWeekday[6]
  const weekdayTotal = byWeekday.slice(1, 6).reduce((s, v) => s + v, 0)
  const total = weekendTotal + weekdayTotal
  if (total > 0) {
    const weekendShare = weekendTotal / total
    if (weekendShare >= 0.45) {
      patterns.push({
        id: 'weekend-heavy',
        title: 'Weekends cost you the most',
        detail: `About ${Math.round(weekendShare * 100)}% of your spending lands on Saturdays and Sundays. Planning weekend outings ahead can keep them in check.`,
        figure: `${Math.round(weekendShare * 100)}%`,
      })
    }
  }

  // 4. Average daily spend across the days actually logged
  const dayKeys = new Set(scope.map((e) => startOfDay(new Date(e.date)).getTime()))
  if (dayKeys.size > 0) {
    const avg = totalSpent(scope) / dayKeys.size
    patterns.push({
      id: 'avg-daily',
      title: 'Your typical spending day',
      detail: `Across the days you logged, you spend about ${formatNaira(avg)} per day.`,
      figure: formatNaira(avg, { compact: true }),
    })
  }

  // 5. Week-over-week trend
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const twoWeeksAgo = new Date(now)
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const thisWeek = expenses
    .filter((e) => new Date(e.date) >= weekAgo && new Date(e.date) <= now)
    .reduce((s, e) => s + e.amount, 0)
  const lastWeek = expenses
    .filter((e) => new Date(e.date) >= twoWeeksAgo && new Date(e.date) < weekAgo)
    .reduce((s, e) => s + e.amount, 0)
  if (lastWeek > 0) {
    const change = (thisWeek - lastWeek) / lastWeek
    if (Math.abs(change) >= 0.15) {
      const up = change > 0
      patterns.push({
        id: 'trend',
        title: up ? 'Spending is trending up' : 'Spending is trending down',
        detail: up
          ? `You've spent about ${Math.round(change * 100)}% more this week than last week (${formatNaira(thisWeek)} vs ${formatNaira(lastWeek)}).`
          : `Nice — you've spent about ${Math.round(Math.abs(change) * 100)}% less this week than last week (${formatNaira(thisWeek)} vs ${formatNaira(lastWeek)}).`,
        figure: `${up ? '+' : '-'}${Math.round(Math.abs(change) * 100)}%`,
      })
    }
  }

  return patterns
}

/* ------------------------------------------------------------------ *
 * Advice & recommendations
 *
 * Personalised, encouraging guidance that reacts to the student's real
 * numbers: today's status, savings progress, buffer health and habits.
 * ------------------------------------------------------------------ */

export type AdviceTone = 'positive' | 'neutral' | 'warning'

export interface Advice {
  id: string
  tone: AdviceTone
  title: string
  detail: string
}

const toneFromLevel: Record<StatusLevel, AdviceTone> = {
  safe: 'positive',
  caution: 'neutral',
  danger: 'warning',
}

export function generateAdvice(
  setup: BudgetSetup,
  expenses: Expense[],
  goal: SavingsGoal | null,
  now = new Date(),
): Advice[] {
  const advice: Advice[] = []
  const status = computeDailyStatus(setup, expenses, now)
  const progress = periodProgress(setup, now)
  const streaks = computeStreaks(expenses, now)
  const pool = spendablePool(setup)
  const periodExpenses = expensesInCurrentPeriod(setup, expenses, now)
  const spentSoFar = periodExpenses.reduce((s, e) => s + e.amount, 0)
  const remaining = Math.max(pool - spentSoFar, 0)

  // 1. Today's pace
  advice.push({
    id: 'pace',
    tone: toneFromLevel[status.level],
    title:
      status.level === 'safe'
        ? "You're on track today"
        : status.level === 'caution'
          ? 'Ease off a little today'
          : "You're over today's limit",
    detail: status.message,
  })

  // 2. Runway — will the money last the period?
  const dailyAllowance = status.adaptiveDailyLimit
  if (progress.daysRemaining > 0) {
    const burnRate = progress.daysElapsed > 0 ? spentSoFar / Math.max(progress.daysElapsed, 1) : 0
    const projectedEnd = burnRate * progress.totalDays
    if (burnRate > 0 && projectedEnd > pool * 1.05) {
      advice.push({
        id: 'runway',
        tone: 'warning',
        title: 'At this rate the money runs out early',
        detail: `You're spending about ${formatNaira(burnRate)} a day. Keeping it under ${formatNaira(dailyAllowance)} makes it last the full ${progress.totalDays} days.`,
      })
    } else if (burnRate > 0) {
      advice.push({
        id: 'runway',
        tone: 'positive',
        title: 'Your money should last the period',
        detail: `At your current pace you'll finish the ${progress.totalDays} days with roughly ${formatNaira(Math.max(pool - projectedEnd, 0))} to spare.`,
      })
    }
  }

  // 3. Savings
  if (goal) {
    const pct = goal.target > 0 ? goal.saved / goal.target : 0
    if (pct >= 1) {
      advice.push({
        id: 'savings',
        tone: 'positive',
        title: `Goal reached: ${goal.name}`,
        detail: `You've saved the full ${formatNaira(goal.target)}. Consider setting a new goal to keep the momentum going.`,
      })
    } else {
      advice.push({
        id: 'savings',
        tone: 'neutral',
        title: `${Math.round(pct * 100)}% of the way to ${goal.name}`,
        detail: `${formatNaira(goal.target - goal.saved)} to go. Moving even ${formatNaira(Math.max(setup.savingsTarget / progress.totalDays, 100))} a day gets you there steadily.`,
      })
    }
  } else if (setup.savingsTarget <= 0) {
    advice.push({
      id: 'savings',
      tone: 'neutral',
      title: 'Set aside a little for savings',
      detail: 'Even a small savings target each period builds a cushion. Try setting a goal in the Savings tab.',
    })
  }

  // 4. Habit / streak
  if (streaks.trackingStreak >= 3) {
    advice.push({
      id: 'streak',
      tone: 'positive',
      title: `${streaks.trackingStreak}-day logging streak`,
      detail: 'Consistent tracking is the single biggest predictor of staying on budget. Keep it up.',
    })
  } else {
    advice.push({
      id: 'streak',
      tone: 'neutral',
      title: 'Log every spend to see the full picture',
      detail: 'The more you log, the sharper your advice and leak detection become. Aim for at least one entry a day.',
    })
  }

  // 5. Buffer health
  if (remaining < dailyAllowance && progress.daysRemaining > 1) {
    advice.push({
      id: 'buffer',
      tone: 'warning',
      title: 'Very little left for the rest of the period',
      detail: `Only ${formatNaira(remaining)} remains for ${progress.daysRemaining} more days. Lean on essentials and pause flexible spending where you can.`,
    })
  }

  return advice
}

/* ------------------------------------------------------------------ *
 * Summary board
 * ------------------------------------------------------------------ */

export interface CategorySummary {
  id: string
  spent: number
  share: number
}

export interface ExpenseSummary {
  totalAllTime: number
  totalThisPeriod: number
  count: number
  averagePerEntry: number
  largest: Expense | null
  flexibleShare: number
  byCategory: CategorySummary[]
}

export function buildSummary(
  setup: BudgetSetup,
  expenses: Expense[],
  now = new Date(),
): ExpenseSummary {
  const periodExpenses = expensesInCurrentPeriod(setup, expenses, now)
  const totalThisPeriod = periodExpenses.reduce((s, e) => s + e.amount, 0)
  const totalAllTime = totalSpent(expenses)
  const byCatMap = spentByCategory(periodExpenses)
  const byCategory: CategorySummary[] = Object.entries(byCatMap)
    .map(([id, spent]) => ({
      id,
      spent,
      share: totalThisPeriod > 0 ? spent / totalThisPeriod : 0,
    }))
    .sort((a, b) => b.spent - a.spent)

  const largest = expenses.reduce<Expense | null>(
    (max, e) => (!max || e.amount > max.amount ? e : max),
    null,
  )

  const pool = flexiblePool(setup)
  const flexRemaining = Math.max(pool - totalThisPeriod, 0)

  return {
    totalAllTime,
    totalThisPeriod,
    count: expenses.length,
    averagePerEntry: expenses.length > 0 ? totalAllTime / expenses.length : 0,
    largest,
    flexibleShare: pool > 0 ? flexRemaining / pool : 0,
    byCategory,
  }
}
