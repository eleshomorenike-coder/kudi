import { cn } from '@/lib/utils'

type Tone = 'primary' | 'safe' | 'caution' | 'danger' | 'muted'

const toneClass: Record<Tone, string> = {
  primary: 'bg-primary',
  safe: 'bg-safe',
  caution: 'bg-caution',
  danger: 'bg-danger',
  muted: 'bg-muted-foreground/40',
}

function Progress({
  value,
  tone = 'primary',
  className,
}: {
  value: number
  tone?: Tone
  className?: string
}) {
  const pct = Math.min(Math.max(value, 0), 100)
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', toneClass[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export { Progress }
