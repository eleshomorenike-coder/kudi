import {
  Bus,
  Film,
  GraduationCap,
  HeartPulse,
  Home,
  PartyPopper,
  Repeat,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  Tag,
  Utensils,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/** Youthful, distinct palette. Values are raw oklch so chips stay colourful in both themes. */
export const CATEGORY_COLORS: Record<string, string> = {
  green: 'oklch(0.64 0.17 152)',
  lime: 'oklch(0.74 0.17 128)',
  teal: 'oklch(0.68 0.12 190)',
  blue: 'oklch(0.62 0.14 240)',
  violet: 'oklch(0.6 0.18 300)',
  pink: 'oklch(0.68 0.19 350)',
  coral: 'oklch(0.68 0.18 32)',
  amber: 'oklch(0.78 0.16 70)',
  slate: 'oklch(0.58 0.03 250)',
}

export const COLOR_KEYS = Object.keys(CATEGORY_COLORS)

export function colorValue(key: string): string {
  return CATEGORY_COLORS[key] ?? CATEGORY_COLORS.slate
}

const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  bus: Bus,
  wifi: Wifi,
  cap: GraduationCap,
  sparkles: Sparkles,
  basket: ShoppingBasket,
  home: Home,
  health: HeartPulse,
  film: Film,
  bag: ShoppingBag,
  repeat: Repeat,
  party: PartyPopper,
  tag: Tag,
}

export const ICON_KEYS = Object.keys(ICONS)

/** A rounded, colour-tinted category icon badge. */
export function CategoryIcon({
  icon,
  color,
  className,
  iconClassName,
}: {
  icon: string
  color: string
  className?: string
  iconClassName?: string
}) {
  const Icon = ICONS[icon] ?? Tag
  const value = colorValue(color)
  return (
    <span
      className={cn('flex items-center justify-center rounded-xl', className)}
      style={{ backgroundColor: `color-mix(in oklch, ${value} 18%, transparent)`, color: value }}
    >
      <Icon className={cn('size-4', iconClassName)} />
    </span>
  )
}
