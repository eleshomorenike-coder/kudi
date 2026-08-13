'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Mic, MicOff, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useStore } from '@/lib/store'
import { formatNaira, remainingBudget } from '@/lib/finance'
import { parseSpokenExpense } from '@/lib/voice'
import { CATEGORIES, type CategoryId } from '@/lib/types'
import { cn } from '@/lib/utils'

/* --- Minimal typings for the Web Speech API (not in lib.dom by default) --- */
interface SpeechRecognitionResultLike {
  0: { transcript: string }
  isFinal: boolean
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

type Draft = { amount: string; category: CategoryId; note: string }

export function VoiceAdd({ onAdded }: { onAdded?: () => void }) {
  const { addExpense, setup, expenses } = useStore()
  const [supported, setSupported] = useState(true)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const remaining = setup ? remainingBudget(setup, expenses) : Infinity

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null)
    return () => recognitionRef.current?.stop()
  }, [])

  function start() {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      setSupported(false)
      return
    }
    setError(null)
    setBlocked(null)
    setDraft(null)
    setTranscript('')

    const recognition = new Ctor()
    recognition.lang = 'en-NG'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (e) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript
      }
      setTranscript(text)
    }
    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Microphone access was blocked. Allow it in your browser to use voice.')
      } else if (e.error === 'no-speech') {
        setError("Didn't catch that. Tap the mic and try again.")
      } else {
        setError('Voice input failed. You can type it instead.')
      }
      setListening(false)
    }
    recognition.onend = () => {
      setListening(false)
      setTranscript((current) => {
        if (current.trim()) {
          const parsed = parseSpokenExpense(current)
          setDraft({
            amount: parsed.hasAmount ? String(parsed.amount) : '',
            category: parsed.category,
            note: parsed.note,
          })
        }
        return current
      })
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function stop() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  function confirm() {
    if (!draft) return
    const value = Number(draft.amount) || 0
    if (value <= 0) return
    const result = addExpense({
      amount: value,
      category: draft.category,
      note: draft.note.trim(),
    })
    if (!result.ok) {
      setBlocked(
        `That would put you over budget. You only have ${formatNaira(
          result.remaining,
        )} left to spend this period — logging ${formatNaira(value)} isn't allowed.`,
      )
      return
    }
    setDraft(null)
    setTranscript('')
    setBlocked(null)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1600)
    onAdded?.()
  }

  function cancel() {
    setDraft(null)
    setTranscript('')
    setBlocked(null)
    setError(null)
  }

  if (!supported) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl bg-muted px-4 py-6 text-center">
        <MicOff className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-pretty">
          Voice input isn&apos;t supported in this browser. Try the Type tab, or use Chrome
          on your phone.
        </p>
      </div>
    )
  }

  // Confirmation step — user reviews/corrects what we heard before logging.
  if (draft) {
    const value = Number(draft.amount) || 0
    const wouldExceed = value > remaining
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-muted px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">You said</p>
          <p className="text-sm text-pretty">&ldquo;{transcript}&rdquo;</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative sm:w-40">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-muted-foreground">
              ₦
            </span>
            <Input
              inputMode="numeric"
              placeholder="0"
              aria-label="Amount spent"
              value={draft.amount}
              onChange={(e) =>
                setDraft({ ...draft, amount: e.target.value.replace(/[^0-9]/g, '') })
              }
              className="pl-8 font-mono text-lg"
            />
          </div>
          <Input
            placeholder="What was it?"
            aria-label="Note"
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            className="flex-1"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setDraft({ ...draft, category: c.id })}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                draft.category === c.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {(blocked || wouldExceed) && (
          <p className="rounded-lg bg-danger/12 px-3 py-2 text-sm font-medium text-danger text-pretty">
            {blocked ??
              `This is over your remaining budget of ${formatNaira(remaining)} for the period. Adjust the amount to log it.`}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={cancel}
          >
            <X className="size-4" /> Discard
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={confirm}
            disabled={value <= 0 || wouldExceed}
          >
            <Check className="size-4" /> Log {value > 0 ? formatNaira(value) : 'expense'}
          </Button>
        </div>
      </div>
    )
  }

  // Idle / listening step.
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-label={listening ? 'Stop listening' : 'Start voice input'}
        className={cn(
          'relative flex size-20 items-center justify-center rounded-full transition-colors',
          listening
            ? 'bg-danger text-danger-foreground'
            : 'bg-primary text-primary-foreground hover:opacity-90',
        )}
      >
        {listening && (
          <span className="absolute inset-0 animate-ping rounded-full bg-danger/40" />
        )}
        {listening ? <Square className="size-7" /> : <Mic className="size-8" />}
      </button>

      <div className="text-center">
        {justAdded ? (
          <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-safe">
            <Check className="size-4" /> Logged!
          </p>
        ) : listening ? (
          <p className="flex items-center justify-center gap-1.5 text-sm font-medium">
            <Loader2 className="size-4 animate-spin" /> Listening… just talk
          </p>
        ) : (
          <p className="text-sm font-medium">Tap and tell me what you spent</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground text-pretty">
          {listening
            ? 'e.g. "I spent 1,500 on lunch"'
            : 'Too tired to type? Say it out loud — I\u2019ll sort out the amount and category.'}
        </p>
      </div>

      {transcript && listening && (
        <p className="max-w-full rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground text-pretty">
          {transcript}
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-caution/15 px-3 py-2 text-sm font-medium text-caution text-pretty">
          {error}
        </p>
      )}
    </div>
  )
}
