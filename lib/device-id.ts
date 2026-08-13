'use client'

const DEVICE_KEY = 'kudi.device.v1'

/**
 * Returns a stable, anonymous per-device identifier, generating and persisting
 * one on first use. Used only to de-duplicate usage counts — it carries no
 * personal information.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}
