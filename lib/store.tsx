'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppState,
  BankConnection,
  BankTransaction,
  BudgetSetup,
  CategoryMeta,
  Expense,
  IncentiveProfile,
  SavingsActionType,
  SavingsEntry,
  SavingsGoal,
  UserChallengeProgress,
} from './types'
import { DEFAULT_CATEGORIES } from './types'
import { computeDailyStatus, remainingBudget } from './finance'
import {
  DEFAULT_INCENTIVES,
  SAVINGS_CHALLENGES,
  calculateSavingsStreak,
  calculateXpForAction,
  evaluateBadges,
} from './incentives'
import { getDeviceId } from './device-id'
import { recordUsage } from '@/app/actions/usage'

const STORAGE_BASE = 'kudi.state.v1'

/** Per-account storage key so each signed-in user keeps their own data. */
function storageKey(userId?: string): string {
  return userId ? `${STORAGE_BASE}::${userId}` : STORAGE_BASE
}

/** Result of attempting to log an expense against the period budget cap. */
export interface AddExpenseResult {
  ok: boolean
  /** Money left in the period budget (after the expense when `ok`, before it when blocked). */
  remaining: number
  attempted: number
}

interface StoreValue extends AppState {
  ready: boolean
  saveSetup: (setup: BudgetSetup) => void
  addExpense: (
    expense: Omit<Expense, 'id' | 'date'> & { date?: string },
  ) => AddExpenseResult
  deleteExpense: (id: string) => void
  setGoal: (goal: SavingsGoal | null) => void
  addToSavings: (
    amount: number,
    note?: string,
    type?: SavingsActionType,
  ) => void
  /** Sweeps today's unspent safe daily budget into savings for +50 bonus XP. Returns amount saved. */
  sweepDailyRollover: () => number
  startChallenge: (challengeId: string) => void
  contributeToChallenge: (challengeId: string, amount: number) => void
  claimChallengeReward: (challengeId: string) => void
  addCategory: (meta: Omit<CategoryMeta, 'id' | 'builtin'>) => void
  updateCategory: (id: string, patch: Partial<Omit<CategoryMeta, 'id' | 'builtin'>>) => void
  deleteCategory: (id: string) => void
  /** Link a bank account for premium auto-import. */
  connectBank: (connection: BankConnection) => void
  /** Remove the linked bank (imported expenses are kept). */
  disconnectBank: () => void
  /**
   * Import bank transactions as expenses. De-dupes by transaction id and
   * bypasses the manual budget cap (these already happened). Also stamps the
   * connection's lastSyncedAt. Returns how many new expenses were added.
   */
  importTransactions: (txns: BankTransaction[]) => number
  resetAll: () => void
  loadDemoData: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const emptyState: AppState = {
  setup: null,
  expenses: [],
  goal: null,
  categories: DEFAULT_CATEGORIES,
  bank: null,
  incentives: DEFAULT_INCENTIVES,
}

/** Backfills fields for accounts created before newer features existed. */
function hydrate(state: AppState): AppState {
  if (!state || typeof state !== 'object') {
    return emptyState
  }

  const inc = state.incentives || DEFAULT_INCENTIVES
  const safeIncentives: IncentiveProfile = {
    ...DEFAULT_INCENTIVES,
    ...inc,
    history: Array.isArray(inc.history) ? inc.history : [],
    activeChallenges: Array.isArray(inc.activeChallenges) ? inc.activeChallenges : [],
    completedChallengeIds: Array.isArray(inc.completedChallengeIds) ? inc.completedChallengeIds : [],
    unlockedBadgeIds: Array.isArray(inc.unlockedBadgeIds) ? inc.unlockedBadgeIds : [],
  }

  // Ensure badges are evaluated
  safeIncentives.unlockedBadgeIds = evaluateBadges(safeIncentives, state.goal ?? null)
  safeIncentives.savingsStreak = calculateSavingsStreak(safeIncentives.history)

  return {
    setup: state.setup ?? null,
    expenses: Array.isArray(state.expenses) ? state.expenses : [],
    goal: state.goal ?? null,
    categories:
      Array.isArray(state.categories) && state.categories.length > 0
        ? state.categories
        : DEFAULT_CATEGORIES,
    bank: state.bank ?? null,
    incentives: safeIncentives,
  }
}

export function StoreProvider({
  children,
  userId,
}: {
  children: ReactNode
  userId?: string
}) {
  // Load the signed-in user's data synchronously. The provider only mounts
  // client-side after auth resolves, so localStorage is always available.
  const [state, setState] = useState<AppState>(() => {
    try {
      const raw = localStorage.getItem(storageKey(userId))
      return raw ? hydrate(JSON.parse(raw)) : emptyState
    } catch {
      return emptyState
    }
  })

  // Persist every state change to localStorage.
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(state))
    } catch {
      // storage may be unavailable
    }
  }, [state, userId])

  // Record an anonymous "visit" once per device (server de-dupes repeats).
  useEffect(() => {
    const deviceId = getDeviceId()
    if (deviceId) void recordUsage(deviceId, 'visit')
  }, [])

  const value: StoreValue = {
    ...state,
    ready: true,
    saveSetup: (setup) => {
      setState((s) => ({ ...s, setup }))
      // Count this device as an activated user (once, server de-dupes).
      const deviceId = getDeviceId()
      if (deviceId) void recordUsage(deviceId, 'setup_complete')
    },
    addExpense: (expense) => {
      // Enforce the hard budget cap: never let a spend push the period total
      // past what the student is actually allowed to spend.
      if (state.setup) {
        const remaining = remainingBudget(state.setup, state.expenses, new Date(), state.incentives.history)
        if (expense.amount > remaining) {
          return { ok: false, remaining, attempted: expense.amount }
        }
        setState((s) => ({
          ...s,
          expenses: [
            {
              id: uid(),
              date: expense.date ?? new Date().toISOString(),
              amount: expense.amount,
              category: expense.category,
              note: expense.note,
            },
            ...s.expenses,
          ],
        }))
        return {
          ok: true,
          remaining: remaining - expense.amount,
          attempted: expense.amount,
        }
      }

      setState((s) => ({
        ...s,
        expenses: [
          {
            id: uid(),
            date: expense.date ?? new Date().toISOString(),
            amount: expense.amount,
            category: expense.category,
            note: expense.note,
          },
          ...s.expenses,
        ],
      }))
      return { ok: true, remaining: 0, attempted: expense.amount }
    },
    deleteExpense: (id) =>
      setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) })),
    setGoal: (goal) =>
      setState((s) => {
        const nextIncentives = { ...s.incentives }
        nextIncentives.unlockedBadgeIds = evaluateBadges(nextIncentives, goal)
        return { ...s, goal, incentives: nextIncentives }
      }),
    addToSavings: (amount, note, type = 'manual') =>
      setState((s) => {
        const safeAmount = Math.max(0, amount)
        if (safeAmount <= 0) return s

        const xpEarned = calculateXpForAction(safeAmount, type)
        const newEntry: SavingsEntry = {
          id: uid(),
          amount: safeAmount,
          note: note || (type === 'rollover' ? 'Daily budget surplus swept' : 'Saved to goal'),
          date: new Date().toISOString(),
          type,
          xpEarned,
        }

        const nextHistory = [newEntry, ...s.incentives.history]
        const nextTotalSaved = s.incentives.totalSavedAllTime + safeAmount
        const nextStreak = calculateSavingsStreak(nextHistory)
        const nextXp = s.incentives.xp + xpEarned
        const nextRollovers = type === 'rollover' ? s.incentives.rolloverCount + 1 : s.incentives.rolloverCount

        // Update active challenges progress
        const nextChallenges = s.incentives.activeChallenges.map((c) => {
          if (c.status !== 'active') return c
          const def = SAVINGS_CHALLENGES.find((item) => item.id === c.challengeId)
          const newAmt = c.currentAmount + safeAmount
          const isDone = def ? newAmt >= def.targetAmount : false
          return {
            ...c,
            currentAmount: newAmt,
            status: isDone ? ('completed' as const) : c.status,
            completedAt: isDone ? new Date().toISOString() : c.completedAt,
          }
        })

        const nextGoal = s.goal
          ? { ...s.goal, saved: s.goal.saved + safeAmount }
          : { name: 'Emergency Fund', target: 20000, saved: safeAmount }

        const nextIncentives: IncentiveProfile = {
          ...s.incentives,
          xp: nextXp,
          totalSavedAllTime: nextTotalSaved,
          history: nextHistory,
          savingsStreak: Math.max(nextStreak, s.incentives.savingsStreak),
          lastSavedDate: newEntry.date,
          rolloverCount: nextRollovers,
          activeChallenges: nextChallenges,
          unlockedBadgeIds: [],
        }

        nextIncentives.unlockedBadgeIds = evaluateBadges(nextIncentives, nextGoal)

        return {
          ...s,
          goal: nextGoal,
          incentives: nextIncentives,
        }
      }),
    sweepDailyRollover: () => {
      if (!state.setup) return 0
      const status = computeDailyStatus(state.setup, state.expenses, new Date(), state.incentives.history)
      const leftover = Math.max(0, Math.floor(status.remainingToday))
      if (leftover <= 0) return 0

      value.addToSavings(leftover, `Daily budget surplus (+50 XP)`, 'rollover')
      return leftover
    },
    startChallenge: (challengeId) =>
      setState((s) => {
        if (s.incentives.activeChallenges.some((c) => c.challengeId === challengeId && c.status === 'active')) {
          return s
        }
        const fresh: UserChallengeProgress = {
          challengeId,
          currentAmount: 0,
          startedAt: new Date().toISOString(),
          status: 'active',
        }
        return {
          ...s,
          incentives: {
            ...s.incentives,
            activeChallenges: [fresh, ...s.incentives.activeChallenges.filter((c) => c.challengeId !== challengeId)],
          },
        }
      }),
    contributeToChallenge: (challengeId, amount) => {
      value.addToSavings(amount, `Challenge progress: ${challengeId}`, 'challenge')
    },
    claimChallengeReward: (challengeId) =>
      setState((s) => {
        const ch = s.incentives.activeChallenges.find((c) => c.challengeId === challengeId)
        if (!ch || ch.status !== 'completed' || s.incentives.completedChallengeIds.includes(challengeId)) {
          return s
        }
        const def = SAVINGS_CHALLENGES.find((item) => item.id === challengeId)
        const bonusXp = def ? def.xpReward : 200

        const nextCompleted = [...s.incentives.completedChallengeIds, challengeId]
        const nextIncentives: IncentiveProfile = {
          ...s.incentives,
          xp: s.incentives.xp + bonusXp,
          completedChallengeIds: nextCompleted,
          unlockedBadgeIds: [],
        }
        nextIncentives.unlockedBadgeIds = evaluateBadges(nextIncentives, s.goal)

        return {
          ...s,
          incentives: nextIncentives,
        }
      }),
    addCategory: (meta) =>
      setState((s) => {
        // Slug the label into a stable, unique id.
        const base = meta.label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category'
        let id = base
        let n = 2
        while (s.categories.some((c) => c.id === id)) id = `${base}-${n++}`
        return { ...s, categories: [...s.categories, { ...meta, id, builtin: false }] }
      }),
    updateCategory: (id, patch) =>
      setState((s) => ({
        ...s,
        categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      })),
    deleteCategory: (id) =>
      setState((s) => {
        const target = s.categories.find((c) => c.id === id)
        if (!target || target.builtin) return s // built-ins are protected
        return {
          ...s,
          categories: s.categories.filter((c) => c.id !== id),
          // Re-home any expenses logged under the removed category.
          expenses: s.expenses.map((e) =>
            e.category === id ? { ...e, category: 'other' } : e,
          ),
        }
      }),
    connectBank: (connection) => setState((s) => ({ ...s, bank: connection })),
    disconnectBank: () => setState((s) => ({ ...s, bank: null })),
    importTransactions: (txns) => {
      const existing = new Set(state.expenses.map((e) => e.id))
      const added = txns.filter((t) => !existing.has(t.id)).length
      setState((s) => {
        const existingIds = new Set(s.expenses.map((e) => e.id))
        const fresh: Expense[] = txns
          .filter((t) => !existingIds.has(t.id))
          .map((t) => ({
            id: t.id,
            amount: t.amount,
            category: t.category,
            note: t.note,
            date: t.date,
            source: 'bank' as const,
          }))
        return {
          ...s,
          expenses: [...fresh, ...s.expenses].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          ),
          bank: s.bank ? { ...s.bank, lastSyncedAt: new Date().toISOString() } : s.bank,
        }
      })
      return added
    },
    resetAll: () => setState(emptyState),
    loadDemoData: () => setState(makeDemoData()),
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

