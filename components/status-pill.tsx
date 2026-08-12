import { cn } from '@/lib/utils'
import type { StatusLevel } from '@/lib/finance'

const styles: Record<StatusLevel, { dot: string; bg: string; text: string; label: string }> = {
  safe: {
    dot: 'bg-safe',
    bg: 'bg-safe/12',
    text: 'text-safe',
    label: 'On track',
  },
  caution: {
    dot: 'bg-caution',
    bg: 'bg-caution/15',
    text: 'text-caution',
    label: 'Getting close',
  },
  danger: {
    dot: 'bg-danger',
    bg: 'bg-danger/12',
    text: 'text-danger',
    label: 'Over limit',
  },
}

export function StatusPill({
  level,
  label,
  className,
}: {
  level: StatusLevel
  label?: string
  className?: string
}) {
  const s = styles[level]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        s.bg,
        s.text,
        className,
      )}
    >
      <span className={cn('size-2 rounded-full', s.dot)} aria-hidden />
      {label ?? s.label}
    </span>
  )
}
