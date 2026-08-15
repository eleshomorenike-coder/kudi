'use client'

import { useState } from 'react'
import {
  Check,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useStore } from '@/lib/store'
import { formatNaira } from '@/lib/finance'
import {
  parseBankAlertsBatch,
  SAMPLE_BANK_ALERTS,
  type ParsedAlertTransaction,
} from '@/lib/auto-tracker'

interface AlertParserModalProps {
  isOpen: boolean
  onClose: () => void
  onImported?: (count: number) => void
}

export function AlertParserModal({ isOpen, onClose, onImported }: AlertParserModalProps) {
  const { categories, importTransactions } = useStore()
  const [inputText, setInputText] = useState('')
  const [parsedItems, setParsedItems] = useState<ParsedAlertTransaction[]>([])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  if (!isOpen) return null

  function handleParse(text: string) {
    setInputText(text)
    const results = parseBankAlertsBatch(text)
    setParsedItems(results)
  }

  function loadSample(sample: (typeof SAMPLE_BANK_ALERTS)[0]) {
    handleParse(sample.text)
  }

  function handleImportAll() {
    if (parsedItems.length === 0) return

    const transactions = parsedItems.map((item) => ({
      id: item.id,
      amount: item.amount,
      category: item.category,
      note: `${item.note} (${item.bankName})`,
      date: item.date,
      source: 'bank' as const,
    }))

    const added = importTransactions(transactions)
    setSuccessMessage(`Successfully auto-tracked ${added} ${added === 1 ? 'expense' : 'expenses'}!`)
    setTimeout(() => {
      setSuccessMessage(null)
      setInputText('')
      setParsedItems([])
      if (onImported) onImported(added)
      onClose()
    }, 1500)
  }

  function updateItemCategory(index: number, newCat: string) {
    setParsedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, category: newCat } : item)),
    )
  }

  function removeItem(index: number) {
    setParsedItems((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />

      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Zap className="size-5" />
            </div>
            <div>
              <h2 className="font-bold leading-tight">Auto-Track from Bank Alert</h2>
              <p className="text-xs text-muted-foreground">Paste your SMS debit text to extract & log instantly</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {successMessage ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-safe/15 text-safe">
                <Check className="size-7" />
              </div>
              <h3 className="mt-3 text-lg font-bold">{successMessage}</h3>
              <p className="mt-1 text-xs text-muted-foreground">Your budget and streaks have been updated automatically.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Preset quick test chips */}
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Try a sample bank alert
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_BANK_ALERTS.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => loadSample(s)}
                      className="rounded-lg border border-border/80 bg-muted/50 px-2.5 py-1 text-left text-xs font-medium transition-colors hover:border-primary hover:bg-muted"
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="alert-input">Paste SMS or notification text</Label>
                <textarea
                  id="alert-input"
                  rows={3}
                  value={inputText}
                  onChange={(e) => handleParse(e.target.value)}
                  placeholder="Paste your debit SMS here (e.g. Debit: NGN 2,500 for Chicken Republic...)"
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs font-mono placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:outline-none"
                />
              </div>

              {/* Parsed Previews */}
              {parsedItems.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Extracted Transactions ({parsedItems.length})
                    </p>
                    <span className="text-[0.65rem] font-bold text-safe">✓ Auto-Categorized</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {parsedItems.map((item, idx) => (
                      <Card key={idx} className="flex items-center justify-between gap-3 p-3.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-foreground">
                              {formatNaira(item.amount)}
                            </span>
                            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[0.65rem] font-bold text-primary">
                              {item.bankName}
                            </span>
                          </div>
                          <p className="truncate text-xs font-medium text-foreground mt-0.5">{item.note}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <select
                              value={item.category}
                              onChange={(e) => updateItemCategory(idx, e.target.value)}
                              className="rounded-md border border-border bg-background px-2 py-0.5 text-xs text-foreground"
                            >
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.label}
                                </option>
                              ))}
                            </select>
                            <span className="text-[0.65rem] text-muted-foreground">
                              {new Date(item.date).toLocaleDateString('en-NG', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          aria-label="Remove item"
                          className="text-muted-foreground hover:text-danger"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!successMessage && (
          <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImportAll}
              disabled={parsedItems.length === 0}
              className="font-semibold"
            >
              <Zap className="size-4" /> Auto-Track {parsedItems.length > 0 ? `(${parsedItems.length})` : ''}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
