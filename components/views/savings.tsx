'use client'

import { useState } from 'react'
import { Flame, Plus, Target, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useStore } from '@/lib/store'
import { computeStreaks, formatNaira, isSameDay } from '@/lib/finance'

export function Savings() {
  const { goal, setGoal, addToSavings, expenses } = useStore()
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [topUp, setTopUp] = useState('')

  const streaks = computeStreaks(expenses)

  // Last 7 days consistency
  const now = new Date()
  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - i))
    const logged = expenses.some((e) => isSameDay(new Date(e.date), d))
    return {
      label: d.toLocaleDateString('en-NG', { weekday: 'narrow' }),
      logged,
    }
  })

  function createGoal(e: React.FormEvent) {
    e.preventDefault()
    const t = Number(target) || 0
    if (!name.trim() || t <= 0) return
    setGoal({ name: name.trim(), target: t, saved: 0 })
    setName('')
    setTarget('')
  }

  const pct = goal && goal.target > 0 ? (goal.saved / goal.target) * 100 : 0

  return (
    <div className="flex flex-col gap-5">
      {/* Streaks */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Flame className="size-4 text-caution" />
            <span className="text-xs font-medium">Tracking streak</span>
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold">
            {streaks.trackingStreak}
            <span className="ml-1 text-base font-normal text-muted-foreground">days</span>
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="size-4 text-primary" />
            <span className="text-xs font-medium">Days logged</span>
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold">
            {streaks.daysWithinBudget}
            <span className="ml-1 text-base font-normal text-muted-foreground">total</span>
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Last 7 days</h3>
        <div className="flex justify-between gap-2">
          {week.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={
                  'flex aspect-square w-full items-center justify-center rounded-lg text-xs font-semibold ' +
                  (d.logged
                    ? 'bg-safe text-safe-foreground'
                    : 'bg-muted text-muted-foreground')
                }
              >
                {d.logged ? '✓' : ''}
              </div>
              <span className="text-xs text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground text-pretty">
          Logging even one spend a day keeps your streak alive. Small habit, big picture.
        </p>
      </Card>

      {/* Savings goal */}
      {goal ? (
        <Card className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="size-4 text-primary" />
            <span className="text-xs font-medium">Savings goal</span>
          </div>
          <p className="mt-1 text-lg font-semibold">{goal.name}</p>
          <p className="mt-3 font-mono text-3xl font-semibold">
            {formatNaira(goal.saved)}
            <span className="text-base font-normal text-muted-foreground">
              {' '}
              / {formatNaira(goal.target)}
            </span>
          </p>
          <div className="mt-3">
            <Progress value={pct} tone="safe" />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {pct >= 100
                ? 'Goal reached — nice work!'
                : `${Math.round(pct)}% there · ${formatNaira(goal.target - goal.saved)} to go`}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              const v = Number(topUp) || 0
              if (v > 0) {
                addToSavings(v)
                setTopUp('')
              }
            }}
            className="mt-5 flex gap-2"
          >
            <div className="relative flex-1">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-muted-foreground">
                ₦
              </span>
              <Input
                inputMode="numeric"
                placeholder="Add to savings"
                aria-label="Amount to add to savings"
                value={topUp}
                onChange={(e) => setTopUp(e.target.value.replace(/[^0-9]/g, ''))}
                className="pl-8 font-mono"
              />
            </div>
            <Button type="submit" size="lg" className="h-11" disabled={(Number(topUp) || 0) <= 0}>
              <Plus className="size-4" /> Add
            </Button>
          </form>

          <button
            onClick={() => setGoal(null)}
            className="mt-3 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Set a different goal
          </button>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Target className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold leading-tight">Set a savings goal</h3>
              <p className="text-xs text-muted-foreground">Give your money a job worth saving for</p>
            </div>
          </div>
          <form onSubmit={createGoal} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-name">What are you saving for?</Label>
              <Input
                id="goal-name"
                placeholder="e.g. Textbooks for next semester"
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
              Create goal
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}
