import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Inbox, MessageSquare, TrendingUp, UserCheck, Users } from 'lucide-react'
import { getStats } from '@/app/actions/stats'
import { FeedbackManager } from '@/components/feedback-manager'

export const metadata: Metadata = {
  title: 'KUDI — App Statistics',
  description: 'Usage and feedback statistics for KUDI.',
}

// Always read fresh numbers.
export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const stats = await getStats()

  const conversion =
    stats.totalVisitors > 0
      ? Math.round((stats.completedSetup / stats.totalVisitors) * 100)
      : 0

  const cards = [
    {
      label: 'Total visitors',
      value: stats.totalVisitors.toLocaleString('en-NG'),
      hint: 'Unique devices that opened the app',
      icon: Users,
    },
    {
      label: 'Completed setup',
      value: stats.completedSetup.toLocaleString('en-NG'),
      hint: 'Finished the budget wizard',
      icon: UserCheck,
    },
    {
      label: 'Setup conversion',
      value: `${conversion}%`,
      hint: 'Visitors who became active users',
      icon: TrendingUp,
    },
    {
      label: 'Feedback received',
      value: stats.feedbackCount.toLocaleString('en-NG'),
      hint:
        stats.averageRating != null
          ? `Avg rating ${stats.averageRating.toFixed(1)} / 5`
          : 'No ratings yet',
      icon: MessageSquare,
    },
    {
      label: 'Needs action',
      value: stats.newCount.toLocaleString('en-NG'),
      hint: 'Unresolved feedback to act on',
      icon: Inbox,
    },
  ]

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 lg:px-8 lg:py-12">
      <header className="mb-8">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to app
        </Link>
        <h1 className="text-3xl font-semibold text-balance">App statistics</h1>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
          A live look at how many students are using KUDI and what they&apos;re saying.
        </p>
      </header>

      {/* Stat cards */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-4 text-primary" />
                <span className="text-xs font-medium">{c.label}</span>
              </div>
              <p className="mt-2 font-mono text-3xl font-semibold tracking-tight">{c.value}</p>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">{c.hint}</p>
            </div>
          )
        })}
      </section>

      {/* Feedback management */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Feedback
            {stats.feedbackCount > 0 && (
              <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">
                {stats.feedbackCount}
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">Filter, note, and resolve</p>
        </div>

        <FeedbackManager initial={stats.feedback} />
      </section>
    </main>
  )
}
