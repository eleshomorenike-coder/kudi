'use server'

import { db } from '@/lib/db'
import { feedback } from '@/lib/db/schema'
import { sendFeedbackAlert } from '@/lib/email'

export interface SubmitFeedbackInput {
  deviceId: string
  rating: number | null
  message: string
}

export async function submitFeedback(input: SubmitFeedbackInput) {
  const message = input.message?.trim()
  if (!message) {
    return { ok: false as const, error: 'Please write a short message.' }
  }
  if (message.length > 2000) {
    return { ok: false as const, error: 'Message is too long (max 2000 characters).' }
  }

  const rating =
    typeof input.rating === 'number' && input.rating >= 1 && input.rating <= 5
      ? Math.round(input.rating)
      : null

  const deviceId = input.deviceId || null

  try {
    await db.insert(feedback).values({
      deviceId,
      rating,
      message,
    })

    // Best-effort owner alert. Never let an email failure fail the submission.
    void sendFeedbackAlert({ rating, message, deviceId })

    return { ok: true as const }
  } catch (err) {
    console.log('[v0] submitFeedback error:', err instanceof Error ? err.message : err)
    return { ok: false as const, error: 'Could not save your feedback. Please try again.' }
  }
}
