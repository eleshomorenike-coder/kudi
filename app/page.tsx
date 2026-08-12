'use client'

import { StoreProvider, useStore } from '@/lib/store'
import { SetupWizard } from '@/components/setup-wizard'
import { AppShell } from '@/components/app-shell'

function Root() {
  const { ready, setup } = useStore()

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <span className="sr-only">Loading</span>
      </main>
    )
  }

  return setup ? <AppShell /> : <SetupWizard />
}

export default function Page() {
  return (
    <StoreProvider>
      <Root />
    </StoreProvider>
  )
}
