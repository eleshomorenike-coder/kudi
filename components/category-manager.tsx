'use client'

import { useEffect, useState } from 'react'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/lib/store'
import {
  CATEGORY_COLORS,
  CategoryIcon,
  COLOR_KEYS,
  ICON_KEYS,
  colorValue,
} from '@/components/category-visuals'
import { cn } from '@/lib/utils'

export function CategoryManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { categories, addCategory, updateCategory, deleteCategory } = useStore()
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState(ICON_KEYS[0])
  const [color, setColor] = useState(COLOR_KEYS[0])

  // Lock background scroll while the sheet is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  function create(e: React.FormEvent) {
    e.preventDefault()
    const clean = label.trim()
    if (!clean) return
    addCategory({ label: clean, icon, color, essential: false })
    setLabel('')
    setIcon(ICON_KEYS[0])
    setColor(COLOR_KEYS[0])
  }

  const custom = categories.filter((c) => !c.builtin)
  const builtin = categories.filter((c) => c.builtin)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-xl sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold">Customize categories</h2>
            <p className="text-xs text-muted-foreground">Add your own or tweak the colours.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Create new */}
          <form onSubmit={create} className="rounded-2xl bg-muted/60 p-4">
            <Label htmlFor="cat-label" className="mb-2 block">
              New category
            </Label>
            <div className="flex gap-2">
              <Input
                id="cat-label"
                placeholder="e.g. Gym, Pets, Side hustle"
                value={label}
                maxLength={24}
                onChange={(e) => setLabel(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!label.trim()}>
                <Plus className="size-4" /> Add
              </Button>
            </div>

            <p className="mt-4 mb-2 text-xs font-medium text-muted-foreground">Icon</p>
            <div className="flex flex-wrap gap-2">
              {ICON_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  aria-label={`Icon ${key}`}
                  className={cn(
                    'rounded-xl border p-1 transition-colors',
                    icon === key ? 'border-primary bg-background' : 'border-transparent hover:bg-background',
                  )}
                >
                  <CategoryIcon icon={key} color={color} className="size-8" />
                </button>
              ))}
            </div>

            <p className="mt-4 mb-2 text-xs font-medium text-muted-foreground">Colour</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(key)}
                  aria-label={`Colour ${key}`}
                  className={cn(
                    'size-8 rounded-full ring-2 ring-offset-2 ring-offset-card transition-all',
                    color === key ? 'ring-foreground' : 'ring-transparent',
                  )}
                  style={{ backgroundColor: colorValue(key) }}
                />
              ))}
            </div>
          </form>

          {/* Custom categories */}
          {custom.length > 0 && (
            <section className="mt-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Your categories
              </h3>
              <ul className="flex flex-col gap-2">
                {custom.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2"
                  >
                    <CategoryIcon icon={c.icon} color={c.color} className="size-9" />
                    <span className="flex-1 text-sm font-medium">{c.label}</span>
                    <ColorCycler
                      current={c.color}
                      onPick={(next) => updateCategory(c.id, { color: next })}
                    />
                    <button
                      onClick={() => deleteCategory(c.id)}
                      aria-label={`Delete ${c.label}`}
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger/12 hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Built-ins */}
          <section className="mt-5 pb-2">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Built-in categories
            </h3>
            <div className="flex flex-wrap gap-2">
              {builtin.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border py-1 pr-3 pl-1 text-sm"
                >
                  <CategoryIcon icon={c.icon} color={c.color} className="size-6" iconClassName="size-3.5" />
                  {c.label}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

/** Small inline swatch row for recolouring an existing category. */
function ColorCycler({
  current,
  onPick,
}: {
  current: string
  onPick: (color: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change colour"
        className="size-6 rounded-full ring-2 ring-border"
        style={{ backgroundColor: colorValue(current) }}
      />
      {open && (
        <div className="absolute right-0 bottom-8 z-10 flex flex-wrap gap-1.5 rounded-xl border border-border bg-popover p-2 shadow-lg">
          {Object.keys(CATEGORY_COLORS).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onPick(key)
                setOpen(false)
              }}
              aria-label={`Colour ${key}`}
              className="flex size-6 items-center justify-center rounded-full"
              style={{ backgroundColor: colorValue(key) }}
            >
              {key === current && <Check className="size-3.5 text-background" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
