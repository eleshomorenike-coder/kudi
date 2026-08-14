import 'server-only'

/**
 * Sends the app owner an email alert whenever new feedback arrives.
 *
 * Uses Resend's HTTP API directly (no SDK needed). It is intentionally
 * best-effort: if the required env vars are missing or the request fails,
 * we log and return false so that saving the feedback itself never breaks.
 *
 * Required project env vars:
 *   - RESEND_API_KEY        your Resend API key
 *   - FEEDBACK_ALERT_EMAIL  where alerts should be delivered (the owner)
 * Optional:
 *   - FEEDBACK_FROM_EMAIL   verified sender (defaults to Resend's onboarding address)
 */
export interface FeedbackAlert {
  rating: number | null
  message: string
  deviceId: string | null
}

export async function sendFeedbackAlert(alert: FeedbackAlert): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.FEEDBACK_ALERT_EMAIL
  const from = process.env.FEEDBACK_FROM_EMAIL || 'KUDI Feedback <onboarding@resend.dev>'

  if (!apiKey || !to) {
    console.log('[v0] sendFeedbackAlert skipped: RESEND_API_KEY or FEEDBACK_ALERT_EMAIL not set')
    return false
  }

  const ratingLine = alert.rating ? `${alert.rating} / 5 stars` : 'No rating'
  const safeMessage = escapeHtml(alert.message)

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `New KUDI feedback${alert.rating ? ` — ${alert.rating}★` : ''}`,
        html: `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="margin:0 0 4px;">New feedback from a KUDI user</h2>
            <p style="color:#6b7280;margin:0 0 16px;font-size:14px;">${ratingLine}</p>
            <blockquote style="margin:0;padding:16px;border-left:3px solid #16a34a;background:#f9fafb;border-radius:8px;font-size:15px;line-height:1.6;white-space:pre-wrap;">${safeMessage}</blockquote>
            <p style="color:#9ca3af;margin:16px 0 0;font-size:12px;">Device: ${escapeHtml(alert.deviceId ?? 'unknown')}</p>
            <p style="margin:16px 0 0;font-size:13px;">Manage all feedback in your <strong>App statistics</strong> dashboard (/stats).</p>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.log('[v0] sendFeedbackAlert failed:', res.status, text)
      return false
    }
    return true
  } catch (err) {
    console.log('[v0] sendFeedbackAlert error:', err instanceof Error ? err.message : err)
    return false
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
