/**
 * Simulated bank aggregator.
 *
 * This stands in for a licensed open-banking provider (e.g. Mono or Okra in
 * Nigeria). The public functions below mirror the shape of a real
 * aggregator's SDK — `listBanks`, `linkAccount`, and `fetchTransactions` —
 * so the UI never has to change when a real provider is wired in. When you're
 * ready to go live, replace the bodies here with real API calls (server-side,
 * using the provider's secret key) and keep the same return types.
 */

import type { BankInfo, BankConnection, BankTransaction, CategoryId } from './types'

/** Banks & fintechs a Nigerian student is likely to use. */
export const SUPPORTED_BANKS: BankInfo[] = [
  { id: 'opay', name: 'OPay', color: '#1A936F' },
  { id: 'kuda', name: 'Kuda', color: '#40196D' },
  { id: 'palmpay', name: 'PalmPay', color: '#4B2AAD' },
  { id: 'gtbank', name: 'GTBank', color: '#E85B25' },
  { id: 'access', name: 'Access Bank', color: '#00518F' },
  { id: 'uba', name: 'UBA', color: '#D31145' },
  { id: 'zenith', name: 'Zenith Bank', color: '#E4032E' },
  { id: 'firstbank', name: 'First Bank', color: '#00263A' },
  { id: 'moniepoint', name: 'Moniepoint', color: '#0357EE' },
]

export function listBanks(): BankInfo[] {
  return SUPPORTED_BANKS
}

/** Small artificial delay so the simulated network calls feel real. */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * "Links" a bank account. A real aggregator opens a secure widget and returns
 * an account reference after the user authenticates with their bank. Here we
 * synthesize a believable account record.
 */
export async function linkAccount(
  bank: BankInfo,
  accountName: string,
): Promise<BankConnection> {
  await delay(1400)
  const last4 = String(Math.floor(1000 + Math.random() * 9000))
  return {
    bankId: bank.id,
    bankName: bank.name,
    accountMask: `•••• ${last4}`,
    accountName: accountName.trim() || 'Student Account',
    connectedAt: new Date().toISOString(),
    lastSyncedAt: null,
  }
}

/** Merchant templates keyed by the category the spend maps to. */
const MERCHANTS: Array<{ category: CategoryId; notes: string[]; min: number; max: number }> = [
  { category: 'food', notes: ['Chicken Republic', 'The Place', 'Campus canteen', 'Mr Biggs', 'Jollof & rice'], min: 700, max: 3500 },
  { category: 'transport', notes: ['Bolt ride', 'Uber trip', 'Keke fare', 'Bus fare', 'Fuel'], min: 400, max: 4000 },
  { category: 'data', notes: ['MTN data', 'Airtel top-up', 'Glo data', '9mobile airtime'], min: 500, max: 5000 },
  { category: 'groceries', notes: ['Shoprite', 'Market run', 'Provisions', 'Supermarket'], min: 1500, max: 8000 },
  { category: 'subscriptions', notes: ['Netflix', 'Spotify', 'Showmax', 'DSTV', 'Apple iCloud'], min: 1200, max: 6500 },
  { category: 'shopping', notes: ['Jumia order', 'Konga', 'Clothing store', 'Phone accessory'], min: 2000, max: 15000 },
  { category: 'entertainment', notes: ['Cinema ticket', 'Game top-up', 'Betting', 'Concert'], min: 1000, max: 7000 },
  { category: 'health', notes: ['Pharmacy', 'Medplus', 'Clinic visit'], min: 800, max: 6000 },
  { category: 'personal', notes: ['Barber', 'Salon', 'Toiletries'], min: 500, max: 4000 },
]

/** Round to a believable amount (nearest ₦50). */
function tidyAmount(n: number): number {
  return Math.max(50, Math.round(n / 50) * 50)
}

/**
 * Fetches transactions posted since `since`. A real aggregator returns the
 * account's actual debit transactions; here we generate a believable set.
 * Returns them newest-first.
 */
export async function fetchTransactions(
  since: string | null,
): Promise<BankTransaction[]> {
  await delay(1600)

  const now = Date.now()
  const sinceMs = since ? new Date(since).getTime() : now - 7 * 24 * 60 * 60 * 1000
  const windowMs = Math.min(now - sinceMs, 14 * 24 * 60 * 60 * 1000)

  // Roughly one to three transactions per day in the window.
  const days = Math.max(1, Math.round(windowMs / (24 * 60 * 60 * 1000)))
  const count = since ? Math.floor(Math.random() * 4) + 1 : Math.min(days * 2, 18)

  const txns: BankTransaction[] = []
  for (let i = 0; i < count; i++) {
    const m = rand(MERCHANTS)
    const amount = tidyAmount(m.min + Math.random() * (m.max - m.min))
    const ts = now - Math.floor(Math.random() * windowMs)
    txns.push({
      id: `bank-${ts}-${Math.random().toString(36).slice(2, 8)}`,
      amount,
      category: m.category,
      note: rand(m.notes),
      date: new Date(ts).toISOString(),
    })
  }

  return txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
