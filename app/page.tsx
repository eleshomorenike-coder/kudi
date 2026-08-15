'use client'

import { StoreProvider, useStore } from '@/lib/store'
import { AuthProvider, useAuth } from '@/lib/auth'
import { SetupWizard } from '@/components/setup-wizard'
import { AppShell } from '@/components/app-shell'
import { AuthScreen } from '@/components/auth-screen'

function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      <span className="sr-only">Loading</span>
    </main>
  )
}

function BudgetRoot() {
  const { ready, setup } = useStore()
  if (!ready) return <Loading />
  return setup ? <AppShell /> : <SetupWizard />
}

function AuthGate() {
  const { ready, user } = useAuth()

  if (!ready) return <Loading />
  if (!user) return <AuthScreen />

  return (
    <StoreProvider key={user.id} userId={user.id}>
      <BudgetRoot />
    </StoreProvider>
  )
}

export default function Page() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
