import type {
  IncentiveProfile,
  SaverLevelInfo,
  SaverTier,
  SavingsBadge,
  SavingsChallenge,
  SavingsEntry,
  SavingsGoal,
} from './types'

export const SAVINGS_CHALLENGES: SavingsChallenge[] = [
  {
    id: 'habit-7-day',
    title: 'The 7-Day Consistency Habit',
    description: 'Save any amount for 7 consecutive days to build a rock-solid habit.',
    targetAmount: 3500,
    daysDuration: 7,
    xpReward: 300,
    category: 'habit',
    icon: 'flame',
    tag: 'Popular',
  },
  {
    id: 'weekend-defense',
    title: 'Weekend Defense Sprint',
    description: 'Keep flexible spending low this weekend and stash ₦2,500 safely into savings.',
    targetAmount: 2500,
    daysDuration: 3,
    xpReward: 200,
    category: 'sprint',
    icon: 'shield',
    tag: 'Quick Win',
  },
  {
    id: 'skip-a-snack',
    title: 'Skip-a-Snack Micro Challenge',
    description: 'Make 5 micro-deposits of ₦500 or more instead of impulsive treats.',
    targetAmount: 2500,
    daysDuration: 5,
    xpReward: 250,
    category: 'lifestyle',
    icon: 'utensils',
    tag: 'Micro-saver',
  },
  {
    id: 'emergency-cushion-10k',
    title: '₦10,000 Emergency Cushion Sprint',
    description: 'Build your first ₦10,000 safety net so unexpected school/life expenses never stress you.',
    targetAmount: 10000,
    daysDuration: 14,
    xpReward: 450,
    category: 'budget',
    icon: 'piggy-bank',
    tag: 'Essential',
  },
  {
    id: 'semester-hero-25k',
    title: 'Semester Wealth Builder (₦25k)',
    description: 'Reach ₦25,000 total savings to unlock top-tier financial peace of mind.',
    targetAmount: 25000,
    daysDuration: 30,
    xpReward: 700,
    category: 'sprint',
    icon: 'trophy',
    tag: 'Mastery',
  },
]

export const SAVINGS_BADGES: SavingsBadge[] = [
  {
    id: 'first-seed',
    name: 'Seed Sower',
    description: 'Added money to savings for the very first time.',
    icon: 'sprout',
    tier: 'bronze',
    xp: 50,
    criteria: 'Make 1 savings deposit',
  },
  {
    id: 'streak-starter',
    name: 'Streak Starter',
    description: 'Maintained a 3-day savings or budget streak.',
    icon: 'flame',
    tier: 'bronze',
    xp: 100,
    criteria: '3-day streak',
  },
  {
    id: 'rollover-rookie',
    name: 'Surplus Sweeper',
    description: 'Swept unspent daily allowance into savings for the first time.',
    icon: 'sparkles',
    tier: 'bronze',
    xp: 75,
    criteria: '1 daily budget rollover',
  },
  {
    id: 'streak-champion',
    name: 'Unstoppable Saver',
    description: 'Maintained a 7-day savings streak without missing a beat.',
    icon: 'zap',
    tier: 'silver',
    xp: 250,
    criteria: '7-day streak',
  },
  {
    id: 'rollover-master',
    name: 'Rollover Master',
    description: 'Swept daily budget surplus into savings 5 times.',
    icon: 'repeat',
    tier: 'silver',
    xp: 200,
    criteria: '5 daily rollovers',
  },
  {
    id: 'challenge-ace',
    name: 'Challenge Conqueror',
    description: 'Successfully completed a savings challenge.',
    icon: 'award',
    tier: 'silver',
    xp: 200,
    criteria: 'Complete 1 challenge',
  },
  {
    id: 'halfway-hero',
    name: 'Halfway Hero',
    description: 'Reached 50% of your active savings target.',
    icon: 'target',
    tier: 'silver',
    xp: 250,
    criteria: 'Reach 50% of savings goal',
  },
  {
    id: 'goal-crusher',
    name: 'Goal Crusher',
    description: 'Fully achieved 100% of a savings goal.',
    icon: 'trophy',
    tier: 'gold',
    xp: 500,
    criteria: 'Complete 100% of savings goal',
  },
  {
    id: 'wealth-builder',
    name: 'Diamond Vault Keeper',
    description: 'Saved a cumulative total of ₦50,000+ across all pots.',
    icon: 'crown',
    tier: 'diamond',
    xp: 1000,
    criteria: 'Total saved ≥ ₦50,000',
  },
]

export const LEVEL_TIERS: { level: number; title: SaverTier; minXp: number; maxXp: number }[] = [
  { level: 1, title: 'Bronze', minXp: 0, maxXp: 250 },
  { level: 2, title: 'Silver', minXp: 250, maxXp: 750 },
  { level: 3, title: 'Gold', minXp: 750, maxXp: 1800 },
  { level: 4, title: 'Platinum', minXp: 1800, maxXp: 4000 },
  { level: 5, title: 'Diamond', minXp: 4000, maxXp: 10000 },
]

