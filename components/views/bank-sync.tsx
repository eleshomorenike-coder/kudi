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
  Trash2,
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
import {
  parseBankAlertsBatch,
  SAMPLE_BANK_ALERTS,
  type ParsedAlertTransaction,
} from '@/lib/auto-tracker'
import type { BankInfo } from '@/lib/types'
import { formatNaira } from '@/lib/finance'
import { cn } from '@/lib/utils'

export function BankSync() {
  const { user, upgradeToPremium } = useAuth()
  const [activeTab, setActiveTab] = useState<'bank' | 'sms'>('bank')

  if (!user) return null

  return (
    <div className="flex flex-col gap-5">
      {/* Top Segmented Selector */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-muted p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('bank')}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all',
            activeTab === 'bank'
              ? 'bg-background font-semibold text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Landmark className="size-3.5" /> Open-Banking Auto-Sync
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sms')}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all',
            activeTab === 'sms'
              ? 'bg-background font-semibold text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Zap className="size-3.5" /> SMS Alert Auto-Parser
        </button>
      </div>

      {activeTab === 'bank' ? (
        user.premium ? (
          <ConnectedOrConnectBank />
        ) : (
          <Paywall onUpgrade={upgradeToPremium} />
        )
      ) : (
        <SmsAlertTracker />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* SMS Alert Auto-Parser (Free & Universal)                                   */
/* -------------------------------------------------------------------------- */

function SmsAlertTracker() {
  const { categories, importTransactions } = useStore()
  const [alertText, setAlertText] = useState('')
  const [parsedItems, setParsedItems] = useState<ParsedAlertTransaction[]>([])
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function handleParse(text: string) {
    setAlertText(text)
    const results = parseBankAlertsBatch(text)
    setParsedItems(results)
  }

  function handleImport() {
    if (parsedItems.length === 0) return

    const transactions = parsedItems.map((item) => ({
      id: item.id,
      amount: item.amount,
      category: item.category,
      note: `${item.note} (${item.bankName})`,
      date: item.date,
      source: 'bank' as const,
    }))

    const added = importTransactions(transactions)
    setSuccessMsg(`Auto-tracked ${added} ${added === 1 ? 'expense' : 'expenses'} successfully!`)
    setTimeout(() => {
      setSuccessMsg(null)
      setAlertText('')
      setParsedItems([])
    }, 2500)
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Zap className="size-5" />
          </div>
          <div>
            <h3 className="font-bold">Instant SMS Alert Reader</h3>
            <p className="text-xs text-muted-foreground">Paste single or batch bank SMS alerts to parse & categorize automatically</p>
          </div>
        </div>

        {/* Presets */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Try a sample Nigerian debit alert
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_BANK_ALERTS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleParse(s.text)}
                className="rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary hover:bg-muted"
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* Text Area */}
        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="sms-area">Paste bank alert text</Label>
          <textarea
            id="sms-area"
            rows={4}
            value={alertText}
            onChange={(e) => handleParse(e.target.value)}
            placeholder="e.g. Debit Alert: Your OPay Acct has been debited with NGN 2,500.00 for Transfer to CHICKEN REPUBLIC on 15-Aug-2026..."
            className="w-full rounded-xl border border-input bg-background p-3 text-xs font-mono placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:outline-none"
          />
        </div>

        {parsedItems.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Extracted Data ({parsedItems.length})
              </p>
              <span className="text-[0.65rem] font-bold text-safe">✓ Auto-Categorized</span>
            </div>

            <div className="flex flex-col gap-2">
              {parsedItems.map((item, idx) => (
                <Card key={idx} className="flex items-center justify-between gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">
                        {formatNaira(item.amount)}
                      </span>
                      <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[0.65rem] font-bold text-primary">
                        {item.bankName}
                      </span>
                    </div>
                    <p className="truncate text-xs font-medium text-foreground mt-0.5">{item.note}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <select
                        value={item.category}
                        onChange={(e) => {
                          const val = e.target.value
                          setParsedItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, category: val } : it)),
                          )
                        }}
                        className="rounded-md border border-border bg-background px-2 py-0.5 text-xs text-foreground"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-[0.65rem] text-muted-foreground">
                        {new Date(item.date).toLocaleDateString('en-NG', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setParsedItems((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label="Remove item"
                    className="text-muted-foreground hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </Card>
              ))}
            </div>

            <Button onClick={handleImport} size="lg" className="mt-2 h-11 font-semibold">
              <Zap className="size-4" /> Import {parsedItems.length} {parsedItems.length === 1 ? 'Expense' : 'Expenses'}
            </Button>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-safe/15 p-3 text-xs font-semibold text-safe">
            <Check className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Free plan: upgrade paywall                                                 */
/* -------------------------------------------------------------------------- */

function Paywall({ onUpgrade }: { onUpgrade: () => void }) {
  const [upgrading, setUpgrading] = useState(false)

  function handleUpgrade() {
    setUpgrading(true)
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
            <Crown className="size-3.5" /> Premium Feature
          </div>
          <h2 className="text-2xl font-semibold text-balance">Direct Open-Banking Auto-Sync</h2>
          <p className="mt-1.5 text-sm text-primary-foreground/80 text-pretty">
            Connect your Nigerian bank or fintech (OPay, Kuda, PalmPay, GTBank) to pull debits in real time with automated category matching.
          </p>
        </div>

        <div className="grid gap-px bg-border sm:grid-cols-2">
          <div className="bg-card p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="font-semibold">SMS Alert Parser</h3>
              <span className="font-mono text-sm font-semibold">Free</span>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2 text-foreground">
                <Check className="size-4 text-safe shrink-0" /> Paste any Nigerian bank SMS alert
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <Check className="size-4 text-safe shrink-0" /> Smart category keyword extraction
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <Check className="size-4 text-safe shrink-0" /> Batch parsing & manual tracking
              </li>
            </ul>
          </div>

          <div className="bg-primary/5 p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="font-semibold">Direct Bank Sync</h3>
              <span className="font-mono text-sm font-semibold">₦500/mo</span>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2 text-foreground">
                <Check className="size-4 text-safe shrink-0" /> Live connection to OPay, Kuda, GTBank
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <Check className="size-4 text-safe shrink-0" /> Automatic background syncing
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <Check className="size-4 text-safe shrink-0" /> 1-tap refresh anytime
              </li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="flex items-start gap-3 p-5">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-safe" />
        <p className="text-sm text-muted-foreground text-pretty">
          KUDI connects via read-only open-banking protocols. We can only read debit entries and can never initiate transfers.
        </p>
      </Card>

      <Button size="lg" className="h-12 text-base font-semibold" onClick={handleUpgrade} disabled={upgrading}>
        {upgrading ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Unlocking Auto-Sync…
          </>
        ) : (
          <>
            <Zap className="size-4" /> Unlock Direct Bank Sync (Demo)
          </>
        )}
      </Button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Connected or Connect Bank Panel                                            */
/* -------------------------------------------------------------------------- */

function ConnectedOrConnectBank() {
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
        <h2 className="text-xl font-semibold">Bank Connected</h2>
        <p className="max-w-sm text-sm text-muted-foreground text-pretty">
          Imported <span className="font-semibold text-foreground">{imported}</span> transactions from your account.
        </p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <h2 className="font-semibold">Select Your Bank / Fintech</h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Choose where you receive allowances or make daily transfers.
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
                  active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
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
              <p className="text-xs text-muted-foreground">Direct open-banking connection</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="acct-name">Name on Account</Label>
            <Input
              id="acct-name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Tunde Balogun"
              autoComplete="name"
            />
          </div>

          <Button
            size="lg"
            className="mt-4 h-11 w-full font-semibold"
            onClick={handleConnect}
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Connecting…
              </>
            ) : (
              <>
                <Link2 className="size-4" /> Connect {selected.name}
              </>
            )}
          </Button>
        </Card>
      )}
    </div>
  )
}

function ConnectedPanel() {
  const { bank, expenses, disconnectBank, importTransactions } = useStore()
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
      {/* Live status */}
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
            <span className="size-1.5 rounded-full bg-safe" /> Connected
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
                : 'Just now'}
            </p>
          </div>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Syncing…
              </>
            ) : (
              <>
                <RefreshCw className="size-4" /> Sync Now
              </>
            )}
          </Button>
        </div>

        {lastResult !== null && (
          <p
            className={cn(
              'mt-3 rounded-lg px-3 py-2 text-xs font-medium',
              lastResult > 0 ? 'bg-safe/15 text-safe' : 'bg-muted text-muted-foreground',
            )}
          >
            {lastResult > 0
              ? `Imported ${lastResult} new ${lastResult === 1 ? 'transaction' : 'transactions'}.`
              : "All caught up — no new transactions."}
          </p>
        )}
      </Card>

      {/* Auto-imported history */}
      <div>
        <div className="mb-2 flex items-center gap-2 px-1">
          <Zap className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Auto-Imported Transactions</h3>
        </div>

        {bankExpenses.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground text-pretty">
              Tap <span className="font-medium text-foreground">Sync Now</span> to fetch recent debit entries.
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
                    })}{' '}
                    · <span className="text-primary font-medium">Auto-Tracked</span>
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold">{formatNaira(e.amount)}</span>
              </div>
            ))}
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          size="lg"
          className="h-11 justify-start border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
          onClick={handleDisconnect}
        >
          <Unlink className="size-4" /> Disconnect Bank
        </Button>
      </div>
    </div>
  )
}
