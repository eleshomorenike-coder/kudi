'use server'

import { db } from '@/lib/db'
import { feedback, usageEvent } from '@/lib/db/schema'
import { desc, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export type FeedbackStatus = 'new' | 'resolved'

export interface FeedbackItem {
  id: number
  rating: number | null
  message: string
  status: FeedbackStatus
  adminReply: string | null
  createdAt: string
}

export interface AppStats {
  totalVisitors: number
  completedSetup: number
  feedbackCount: number
  newCount: number
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

  const [newRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(feedback)
    .where(eq(feedback.status, 'new'))

  const items = await db
    .select()
    .from(feedback)
    .orderBy(desc(feedback.createdAt))
    .limit(200)

  return {
    totalVisitors: visitorRow?.count ?? 0,
    completedSetup: setupRow?.count ?? 0,
    feedbackCount: ratingRow?.count ?? 0,
    newCount: newRow?.count ?? 0,
    averageRating: ratingRow?.avg != null ? Number(ratingRow.avg) : null,
    feedback: items.map((f) => ({
      id: f.id,
      rating: f.rating,
      message: f.message,
      status: (f.status as FeedbackStatus) ?? 'new',
      adminReply: f.adminReply ?? null,
      createdAt: (f.createdAt instanceof Date ? f.createdAt : new Date(f.createdAt)).toISOString(),
    })),
  }
}

/** Owner action: mark a feedback item resolved or reopen it. */
export async function setFeedbackStatus(id: number, status: FeedbackStatus) {
  if (status !== 'new' && status !== 'resolved') {
    return { ok: false as const }
  }
  try {
    await db
      .update(feedback)
      .set({ status, resolvedAt: status === 'resolved' ? new Date() : null })
      .where(eq(feedback.id, id))
    revalidatePath('/stats')
    return { ok: true as const }
  } catch (err) {
    console.log('[v0] setFeedbackStatus error:', err instanceof Error ? err.message : err)
    return { ok: false as const }
  }
}

/** Owner action: save a private note / reply against a feedback item. */
export async function saveFeedbackReply(id: number, reply: string) {
  const clean = reply.trim().slice(0, 2000)
  try {
    await db
      .update(feedback)
      .set({ adminReply: clean || null })
      .where(eq(feedback.id, id))
    revalidatePath('/stats')
    return { ok: true as const }
  } catch (err) {
    console.log('[v0] saveFeedbackReply error:', err instanceof Error ? err.message : err)
    return { ok: false as const }
  }
}
