'use client'

import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  Building2,
  Check,
  Crown,
  Landmark,
  Link2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Unlink,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import { fetchTransactions, linkAccount, listBanks } from '@/lib/bank-sync'
import type { BankInfo } from '@/lib/types'
import { formatNaira } from '@/lib/finance'
import { cn } from '@/lib/utils'

const PREMIUM_PRICE = 500 // ₦ / month, display only

export function BankSync() {
  const { user, upgradeToPremium } = useAuth()
  if (!user) return null

  return user.premium ? <PremiumSync /> : <Paywall onUpgrade={upgradeToPremium} />
}

/* -------------------------------------------------------------------------- */
/* Free plan: upgrade paywall                                                 */
/* -------------------------------------------------------------------------- */

function Paywall({ onUpgrade }: { onUpgrade: () => void }) {
  const [upgrading, setUpgrading] = useState(false)

  function handleUpgrade() {
    setUpgrading(true)
    // Simulate a payment round-trip before unlocking.
    setTimeout(() => {
      onUpgrade()
      setUpgrading(false)
    }, 1200)
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="overflow-hidden">
        <div className="bg-primary px-6 py-7 text-primary-foreground">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-semibold">
            <Crown className="size-3.5" /> Premium
          </div>
          <h2 className="text-2xl font-semibold text-balance">Connect your bank, skip the typing</h2>
          <p className="mt-1.5 text-sm text-primary-foreground/80 text-pretty">
            Link your bank or fintech account and KUDI imports your spending automatically —
            categorised and ready. Manual logging stays free, forever.
          </p>
        </div>

        <div className="grid gap-px bg-border sm:grid-cols-2">
          <PlanColumn
            title="Basic"
            price="Free"
            highlight={false}
            features={[
              { label: 'Log spending manually', included: true },
              { label: 'Voice & quick add', included: true },
              { label: 'Budgets, insights & leaks', included: true },
              { label: 'Automatic bank import', included: false },
            ]}
          />
          <PlanColumn
            title="Premium"
            price={`${formatNaira(PREMIUM_PRICE)}/mo`}
            highlight
            features={[
              { label: 'Everything in Basic', included: true },
              { label: 'Auto-import from your bank', included: true },
              { label: 'Smart transaction categories', included: true },
              { label: 'One-tap sync any time', included: true },
            ]}
          />
        </div>
      </Card>

      <Card className="flex items-start gap-3 p-5">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-safe" />
        <p className="text-sm text-muted-foreground text-pretty">
          KUDI uses a secure open-banking connection and only ever reads your transactions —
          it can never move money. You can disconnect any time.
        </p>
      </Card>

      <Button size="lg" className="h-12 text-base" onClick={handleUpgrade} disabled={upgrading}>
        {upgrading ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Unlocking…
          </>
        ) : (
          <>
            <Sparkles className="size-4" /> Upgrade to Premium
          </>
        )}
      </Button>
      <p className="-mt-2 text-center text-xs text-muted-foreground">
        Demo upgrade — no real payment is taken.
      </p>
    </div>
  )
}

