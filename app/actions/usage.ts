'use server'

import { db } from '@/lib/db'
import { usageEvent } from '@/lib/db/schema'

export type UsageEventType = 'visit' | 'setup_complete'

/**
 * Records a usage event for an anonymous device. The unique (device_id, event_type)
 * index means each device is only ever counted once per event type, so repeat
 * visits don't inflate the numbers.
 */
export async function recordUsage(deviceId: string, eventType: UsageEventType) {
  if (!deviceId) return { ok: false as const }
  if (eventType !== 'visit' && eventType !== 'setup_complete') {
    return { ok: false as const }
  }

  try {
    await db
      .insert(usageEvent)
      .values({ deviceId, eventType })
      .onConflictDoNothing()
    return { ok: true as const }
  } catch (err) {
    console.log('[v0] recordUsage error:', err instanceof Error ? err.message : err)
    return { ok: false as const }
  }
}