/** Seeds a believable week of spending so the prototype demos well. */
function makeDemoData(): AppState {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 6)
  start.setHours(8, 0, 0, 0)

  const setup: BudgetSetup = {
    income: 50000,
    period: 'monthly',
    startDate: start.toISOString(),
    essentials: {
      food: 18000,
      transport: 8000,
      data: 4000,
      school: 2000,
      personal: 3000,
    },
    savingsTarget: 5000,
    emergencyBuffer: 3000,
  }

  const seeds: Array<[number, number, Expense['category'], string]> = [
    // [daysAgo, amount, category, note]
    [6, 1500, 'food', 'Lunch + rice'],
    [6, 800, 'transport', 'Keke to campus'],
    [6, 500, 'fun', 'Biscuits'],
    [5, 1200, 'food', 'Dinner'],
    [5, 1500, 'data', 'Data top-up'],
    [5, 700, 'fun', 'Soft drink'],
    [4, 900, 'transport', 'Bus fare'],
    [4, 2000, 'food', 'Groceries'],
    [4, 600, 'fun', 'Snacks'],
    [3, 800, 'fun', 'Chin chin'],
    [3, 1000, 'food', 'Beans and bread'],
    [2, 1500, 'personal', 'Toiletries'],
    [2, 900, 'transport', 'Keke'],
    [2, 700, 'fun', 'Ice cream'],
    [1, 1200, 'food', 'Lunch'],
    [1, 900, 'fun', 'Shawarma'],
    [0, 600, 'food', 'Breakfast'],
    [0, 800, 'fun', 'Snacks'],
  ]

  const expenses: Expense[] = seeds.map(([daysAgo, amount, category, note], i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - daysAgo)
    d.setHours(10 + (i % 8), (i * 7) % 60, 0, 0)
    return {
      id: `demo-${i}`,
      amount,
      category,
      note,
      date: d.toISOString(),
    }
  })

  const goal: SavingsGoal = { name: 'Textbooks for next semester', target: 20000, saved: 7500 }

  const history: SavingsEntry[] = [
    {
      id: 'demo-s-1',
      amount: 2000,
      note: 'Weekend surplus sweep',
      date: new Date(now.getTime() - 86400000 * 3).toISOString(),
      type: 'rollover',
      xpEarned: 70,
    },
    {
      id: 'demo-s-2',
      amount: 3000,
      note: 'Allowance savings target',
      date: new Date(now.getTime() - 86400000 * 5).toISOString(),
      type: 'manual',
      xpEarned: 30,
    },
    {
      id: 'demo-s-3',
      amount: 1500,
      note: 'Skipped Friday outing',
      date: new Date(now.getTime() - 86400000 * 2).toISOString(),
      type: 'boost',
      xpEarned: 30,
    },
    {
      id: 'demo-s-4',
      amount: 1000,
      note: 'Daily allowance leftover',
      date: new Date(now.getTime() - 86400000).toISOString(),
      type: 'rollover',
      xpEarned: 60,
    },
  ]

  const demoIncentives: IncentiveProfile = {
    xp: 440,
    savingsStreak: 4,
    lastSavedDate: new Date(now.getTime() - 86400000).toISOString(),
    totalSavedAllTime: 7500,
    rolloverCount: 2,
    history,
    activeChallenges: [
      {
        challengeId: 'habit-7-day',
        currentAmount: 2500,
        startedAt: new Date(now.getTime() - 86400000 * 4).toISOString(),
        status: 'active',
      },
    ],
    completedChallengeIds: [],
    unlockedBadgeIds: ['first-seed', 'streak-starter', 'rollover-rookie'],
  }

  return { setup, expenses, goal, categories: DEFAULT_CATEGORIES, bank: null, incentives: demoIncentives }
}

