'use server'

import { db } from '@/lib/db'
import { feedback, usageEvent } from '@/lib/db/schema'
import { desc, eq, sql } from 'drizzle-orm'

export interface FeedbackItem {
  id: number
  rating: number | null
  message: string
  createdAt: string
}

export interface AppStats {
  totalVisitors: number
  completedSetup: number
  feedbackCount: number
  averageRating: number | null
  feedback: FeedbackItem[]
}

export async function getStats(): Promise<AppStats> {
  const [visitorRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usageEvent)
    .where(eq(usageEvent.eventType, 'visit'))

  const [setupRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usageEvent)
    .where(eq(usageEvent.eventType, 'setup_complete'))

  const [ratingRow] = await db
    .select({
      count: sql<number>`count(*)::int`,
      avg: sql<number | null>`avg(${feedback.rating})`,
    })
    .from(feedback)

  const items = await db
    .select()
    .from(feedback)
    .orderBy(desc(feedback.createdAt))
    .limit(100)

  return {
    totalVisitors: visitorRow?.count ?? 0,
    completedSetup: setupRow?.count ?? 0,
    feedbackCount: ratingRow?.count ?? 0,
    averageRating: ratingRow?.avg != null ? Number(ratingRow.avg) : null,
    feedback: items.map((f) => ({
      id: f.id,
      rating: f.rating,
      message: f.message,
      createdAt: (f.createdAt instanceof Date ? f.createdAt : new Date(f.createdAt)).toISOString(),
    })),
  }
}