export function calculateLevel(xp: number): SaverLevelInfo {
  const currentXp = Math.max(0, xp)
  for (let i = 0; i < LEVEL_TIERS.length; i++) {
    const tier = LEVEL_TIERS[i]
    if (currentXp < tier.maxXp || i === LEVEL_TIERS.length - 1) {
      const range = tier.maxXp - tier.minXp
      const progress = Math.min(Math.max((currentXp - tier.minXp) / range, 0), 1)
      const nextTier = LEVEL_TIERS[i + 1]?.title
      return {
        level: tier.level,
        title: tier.title,
        currentXp,
        minXp: tier.minXp,
        maxXp: tier.maxXp,
        progressPct: Math.round(progress * 100),
        nextTitle: nextTier,
      }
    }
  }
  return {
    level: 5,
    title: 'Diamond',
    currentXp,
    minXp: 4000,
    maxXp: 10000,
    progressPct: 100,
  }
}

export const DEFAULT_INCENTIVES: IncentiveProfile = {
  xp: 120,
  savingsStreak: 1,
  lastSavedDate: null,
  totalSavedAllTime: 0,
  rolloverCount: 0,
  history: [],
  activeChallenges: [],
  completedChallengeIds: [],
  unlockedBadgeIds: [],
}

/**
 * Calculates XP earned from a savings action.
 * Standard formula: 1 XP per ₦100 saved, plus bonus for rollover sweeps or boosts.
 */
export function calculateXpForAction(amount: number, type: SavingsEntry['type']): number {
  const base = Math.max(1, Math.floor(amount / 100))
  if (type === 'rollover') return base + 50 // bonus for sweeping unspent budget
  if (type === 'challenge') return base + 30 // bonus for challenge contribution
  if (type === 'boost') return base + 15 // bonus for micro-saves
  return base
}

/**
 * Evaluates which badges a user has unlocked based on current state.
 */
export function evaluateBadges(
  incentives: IncentiveProfile,
  goal: SavingsGoal | null,
): string[] {
  const unlocked = new Set<string>(incentives.unlockedBadgeIds)

  // 1. First seed
  if (incentives.history.length > 0 || incentives.totalSavedAllTime > 0) {
    unlocked.add('first-seed')
  }

  // 2. Streaks
  if (incentives.savingsStreak >= 3) {
    unlocked.add('streak-starter')
  }
  if (incentives.savingsStreak >= 7) {
    unlocked.add('streak-champion')
  }

  // 3. Rollovers
  if (incentives.rolloverCount >= 1) {
    unlocked.add('rollover-rookie')
  }
  if (incentives.rolloverCount >= 5) {
    unlocked.add('rollover-master')
  }

  // 4. Challenges
  if (incentives.completedChallengeIds.length >= 1) {
    unlocked.add('challenge-ace')
  }

  // 5. Goal progress
  if (goal && goal.target > 0) {
    if (goal.saved >= goal.target * 0.5) {
      unlocked.add('halfway-hero')
    }
    if (goal.saved >= goal.target) {
      unlocked.add('goal-crusher')
    }
  }

  // 6. Wealth builder
  if (incentives.totalSavedAllTime >= 50000 || (goal && goal.saved >= 50000)) {
    unlocked.add('wealth-builder')
  }

  return Array.from(unlocked)
}

/**
 * Computes simulated high-yield interest (e.g. 14% p.a.)
 */
export interface YieldProjection {
  annualRatePct: number
  monthlyEarnings: number
  annualEarnings: number
  impactNarrative: string
}

export function calculateYield(amount: number, annualRatePct = 14): YieldProjection {
  const safeAmount = Math.max(0, amount)
  const annualEarnings = Math.round(safeAmount * (annualRatePct / 100))
  const monthlyEarnings = Math.round(annualEarnings / 12)

  let impactNarrative = 'Every Naira saved here outpaces inflation and builds true freedom.'
  if (safeAmount >= 40000) {
    impactNarrative = `Your passive growth could cover a full semester's mobile data + campus lunches!`
  } else if (safeAmount >= 20000) {
    impactNarrative = `That's enough extra cash to cover 2-3 months of high-speed data completely free.`
  } else if (safeAmount >= 5000) {
    impactNarrative = `Free bonus cash that grows automatically while you study.`
  }

  return {
    annualRatePct,
    monthlyEarnings,
    annualEarnings,
    impactNarrative,
  }
}

/**
 * Checks consecutive days of savings activity.
 */
export function calculateSavingsStreak(history: SavingsEntry[], now = new Date()): number {
  if (history.length === 0) return 0

  const dayKeys = new Set(
    history.map((h) => {
      const d = new Date(h.date)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }),
  )

  let streak = 0
  const cursor = new Date(now)
  cursor.setHours(0, 0, 0, 0)

  // Allow count if nothing saved yet today
  if (!dayKeys.has(cursor.getTime())) {
    cursor.setDate(cursor.getDate() - 1)
  }

  while (dayKeys.has(cursor.getTime())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}
