'use client'

import { useState } from 'react'
import {
  Award,
  Check,
  CheckCircle2,
  Crown,
  Flame,
  LineChart,
  Plus,
  RotateCcw,
  Shield,
  Sprout,
  Target,
  TrendingUp,
  Trophy,
  Utensils,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Confetti } from '@/components/ui/confetti'
import { useStore } from '@/lib/store'
import { computeDailyStatus, formatNaira, isSameDay } from '@/lib/finance'
import {
  SAVINGS_BADGES,
  SAVINGS_CHALLENGES,
  calculateLevel,
  calculateYield,
} from '@/lib/incentives'
import { cn } from '@/lib/utils'

export function Savings() {
  const {
    setup,
    expenses,
    goal,
    setGoal,
    addToSavings,
    sweepDailyRollover,
    incentives,
    startChallenge,
    claimChallengeReward,
  } = useStore()

  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [topUp, setTopUp] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const [recentCelebration, setRecentCelebration] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'challenges' | 'vault' | 'trophies'>('overview')

  const dailyStatus = setup ? computeDailyStatus(setup, expenses) : null
  const surplusToday = dailyStatus ? Math.max(0, Math.floor(dailyStatus.remainingToday)) : 0
  const levelInfo = calculateLevel(incentives.xp)
  const yieldInfo = calculateYield(goal?.saved ?? setup?.savingsTarget ?? 0)

  // Last 7 days consistency
  const now = new Date()
  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - i))
    const savedOnDay = incentives.history.some((h) => isSameDay(new Date(h.date), d))
    const loggedSpend = expenses.some((e) => isSameDay(new Date(e.date), d))
    return {
      label: d.toLocaleDateString('en-NG', { weekday: 'narrow' }),
      active: savedOnDay || loggedSpend,
      saved: savedOnDay,
    }
  })

  function triggerReward(message: string) {
    setRecentCelebration(message)
    setShowConfetti(true)
    setTimeout(() => {
      setRecentCelebration(null)
    }, 4000)
  }

  function handleQuickBoost(amount: number, label: string) {
    addToSavings(amount, `Quick Boost: ${label}`, 'boost')
    triggerReward(`+${formatNaira(amount)} saved! (+${Math.floor(amount / 100) + 15} XP)`)
  }

  function handleSweepRollover() {
    const swept = sweepDailyRollover()
    if (swept > 0) {
      triggerReward(`Swept ${formatNaira(swept)} into savings! (+${Math.floor(swept / 100) + 50} XP)`)
    }
  }

  function handleCustomDeposit(e: React.FormEvent) {
    e.preventDefault()
    const v = Number(topUp) || 0
    if (v > 0) {
      addToSavings(v, 'Custom deposit', 'manual')
      setTopUp('')
      triggerReward(`+${formatNaira(v)} added to savings!`)
    }
  }

  function createGoal(e: React.FormEvent) {
    e.preventDefault()
    const t = Number(target) || 0
    if (!name.trim() || t <= 0) return
    setGoal({ name: name.trim(), target: t, saved: 0 })
    setName('')
    setTarget('')
    triggerReward('🎯 New savings goal locked in!')
  }

  const pct = goal && goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0

  return (
    <div className="flex flex-col gap-5">
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Celebration Toast Banner */}
      {recentCelebration && (
        <div className="animate-in fade-in slide-in-from-top-3 flex items-center justify-between rounded-xl bg-safe px-4 py-3 text-safe-foreground shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 shrink-0" />
            <p className="text-sm font-semibold">{recentCelebration}</p>
          </div>
          <span className="text-xs font-medium opacity-90">Level {levelInfo.level} {levelInfo.title}</span>
        </div>
      )}

      {/* Saver Level & Streak Status Hero */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/30 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary font-mono text-2xl font-bold text-primary-foreground shadow-sm">
              {levelInfo.level === 5 ? <Crown className="size-7" /> : <Trophy className="size-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                  Level {levelInfo.level}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {levelInfo.title} Saver
                </span>
              </div>
              <h2 className="mt-0.5 text-xl font-bold tracking-tight">
                {levelInfo.currentXp.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">XP</span>
              </h2>
            </div>
          </div>

          {/* Streak pill */}
          <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/80 px-4 py-2.5 backdrop-blur">
            <div className="flex size-9 items-center justify-center rounded-xl bg-caution/15 text-caution">
              <Flame className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Saver Streak</p>
              <p className="font-mono text-base font-bold">
                {incentives.savingsStreak} <span className="text-xs font-normal text-muted-foreground">days</span>
              </p>
            </div>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>{levelInfo.title} Tier</span>
            <span>
              {levelInfo.nextTitle
                ? `${levelInfo.maxXp - levelInfo.currentXp} XP to ${levelInfo.nextTitle}`
                : 'Maximum Tier Reached! 👑'}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${levelInfo.progressPct}%` }}
            />
          </div>
        </div>
      </Card>

      {/* 1-Tap Daily Budget Rollover Sweeper */}
      {surplusToday > 0 && (
        <Card className="border-safe/30 bg-safe/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-safe text-safe-foreground">
                <Zap className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-safe-foreground">Daily Surplus Sweeper</h3>
                  <span className="rounded-full bg-safe/20 px-2 py-0.5 text-[0.65rem] font-bold text-safe-foreground">
                    +50 XP BONUS
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
                  You have <span className="font-mono font-semibold text-foreground">{formatNaira(surplusToday)}</span> left in today&apos;s safe spending allowance. Sweep it into your savings pot to protect your streak!
                </p>
              </div>
            </div>

            <Button
              onClick={handleSweepRollover}
              size="sm"
              className="h-10 shrink-0 bg-safe font-semibold text-safe-foreground hover:bg-safe/90"
            >
              Sweep {formatNaira(surplusToday)} to Savings
            </Button>
          </div>
        </Card>
      )}

      {/* Tab Navigation for Savings Features */}
      <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-muted p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all',
            activeTab === 'overview'
              ? 'bg-background font-semibold text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Target className="size-3.5" /> Goal
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('challenges')}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all',
            activeTab === 'challenges'
              ? 'bg-background font-semibold text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Zap className="size-3.5" /> Challenges
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('vault')}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all',
            activeTab === 'vault'
              ? 'bg-background font-semibold text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <LineChart className="size-3.5" /> Yield
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('trophies')}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all',
            activeTab === 'trophies'
              ? 'bg-background font-semibold text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Award className="size-3.5" /> Badges
        </button>
      </div>

      {/* TAB 1: GOAL & MICRO-SAVINGS BOOSTS */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-5">
          {/* Active Goal Card */}
          {goal ? (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Target className="size-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Active Savings Goal</span>
                </div>
                <button
                  onClick={() => setGoal(null)}
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Change goal
                </button>
              </div>

              <h3 className="mt-1 text-xl font-bold text-balance">{goal.name}</h3>

              <div className="mt-4 flex items-baseline justify-between">
                <p className="font-mono text-3xl font-bold text-foreground">
                  {formatNaira(goal.saved)}
                  <span className="ml-1 text-base font-normal text-muted-foreground">
                    / {formatNaira(goal.target)}
                  </span>
                </p>
                <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono text-xs font-semibold text-accent-foreground">
                  {Math.round(pct)}%
                </span>
              </div>

              <div className="mt-3">
                <Progress value={pct} tone="safe" />
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  {pct >= 100
                    ? '🎉 Goal 100% achieved! You unlocked the Goal Crusher trophy!'
                    : `${formatNaira(Math.max(0, goal.target - goal.saved))} remaining to complete this goal.`}
                </p>
              </div>

              {/* 1-Tap Micro Boost Chips */}
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Instant Micro-Savings Shortcuts
                  </p>
                  <span className="text-[0.65rem] text-primary font-medium">+15 Bonus XP</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => handleQuickBoost(200, 'Skipped soda / treat')}
                    className="flex flex-col items-start rounded-xl border border-border/80 bg-muted/40 p-2.5 text-left transition-colors hover:border-primary hover:bg-muted"
                  >
                    <span className="font-mono text-xs font-bold text-primary">+₦200</span>
                    <span className="mt-0.5 text-[0.7rem] text-muted-foreground">Skipped treat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickBoost(500, 'Cooked at home')}
                    className="flex flex-col items-start rounded-xl border border-border/80 bg-muted/40 p-2.5 text-left transition-colors hover:border-primary hover:bg-muted"
                  >
                    <span className="font-mono text-xs font-bold text-primary">+₦500</span>
                    <span className="mt-0.5 text-[0.7rem] text-muted-foreground">Cooked noodles</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickBoost(1000, 'Walked instead of ride')}
                    className="flex flex-col items-start rounded-xl border border-border/80 bg-muted/40 p-2.5 text-left transition-colors hover:border-primary hover:bg-muted"
                  >
                    <span className="font-mono text-xs font-bold text-primary">+₦1,000</span>
                    <span className="mt-0.5 text-[0.7rem] text-muted-foreground">Campus walk</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickBoost(2000, 'Weekend discipline')}
                    className="flex flex-col items-start rounded-xl border border-border/80 bg-muted/40 p-2.5 text-left transition-colors hover:border-primary hover:bg-muted"
                  >
                    <span className="font-mono text-xs font-bold text-primary">+₦2,000</span>
                    <span className="mt-0.5 text-[0.7rem] text-muted-foreground">Weekend win</span>
                  </button>
                </div>
              </div>

              {/* Custom Top-up Form */}
              <form onSubmit={handleCustomDeposit} className="mt-5 flex gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-muted-foreground">
                    ₦
                  </span>
                  <Input
                    inputMode="numeric"
                    placeholder="Custom amount"
                    aria-label="Amount to add to savings"
                    value={topUp}
                    onChange={(e) => setTopUp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="pl-8 font-mono"
                  />
                </div>
                <Button type="submit" size="lg" className="h-11 shrink-0" disabled={(Number(topUp) || 0) <= 0}>
                  <Plus className="size-4" /> Save
                </Button>
              </form>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Target className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold leading-tight">Create a Savings Target</h3>
                  <p className="text-xs text-muted-foreground">Give your extra money a tangible goal to work towards</p>
                </div>
              </div>
              <form onSubmit={createGoal} className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="goal-name">What are you saving for?</Label>
                  <Input
                    id="goal-name"
                    placeholder="e.g. Textbooks for next semester, New laptop fund"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="goal-target">Target amount</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-muted-foreground">
                      ₦
                    </span>
                    <Input
                      id="goal-target"
                      inputMode="numeric"
                      placeholder="20,000"
                      value={target}
                      onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ''))}
                      className="pl-8 font-mono"
                    />
                  </div>
                </div>
                <Button type="submit" size="lg" className="h-11">
                  Start goal
                </Button>
              </form>
            </Card>
          )}

          {/* 7-Day Consistency Habit */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Last 7 Days Activity</h3>
              <span className="text-xs text-muted-foreground">Streak: {incentives.savingsStreak} days</span>
            </div>
            <div className="mt-3 flex justify-between gap-2">
              {week.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      'flex aspect-square w-full items-center justify-center rounded-xl text-xs font-bold transition-transform hover:scale-105',
                      d.saved
                        ? 'bg-primary text-primary-foreground'
                        : d.active
                          ? 'bg-safe text-safe-foreground'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {d.saved ? '💰' : d.active ? '✓' : '·'}
                  </div>
                  <span className="text-[0.65rem] font-medium text-muted-foreground">{d.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground text-pretty">
              Saving money or logging your daily spend keeps your habit streak going strong.
            </p>
          </Card>
        </div>
      )}

      {/* TAB 2: SAVINGS CHALLENGES & MISSIONS */}
      {activeTab === 'challenges' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Savings Challenges</h3>
              <p className="text-xs text-muted-foreground">Complete sprint missions to earn huge XP bonuses & badges</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-semibold text-primary">
              {incentives.completedChallengeIds.length} Completed
            </span>
          </div>

          <div className="grid gap-3">
            {SAVINGS_CHALLENGES.map((ch) => {
              const activeProg = incentives.activeChallenges.find((c) => c.challengeId === ch.id)
              const isCompleted = incentives.completedChallengeIds.includes(ch.id)
              const isClaimable = activeProg?.status === 'completed' && !isCompleted
              const isActive = activeProg && activeProg.status === 'active'
              const currentAmt = activeProg?.currentAmount ?? 0
              const progPct = Math.min((currentAmt / ch.targetAmount) * 100, 100)

              return (
                <Card key={ch.id} className={cn('p-5 transition-all', isCompleted && 'opacity-70 bg-muted/30')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {ch.category === 'habit' && <Flame className="size-5 text-caution" />}
                        {ch.category === 'sprint' && <Zap className="size-5 text-primary" />}
                        {ch.category === 'budget' && <Shield className="size-5 text-safe" />}
                        {ch.category === 'lifestyle' && <Utensils className="size-5 text-primary" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold leading-tight">{ch.title}</h4>
                          <span className="rounded bg-accent px-1.5 py-0.5 text-[0.65rem] font-semibold text-accent-foreground">
                            {ch.tag}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground text-pretty">{ch.description}</p>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-lg bg-primary/15 px-2.5 py-1 font-mono text-xs font-bold text-primary">
                      +{ch.xpReward} XP
                    </span>
                  </div>

                  {/* Active / Progress area */}
                  {isActive && (
                    <div className="mt-4 rounded-xl bg-muted/60 p-3">
                      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                        <span>Progress: {formatNaira(currentAmt)}</span>
                        <span>{formatNaira(ch.targetAmount)} ({Math.round(progPct)}%)</span>
                      </div>
                      <Progress value={progPct} tone="safe" />
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[0.7rem] text-muted-foreground">
                          {ch.daysDuration} days timeline
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs"
                          onClick={() => handleQuickBoost(500, `Challenge: ${ch.title}`)}
                        >
                          +₦500 to Challenge
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-mono text-xs font-medium text-muted-foreground">
                      Target: {formatNaira(ch.targetAmount)}
                    </span>

                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-safe">
                        <Check className="size-4" /> Completed
                      </span>
                    ) : isClaimable ? (
                      <Button
                        size="sm"
                        className="bg-safe font-semibold text-safe-foreground hover:bg-safe/90"
                        onClick={() => {
                          claimChallengeReward(ch.id)
                          triggerReward(`🎉 Claimed +${ch.xpReward} XP for ${ch.title}!`)
                        }}
                      >
                        Claim +{ch.xpReward} XP
                      </Button>
                    ) : isActive ? (
                      <span className="text-xs font-medium text-primary">In Progress</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          startChallenge(ch.id)
                          triggerReward(`🎯 Joined challenge: ${ch.title}!`)
                        }}
                      >
                        Join Challenge
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 3: HIGH-YIELD VAULT & INTEREST GROWTH SIMULATOR */}
      {activeTab === 'vault' && (
        <div className="flex flex-col gap-4">
          <Card className="border-safe/20 bg-gradient-to-br from-safe/10 via-background to-primary/5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-safe text-safe-foreground shadow-sm">
                <LineChart className="size-6" />
              </div>
              <div>
                <span className="rounded-md bg-safe/20 px-2 py-0.5 font-mono text-[0.65rem] font-bold text-safe-foreground">
                  14% P.A. YIELD SIMULATOR
                </span>
                <h3 className="mt-0.5 text-lg font-bold">Kudi High-Yield Growth</h3>
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground text-pretty">
              Putting money aside isn&apos;t just about holding cash — high-yield savings pots in Nigeria earn around 14% annual returns. Here is what your current savings can generate:
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
                <p className="text-xs font-medium text-muted-foreground">Monthly Interest</p>
                <p className="mt-1 font-mono text-2xl font-bold text-safe">
                  +{formatNaira(yieldInfo.monthlyEarnings)}
                </p>
                <p className="text-[0.7rem] text-muted-foreground">passive earnings / month</p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
                <p className="text-xs font-medium text-muted-foreground">Annual Interest</p>
                <p className="mt-1 font-mono text-2xl font-bold text-safe">
                  +{formatNaira(yieldInfo.annualEarnings)}
                </p>
                <p className="text-[0.7rem] text-muted-foreground">projected return / year</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-accent/60 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-foreground">
                <TrendingUp className="size-3.5" /> Tangible Student Impact
              </p>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                {yieldInfo.impactNarrative}
              </p>
            </div>
          </Card>

          {/* Quick deposit shortcut directly into high-yield pot */}
          <Card className="p-5">
            <h4 className="font-semibold text-sm">Boost Your High-Yield Balance</h4>
            <p className="text-xs text-muted-foreground">Every ₦1,000 you add compounds your passive growth</p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => handleQuickBoost(1000, 'High-yield boost')}
              >
                +₦1,000
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => handleQuickBoost(2500, 'High-yield boost')}
              >
                +₦2,500
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => handleQuickBoost(5000, 'High-yield boost')}
              >
                +₦5,000
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: TROPHY CABINET & BADGES */}
      {activeTab === 'trophies' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Trophy Cabinet</h3>
              <p className="text-xs text-muted-foreground">Badges unlocked through disciplined savings habits</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-semibold text-primary">
              {incentives.unlockedBadgeIds.length} / {SAVINGS_BADGES.length} Badges
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SAVINGS_BADGES.map((b) => {
              const unlocked = incentives.unlockedBadgeIds.includes(b.id)

              return (
                <Card
                  key={b.id}
                  className={cn(
                    'p-4 transition-all',
                    unlocked
                      ? 'border-primary/40 bg-gradient-to-br from-primary/5 to-background'
                      : 'opacity-55 grayscale hover:grayscale-0',
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={cn(
                        'flex size-12 shrink-0 items-center justify-center rounded-2xl font-mono text-xl shadow-sm',
                        unlocked
                          ? b.tier === 'diamond'
                            ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white'
                            : b.tier === 'gold'
                              ? 'bg-amber-500 text-white'
                              : b.tier === 'silver'
                                ? 'bg-slate-400 text-white'
                                : 'bg-amber-700 text-white'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {b.icon === 'sprout' && <Sprout className="size-6" />}
                      {b.icon === 'flame' && <Flame className="size-6" />}
                      {b.icon === 'sparkles' && <CheckCircle2 className="size-6" />}
                      {b.icon === 'zap' && <Zap className="size-6" />}
                      {b.icon === 'repeat' && <RotateCcw className="size-6" />}
                      {b.icon === 'award' && <Award className="size-6" />}
                      {b.icon === 'target' && <Target className="size-6" />}
                      {b.icon === 'trophy' && <Trophy className="size-6" />}
                      {b.icon === 'crown' && <Crown className="size-6" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="truncate font-semibold leading-tight">{b.name}</h4>
                        <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[0.65rem] font-bold text-primary">
                          +{b.xp} XP
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground text-pretty">{b.description}</p>
                      <div className="mt-2 flex items-center justify-between text-[0.7rem]">
                        <span className="font-medium text-muted-foreground">
                          {unlocked ? '✓ Unlocked' : b.criteria}
                        </span>
                        <span className="capitalize font-semibold text-muted-foreground">{b.tier}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Savings Ledger / Activity History */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Savings Activity History</h3>
          <span className="font-mono text-xs text-muted-foreground">
            {incentives.history.length} transactions
          </span>
        </div>

        {incentives.history.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No savings transactions yet. Save your first amount above to earn XP and unlock the Seed Sower badge!
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {incentives.history.slice(0, 5).map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'flex size-7 items-center justify-center rounded-lg text-xs font-bold',
                      item.type === 'rollover'
                        ? 'bg-safe/15 text-safe'
                        : item.type === 'challenge'
                          ? 'bg-primary/15 text-primary'
                          : item.type === 'boost'
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {item.type === 'rollover' ? '⚡' : item.type === 'challenge' ? '🏆' : '₦'}
                  </span>
                  <div>
                    <p className="text-xs font-semibold">{item.note}</p>
                    <p className="text-[0.65rem] text-muted-foreground">
                      {new Date(item.date).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-mono text-xs font-bold text-safe">+{formatNaira(item.amount)}</p>
                  <span className="font-mono text-[0.65rem] text-muted-foreground">+{item.xpEarned} XP</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
