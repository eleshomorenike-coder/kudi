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
  SavingsGoal,
} from './types'
import { DEFAULT_CATEGORIES } from './types'
import { remainingBudget } from './finance'
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
  addToSavings: (amount: number) => void
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
}

/** Backfills fields for accounts created before newer features existed. */
function hydrate(state: AppState): AppState {
  return {
    ...state,
    categories:
      Array.isArray(state.categories) && state.categories.length > 0
        ? state.categories
        : DEFAULT_CATEGORIES,
    bank: state.bank ?? null,
  }
}

export function StoreProvider({
  children,
  userId,
}: {
  children: ReactNode
  userId?: string
}) {
  const [state, setState] = useState<AppState>(emptyState)
  const [ready, setReady] = useState(false)

  // Load (and reload when the signed-in account changes) that user's data.
  useEffect(() => {
    setReady(false)
    try {
      const raw = localStorage.getItem(storageKey(userId))
      setState(raw ? hydrate(JSON.parse(raw)) : emptyState)
    } catch {
      setState(emptyState)
    }
    setReady(true)

    // Record an anonymous "visit" once per device (server de-dupes repeats).
    const deviceId = getDeviceId()
    if (deviceId) void recordUsage(deviceId, 'visit')
  }, [userId])

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(state))
    } catch {
      // storage may be unavailable
    }
  }, [state, ready, userId])

  const value: StoreValue = {
    ...state,
    ready,
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
        const remaining = remainingBudget(state.setup, state.expenses)
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
    setGoal: (goal) => setState((s) => ({ ...s, goal })),
    addToSavings: (amount) =>
      setState((s) =>
        s.goal
          ? { ...s, goal: { ...s.goal, saved: Math.max(0, s.goal.saved + amount) } }
          : s,
      ),
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
      let added = 0
      setState((s) => {
        const existing = new Set(s.expenses.map((e) => e.id))
        const fresh: Expense[] = txns
          .filter((t) => !existing.has(t.id))
          .map((t) => ({
            id: t.id,
            amount: t.amount,
            category: t.category,
            note: t.note,
            date: t.date,
            source: 'bank' as const,
          }))
        added = fresh.length
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

  const goal: SavingsGoal = { name: 'Textbooks for next semester', target: 20000, saved: 5000 }

  return { setup, expenses, goal, categories: DEFAULT_CATEGORIES, bank: null }
}
