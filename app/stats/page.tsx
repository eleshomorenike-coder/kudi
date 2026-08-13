import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, MessageSquare, Star, TrendingUp, UserCheck, Users } from 'lucide-react'
import { getStats } from '@/app/actions/stats'

export const metadata: Metadata = {
  title: 'KUDI — App Statistics',
  description: 'Usage and feedback statistics for KUDI.',
}

// Always read fresh numbers.
export const dynamic = 'force-dynamic'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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

      {/* Feedback list */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">
          Feedback
          {stats.feedbackCount > 0 && (
            <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">
              {stats.feedbackCount}
            </span>
          )}
        </h2>

        {stats.feedback.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No feedback yet. Once students start sharing, it will show up here.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {stats.feedback.map((f) => (
              <li key={f.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-0.5" aria-label={f.rating ? `${f.rating} out of 5` : 'No rating'}>
                    {f.rating ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={
                            'size-4 ' +
                            (i < f.rating!
                              ? 'fill-caution text-caution'
                              : 'fill-transparent text-muted-foreground/40')
                          }
                        />
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No rating</span>
                    )}
                  </div>
                  <time className="shrink-0 font-mono text-xs text-muted-foreground">
                    {formatDate(f.createdAt)}
                  </time>
                </div>
                <p className="text-sm leading-relaxed text-pretty">{f.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
