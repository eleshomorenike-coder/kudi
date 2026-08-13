'use client'

import { useState } from 'react'
import { Check, MessageSquareHeart, Send, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { getDeviceId } from '@/lib/device-id'
import { submitFeedback } from '@/app/actions/feedback'
import { cn } from '@/lib/utils'

export function Feedback() {
  const [rating, setRating] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const MAX = 2000
  const canSend = message.trim().length > 0 && status !== 'sending'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSend) return
    setStatus('sending')
    setError('')
    const res = await submitFeedback({
      deviceId: getDeviceId(),
      rating,
      message: message.trim(),
    })
    if (res.ok) {
      setStatus('sent')
      setMessage('')
      setRating(null)
    } else {
      setStatus('error')
      setError(res.error ?? 'Something went wrong.')
    }
  }

  if (status === 'sent') {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-safe text-safe-foreground">
          <Check className="size-6" />
        </div>
        <h3 className="text-lg font-semibold">Thank you!</h3>
        <p className="max-w-sm text-sm text-muted-foreground text-pretty">
          Your feedback landed safely. It genuinely helps make KUDI better for every student.
        </p>
        <Button variant="outline" className="mt-2" onClick={() => setStatus('idle')}>
          Send more feedback
        </Button>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <MessageSquareHeart className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold leading-tight">Share your feedback</h3>
            <p className="text-xs text-muted-foreground">
              Tell us what you love, what&apos;s confusing, or what&apos;s missing.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>How would you rate KUDI? (optional)</Label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hover ?? rating ?? 0) >= n
                return (
                  <button
                    key={n}
                    type="button"
                    aria-label={`Rate ${n} out of 5`}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setRating(rating === n ? null : n)}
                    className="rounded-md p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        'size-7 transition-colors',
                        active
                          ? 'fill-caution text-caution'
                          : 'fill-transparent text-muted-foreground',
                      )}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="feedback-message">Your message</Label>
            <textarea
              id="feedback-message"
              value={message}
              maxLength={MAX}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What would make KUDI more useful for you?"
              rows={5}
              className="w-full resize-y rounded-xl border border-input bg-transparent px-3.5 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Anonymous — no account needed.</span>
              <span className="font-mono">
                {message.length}/{MAX}
              </span>
            </div>
          </div>

          {status === 'error' && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" size="lg" className="h-11" disabled={!canSend}>
            <Send className="size-4" />
            {status === 'sending' ? 'Sending…' : 'Send feedback'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
