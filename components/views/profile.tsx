'use client'

import { useState } from 'react'
import {
  Bell,
  BellOff,
  Check,
  LogOut,
  Mail,
  Pencil,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import { formatNaira, totalSpent } from '@/lib/finance'
import { calculateLevel } from '@/lib/incentives'
import {
  getPermission,
  requestPermission,
  sendNotification,
  type NotifyPermission,
} from '@/lib/notifications'
import { cn } from '@/lib/utils'

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'U'
  )
}

export function Profile() {
  const { user, logOut, updateProfile } = useAuth()
  const { expenses, resetAll, incentives } = useStore()

  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(user?.name ?? '')
  const [perm, setPerm] = useState<NotifyPermission>(() => getPermission())

  if (!user) return null

  const levelInfo = calculateLevel(incentives.xp)
  const joined = new Date(user.createdAt).toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  })


  async function toggleNotifications() {
    // Turning off is just a preference change.
    if (user!.notifyOptIn) {
      updateProfile({ notifyOptIn: false })
      return
    }
    // Turning on: make sure the browser has granted permission first.
    let current = getPermission()
    if (current === 'default') current = await requestPermission()
    setPerm(current)
    if (current === 'granted') {
      updateProfile({ notifyOptIn: true })
      sendNotification(
        'Notifications on',
        "Nice! We'll gently nudge you when you're close to your daily limit.",
        'welcome',
      )
    } else {
      // Permission blocked — keep the preference off so the UI stays honest.
      updateProfile({ notifyOptIn: false })
    }
  }

  function saveName() {
    const clean = nameDraft.trim()
    if (clean) updateProfile({ name: clean })
    setEditing(false)
  }

  const notifOn = user.notifyOptIn && perm === 'granted'
  const blocked = perm === 'denied'
  const unsupported = perm === 'unsupported'

  return (
    <div className="flex flex-col gap-5">
      {/* Identity card */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary font-mono text-xl font-semibold text-primary-foreground">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  aria-label="Your name"
                  className="h-9"
                  autoFocus
                />
                <Button size="icon" className="size-9 shrink-0" onClick={saveName} aria-label="Save name">
                  <Check className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="size-9 shrink-0"
                  onClick={() => {
                    setNameDraft(user.name)
                    setEditing(false)
                  }}
                  aria-label="Cancel"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="truncate text-xl font-semibold">{user.name}</h2>
                <button
                  onClick={() => {
                    setNameDraft(user.name)
                    setEditing(true)
                  }}
                  aria-label="Edit name"
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Pencil className="size-4" />
                </button>
              </div>
            )}
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{user.email}</span>
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">Member since {joined}</p>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Saver Tier" value={`L${levelInfo.level} ${levelInfo.title}`} sub={`${incentives.xp} XP`} />
        <StatCard label="Trophies" value={String(incentives.unlockedBadgeIds.length)} sub="unlocked" />
        <StatCard label="Streak" value={String(incentives.savingsStreak)} sub="days" />
        <StatCard label="Tracked" value={formatNaira(totalSpent(expenses), { compact: true })} sub="all time" />
      </div>

      {/* Notifications */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl',
                notifOn ? 'bg-safe/15 text-safe' : 'bg-muted text-muted-foreground',
              )}
            >
              {notifOn ? <Bell className="size-5" /> : <BellOff className="size-5" />}
            </span>
            <div>
              <h3 className="font-semibold leading-tight">Phone notifications</h3>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                Get a gentle nudge on your device when you&apos;re close to your daily limit or drifting
                off budget. It&apos;s entirely your choice — turn it off any time.
              </p>
            </div>
          </div>

          <Toggle
            checked={notifOn}
            onChange={toggleNotifications}
            disabled={blocked || unsupported}
            label="Toggle notifications"
          />
        </div>

        {blocked && (
          <p className="mt-3 rounded-lg bg-caution/15 px-3 py-2 text-xs font-medium text-caution text-pretty">
            Notifications are blocked in your browser settings. Allow them for this site, then try again.
          </p>
        )}
        {unsupported && (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground text-pretty">
            Your browser doesn&apos;t support notifications. Try adding KUDI to your home screen.
          </p>
        )}
        {notifOn && (
          <button
            onClick={() =>
              sendNotification('Test notification', 'This is how your reminders will look.', 'test')
            }
            className="mt-3 text-xs font-medium text-primary underline underline-offset-4 hover:opacity-80"
          >
            Send a test notification
          </button>
        )}
      </Card>

      {/* Privacy note */}
      <Card className="flex items-start gap-3 p-5">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-safe" />
        <p className="text-sm text-muted-foreground text-pretty">
          Your account and spending data stay private on this device. Only you can see them.
        </p>
      </Card>

      {/* Danger / account actions */}
      <div className="flex flex-col gap-3">
        <Button
          variant="secondary"
          size="lg"
          className="h-11 justify-start"
          onClick={() => {
            if (confirm('Reset all budget and expense data? Your account stays, but spending history is cleared.'))
              resetAll()
          }}
        >
          <RotateCcw className="size-4" /> Reset budget data
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-11 justify-start border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
          onClick={logOut}
        >
          <LogOut className="size-4" /> Log out
        </Button>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </Card>
  )
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-muted',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'inline-block size-5 rounded-full bg-background shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}
