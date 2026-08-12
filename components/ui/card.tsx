import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'rounded-2xl border border-border bg-card text-card-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Card }
