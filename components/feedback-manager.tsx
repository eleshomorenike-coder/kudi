'use client'

import { useMemo, useState, useTransition } from 'react'
import { Check, RotateCcw, Star, MessageSquarePlus } from 'lucide-react'
import {
  saveFeedbackReply,
  setFeedbackStatus,
  type FeedbackItem,
  type FeedbackStatus,
} from '@/app/actions/stats'

type Filter = 'all' | 'new' | 'resolved'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function FeedbackManager({ initial }: { initial: FeedbackItem[] }) {
  const [items, setItems] = useState<FeedbackItem[]>(initial)
  const [filter, setFilter] = useState<Filter>('all')
  const [isPending, startTransition] = useTransition()

  const counts = useMemo(
    () => ({
      all: items.length,
      new: items.filter((f) => f.status === 'new').length,
      resolved: items.filter((f) => f.status === 'resolved').length,
    }),
    [items],
  )

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((f) => f.status === filter)),
    [items, filter],
  )

  function toggleStatus(item: FeedbackItem) {
    const next: FeedbackStatus = item.status === 'resolved' ? 'new' : 'resolved'
    setItems((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: next } : f)))
    startTransition(async () => {
      const res = await setFeedbackStatus(item.id, next)
      if (!res.ok) {
        // revert on failure
        setItems((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: item.status } : f)),
        )
      }
    })
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'resolved', label: 'Resolved' },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filters.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ' +
                (active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground')
              }
            >
              {f.label}
              <span className={'font-mono ' + (active ? 'opacity-90' : 'opacity-60')}>
                {counts[f.key]}
              </span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {filter === 'all'
              ? 'No feedback yet. Once students start sharing, it will show up here.'
              : `No ${filter} feedback.`}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((item) => (
            <FeedbackRow
              key={item.id}
              item={item}
              disabled={isPending}
              onToggle={() => toggleStatus(item)}
              onReplySaved={(reply) =>
                setItems((prev) =>
                  prev.map((f) => (f.id === item.id ? { ...f, adminReply: reply } : f)),
                )
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function FeedbackRow({
  item,
  disabled,
  onToggle,
  onReplySaved,
}: {
  item: FeedbackItem
  disabled: boolean
  onToggle: () => void
  onReplySaved: (reply: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.adminReply ?? '')
  const [saving, startSaving] = useTransition()
  const resolved = item.status === 'resolved'

  function save() {
    startSaving(async () => {
      const res = await saveFeedbackReply(item.id, draft)
      if (res.ok) {
        onReplySaved(draft.trim() || null)
        setEditing(false)
      }
    })
  }

  return (
    <li
      className={
        'rounded-2xl border bg-card p-5 transition-colors ' +
        (resolved ? 'border-border/60 opacity-75' : 'border-border')
      }
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-0.5"
          aria-label={item.rating ? `${item.rating} out of 5` : 'No rating'}
        >
          {item.rating ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={
                  'size-4 ' +
                  (i < item.rating!
                    ? 'fill-caution text-caution'
                    : 'fill-transparent text-muted-foreground/40')
                }
              />
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No rating</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {resolved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              <Check className="size-3" /> Resolved
            </span>
          )}
          <time className="shrink-0 font-mono text-xs text-muted-foreground">
            {formatDate(item.createdAt)}
          </time>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-pretty">{item.message}</p>

      {item.adminReply && !editing && (
        <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Your note
          </p>
          <p className="text-sm leading-relaxed text-pretty">{item.adminReply}</p>
        </div>
      )}

      {editing && (
        <div className="mt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Add a private note or how you plan to act on this…"
            className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save note'}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(item.adminReply ?? '')
                setEditing(false)
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
        >
          {resolved ? (
            <>
              <RotateCcw className="size-3.5" /> Reopen
            </>
          ) : (
            <>
              <Check className="size-3.5" /> Mark resolved
            </>
          )}
        </button>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MessageSquarePlus className="size-3.5" />
            {item.adminReply ? 'Edit note' : 'Add note'}
          </button>
        )}
      </div>
    </li>
  )
}
