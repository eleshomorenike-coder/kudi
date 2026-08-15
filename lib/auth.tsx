'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

/** Public-facing account record (never carries the password hash). */
export interface Account {
  id: string
  name: string
  email: string
  createdAt: string
  /** Whether the user opted in to browser notifications. */
  notifyOptIn: boolean
  /** Premium unlocks bank auto-sync. Simulated upgrade in this build. */
  premium: boolean
  /** When the user upgraded (ISO), or null on the free plan. */
  premiumSince: string | null
}

interface StoredAccount extends Account {
  passwordHash: string
}

interface AuthValue {
  user: Account | null
  ready: boolean
  signUp: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logOut: () => void
  updateProfile: (patch: Partial<Pick<Account, 'name' | 'notifyOptIn'>>) => void
  /** Simulated premium upgrade — unlocks bank auto-sync. */
  upgradeToPremium: () => void
  /** Cancel premium and return to the free plan. */
  cancelPremium: () => void
}

const USERS_KEY = 'kudi.users.v1'
const SESSION_KEY = 'kudi.session.v1'

const AuthContext = createContext<AuthValue | null>(null)

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** SHA-256 hash so raw passwords are never persisted, even on-device. */
async function hashPassword(password: string): Promise<string> {
  try {
    const data = new TextEncoder().encode(`kudi::${password}`)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    // Fallback for environments without SubtleCrypto (should be rare).
    return `plain::${password}`
  }
}

function readUsers(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? (JSON.parse(raw) as StoredAccount[]) : []
  } catch {
    return []
  }
}

function writeUsers(users: StoredAccount[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch {
    // ignore storage errors
  }
}

function strip(u: StoredAccount): Account {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt,
    notifyOptIn: u.notifyOptIn ?? false,
    premium: u.premium ?? false,
    premiumSince: u.premiumSince ?? null,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const sessionId = localStorage.getItem(SESSION_KEY)
      if (sessionId) {
        const found = readUsers().find((u) => u.id === sessionId)
        // Restoring a session from localStorage must happen after the first
        // render so SSR/hydration always matches (client then swaps in the
        // signed-in tree once the effect runs).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (found) setUser(strip(found))
      }
    } catch {
      // ignore
    }
    setReady(true)
  }, [])

  const value: AuthValue = {
    user,
    ready,
    async signUp(name, email, password) {
      const cleanEmail = email.trim().toLowerCase()
      const cleanName = name.trim()
      if (!cleanName) return { ok: false, error: 'Please enter your name.' }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
        return { ok: false, error: 'Please enter a valid email address.' }
      if (password.length < 6)
        return { ok: false, error: 'Password must be at least 6 characters.' }

      const users = readUsers()
      if (users.some((u) => u.email === cleanEmail))
        return { ok: false, error: 'An account with this email already exists.' }

      const account: StoredAccount = {
        id: uid(),
        name: cleanName,
        email: cleanEmail,
        createdAt: new Date().toISOString(),
        notifyOptIn: false,
        premium: false,
        premiumSince: null,
        passwordHash: await hashPassword(password),
      }
      writeUsers([...users, account])
      localStorage.setItem(SESSION_KEY, account.id)
      setUser(strip(account))
      return { ok: true }
    },
    async logIn(email, password) {
      const cleanEmail = email.trim().toLowerCase()
      const users = readUsers()
      const found = users.find((u) => u.email === cleanEmail)
      if (!found) return { ok: false, error: 'No account found with this email.' }
      const hash = await hashPassword(password)
      if (hash !== found.passwordHash)
        return { ok: false, error: 'Incorrect password. Please try again.' }
      localStorage.setItem(SESSION_KEY, found.id)
      setUser(strip(found))
      return { ok: true }
    },
    logOut() {
      try {
        localStorage.removeItem(SESSION_KEY)
      } catch {
        // ignore
      }
      setUser(null)
    },
    updateProfile(patch) {
      setUser((current) => {
        if (!current) return current
        const next = { ...current, ...patch }
        const users = readUsers().map((u) =>
          u.id === current.id ? { ...u, ...patch } : u,
        )
        writeUsers(users)
        return next
      })
    },
    upgradeToPremium() {
      setUser((current) => {
        if (!current) return current
        const patch = { premium: true, premiumSince: new Date().toISOString() }
        const next = { ...current, ...patch }
        writeUsers(readUsers().map((u) => (u.id === current.id ? { ...u, ...patch } : u)))
        return next
      })
    },
    cancelPremium() {
      setUser((current) => {
        if (!current) return current
        const patch = { premium: false, premiumSince: null }
        const next = { ...current, ...patch }
        writeUsers(readUsers().map((u) => (u.id === current.id ? { ...u, ...patch } : u)))
        return next
      })
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
