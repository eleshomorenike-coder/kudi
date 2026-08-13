'use client'

/**
 * Thin wrapper around the browser Notification API so the rest of the app
 * never has to worry about SSR, unsupported browsers, or permission state.
 * These are on-device/PWA notifications — no server or push service required.
 */

export type NotifyPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getPermission(): NotifyPermission {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission as NotifyPermission
}

/**
 * Asks the browser for permission. Resolves with the resulting state.
 * Safe to call from a click handler (required by most browsers).
 */
export async function requestPermission(): Promise<NotifyPermission> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    const result = await Notification.requestPermission()
    return result as NotifyPermission
  } catch {
    return getPermission()
  }
}

/** Fires a notification if — and only if — permission has been granted. */
export function sendNotification(title: string, body?: string, tag?: string): boolean {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  try {
    new Notification(title, {
      body,
      tag,
      icon: '/icon.png',
      badge: '/icon.png',
    })
    return true
  } catch {
    return false
  }
}

/* --- Once-per-day de-duplication for automated budget alerts --- */

const ALERT_KEY = 'kudi.notify.lastAlert'

function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/**
 * Sends an alert at most once per day per `kind`, so students aren't spammed
 * every time they open the app or log a spend.
 */
export function sendDailyAlertOnce(kind: string, title: string, body: string, now = new Date()): boolean {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  const stamp = `${kind}:${todayKey(now)}`
  try {
    const last = localStorage.getItem(ALERT_KEY)
    if (last === stamp) return false
    const sent = sendNotification(title, body, kind)
    if (sent) localStorage.setItem(ALERT_KEY, stamp)
    return sent
  } catch {
    return sendNotification(title, body, kind)
  }
}
