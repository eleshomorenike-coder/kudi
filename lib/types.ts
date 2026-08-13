export type Period = 'weekly' | 'monthly'

/**
 * Categories are now dynamic: a set of broadened built-ins plus any the user
 * creates. Ids are plain strings so custom categories fit the same shape.
 */
export type CategoryId = string

export interface CategoryMeta {
  id: string
  label: string
  essential: boolean
  /** Key into the icon map in components/category-visuals. */
  icon: string
  /** Key into the color palette in components/category-visuals. */
  color: string
  /** Built-ins can't be deleted; user categories can. */
  builtin?: boolean
}

/**
 * The starter set every account begins with. The five essential ids
 * (food, transport, data, school, personal) drive the budget planner, so
 * their keys must stay stable. Everything else is flexible/trackable.
 */
export const DEFAULT_CATEGORIES: CategoryMeta[] = [
  { id: 'food', label: 'Food', essential: true, icon: 'utensils', color: 'green', builtin: true },
  { id: 'transport', label: 'Transport', essential: true, icon: 'bus', color: 'blue', builtin: true },
  { id: 'data', label: 'Data & Airtime', essential: true, icon: 'wifi', color: 'teal', builtin: true },
  { id: 'school', label: 'School', essential: true, icon: 'cap', color: 'violet', builtin: true },
  { id: 'personal', label: 'Personal care', essential: true, icon: 'sparkles', color: 'pink', builtin: true },
  { id: 'groceries', label: 'Groceries', essential: false, icon: 'basket', color: 'lime', builtin: true },
  { id: 'rent', label: 'Rent & bills', essential: false, icon: 'home', color: 'slate', builtin: true },
  { id: 'health', label: 'Health', essential: false, icon: 'health', color: 'coral', builtin: true },
  { id: 'entertainment', label: 'Entertainment', essential: false, icon: 'film', color: 'violet', builtin: true },
  { id: 'shopping', label: 'Shopping', essential: false, icon: 'bag', color: 'pink', builtin: true },
  { id: 'subscriptions', label: 'Subscriptions', essential: false, icon: 'repeat', color: 'teal', builtin: true },
  { id: 'fun', label: 'Flexible / Fun', essential: false, icon: 'party', color: 'amber', builtin: true },
  { id: 'other', label: 'Other', essential: false, icon: 'tag', color: 'slate', builtin: true },
]

/** Categories that participate in the essentials budget plan (the core five). */
export const ESSENTIAL_CATEGORIES = DEFAULT_CATEGORIES.filter((c) => c.essential)

/** The essential budget keys used by the planner and setup wizard. */
export type EssentialKey = 'food' | 'transport' | 'data' | 'school' | 'personal'

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
  essentials: Record<EssentialKey, number>
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
  /** The user's category set (built-ins plus any custom ones). */
  categories: CategoryMeta[]
}
