export type Period = 'weekly' | 'monthly'

export type CategoryId =
  | 'food'
  | 'transport'
  | 'data'
  | 'school'
  | 'personal'
  | 'fun'

export interface CategoryMeta {
  id: CategoryId
  label: string
  essential: boolean
  emoji: string
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'food', label: 'Food', essential: true, emoji: 'Food' },
  { id: 'transport', label: 'Transport', essential: true, emoji: 'Transport' },
  { id: 'data', label: 'Data', essential: true, emoji: 'Data' },
  { id: 'school', label: 'School', essential: true, emoji: 'School' },
  { id: 'personal', label: 'Personal', essential: true, emoji: 'Personal' },
  { id: 'fun', label: 'Flexible / Fun', essential: false, emoji: 'Fun' },
]

export const ESSENTIAL_CATEGORIES = CATEGORIES.filter((c) => c.essential)

/** The plan a student sets up once per budget period. */
export interface BudgetSetup {
  income: number
  period: Period
  /**
   * Optional custom length in days. When set (e.g. "make this last 20 days"),
   * it overrides the weekly/monthly default for all budget math.
   */
  days?: number
  startDate: string // ISO date (start of the period)
  /** Planned essential spend per category. */
  essentials: Record<Exclude<CategoryId, 'fun'>, number>
  savingsTarget: number
  emergencyBuffer: number
}

export interface Expense {
  id: string
  amount: number
  category: CategoryId
  note: string
  date: string // ISO datetime
}

export interface SavingsGoal {
  name: string
  target: number
  saved: number
}

export interface AppState {
  setup: BudgetSetup | null
  expenses: Expense[]
  goal: SavingsGoal | null
}