function PlanColumn({
  title,
  price,
  highlight,
  features,
}: {
  title: string
  price: string
  highlight: boolean
  features: { label: string; included: boolean }[]
}) {
  return (
    <div className={cn('bg-card p-5', highlight && 'bg-primary/5')}>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="font-mono text-sm font-semibold">{price}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {features.map((f) => (
          <li
            key={f.label}
            className={cn(
              'flex items-center gap-2 text-sm',
              f.included ? 'text-foreground' : 'text-muted-foreground/60 line-through',
            )}
          >
            <Check
              className={cn('size-4 shrink-0', f.included ? 'text-safe' : 'text-muted-foreground/40')}
            />
            {f.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Premium plan: connect + sync                                               */
/* -------------------------------------------------------------------------- */

function PremiumSync() {
  const { bank } = useStore()
  return bank ? <ConnectedPanel /> : <ConnectPanel />
}

function ConnectPanel() {
  const { connectBank, importTransactions } = useStore()
  const banks = useMemo(() => listBanks(), [])
  const [selected, setSelected] = useState<BankInfo | null>(null)
  const [accountName, setAccountName] = useState('')
  const [busy, setBusy] = useState(false)
  const [imported, setImported] = useState<number | null>(null)

  async function handleConnect() {
    if (!selected) return
    setBusy(true)
    try {
      const connection = await linkAccount(selected, accountName)
      connectBank(connection)
      // Pull the initial transaction history right away.
      const txns = await fetchTransactions(null)
      const count = importTransactions(txns)
      setImported(count)
    } finally {
      setBusy(false)
    }
  }

  if (imported !== null) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-safe/15 text-safe">
          <BadgeCheck className="size-7" />
        </span>
        <h2 className="text-xl font-semibold">Bank connected</h2>
        <p className="max-w-sm text-sm text-muted-foreground text-pretty">
          We imported <span className="font-semibold text-foreground">{imported}</span>{' '}
          {imported === 1 ? 'transaction' : 'transactions'} from your account. New spending will
          appear here whenever you sync.
        </p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          <Crown className="size-3.5" /> Premium active
        </div>
        <h2 className="mt-2 font-semibold">Choose your bank</h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Pick where your money lives. We&apos;ll securely link it and pull in your recent spending.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {banks.map((b) => {
            const active = selected?.id === b.id
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelected(b)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors',
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted',
                )}
              >
                <span
                  className="flex size-9 items-center justify-center rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: b.color }}
                  aria-hidden
                >
                  {b.name.slice(0, 1)}
                </span>
                <span className="text-xs font-medium leading-tight">{b.name}</span>
              </button>
            )
          })}
        </div>
      </Card>

      {selected && (
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span
              className="flex size-9 items-center justify-center rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: selected.color }}
              aria-hidden
            >
              {selected.name.slice(0, 1)}
            </span>
            <div>
              <p className="text-sm font-semibold">{selected.name}</p>
              <p className="text-xs text-muted-foreground">Secure open-banking link</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="acct-name">Name on the account</Label>
            <Input
              id="acct-name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Ada Obi"
              autoComplete="name"
            />
          </div>

          <Button
            size="lg"
            className="mt-4 h-11 w-full"
            onClick={handleConnect}
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Connecting securely…
              </>
            ) : (
              <>
                <Link2 className="size-4" /> Connect {selected.name}
              </>
            )}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Demo connection — your real bank credentials are never requested.
          </p>
        </Card>
      )}
    </div>
  )
}

function ConnectedPanel() {
  const { bank, expenses, disconnectBank, importTransactions } = useStore()
  const { cancelPremium } = useAuth()
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<number | null>(null)

  const bankExpenses = useMemo(
    () => expenses.filter((e) => e.source === 'bank').slice(0, 8),
    [expenses],
  )

  if (!bank) return null

  async function handleSync() {
    setSyncing(true)
    setLastResult(null)
    try {
      const txns = await fetchTransactions(bank!.lastSyncedAt)
      const count = importTransactions(txns)
      setLastResult(count)
    } finally {
      setSyncing(false)
    }
  }

  function handleDisconnect() {
    if (confirm(`Disconnect ${bank!.bankName}? Imported spending stays, but auto-sync stops.`)) {
      disconnectBank()
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Connection card */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Landmark className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-semibold">{bank.bankName}</p>
                <BadgeCheck className="size-4 text-safe" />
              </div>
              <p className="text-xs text-muted-foreground">
                {bank.accountName} · {bank.accountMask}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-safe/15 px-2.5 py-1 text-xs font-medium text-safe">
            <span className="size-1.5 rounded-full bg-safe" /> Live
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Last synced</p>
            <p className="text-sm font-medium">
              {bank.lastSyncedAt
                ? new Date(bank.lastSyncedAt).toLocaleString('en-NG', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Not yet'}
            </p>
          </div>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Syncing…
              </>
            ) : (
              <>
                <RefreshCw className="size-4" /> Sync now
              </>
            )}
          </Button>
        </div>

        {lastResult !== null && (
          <p
            className={cn(
              'mt-3 rounded-lg px-3 py-2 text-xs font-medium',
              lastResult > 0
                ? 'bg-safe/15 text-safe'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {lastResult > 0
              ? `Imported ${lastResult} new ${lastResult === 1 ? 'transaction' : 'transactions'}.`
              : "You're all caught up — no new transactions."}
          </p>
        )}
      </Card>

      {/* Imported transactions */}
      <div>
        <div className="mb-2 flex items-center gap-2 px-1">
          <Zap className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Auto-imported spending</h3>
        </div>
        {bankExpenses.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground text-pretty">
              Nothing imported yet. Tap <span className="font-medium text-foreground">Sync now</span>{' '}
              to pull your latest transactions.
            </p>
          </Card>
        ) : (
          <Card className="divide-y divide-border">
            {bankExpenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Building2 className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.note}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.date).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {' · '}
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="size-3" /> Auto
                    </span>
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold">{formatNaira(e.amount)}</span>
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* Account actions */}
      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          size="lg"
          className="h-11 justify-start border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
          onClick={handleDisconnect}
        >
          <Unlink className="size-4" /> Disconnect bank
        </Button>
        <button
          onClick={() => {
            if (
              confirm('Cancel Premium? Auto-sync will be turned off and your bank disconnected.')
            ) {
              disconnectBank()
              cancelPremium()
            }
          }}
          className="text-center text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Cancel Premium subscription
        </button>
      </div>
    </div>
  )
}
