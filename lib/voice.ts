import type { CategoryId } from './types'

export interface ParsedExpense {
  amount: number
  category: CategoryId
  note: string
  /** True when we were able to confidently pull an amount out of the speech. */
  hasAmount: boolean
}

/** Keywords that map spoken words to a spending category. */
const CATEGORY_KEYWORDS: Record<CategoryId, string[]> = {
  food: [
    'food',
    'lunch',
    'dinner',
    'breakfast',
    'rice',
    'beans',
    'bread',
    'eat',
    'ate',
    'meal',
    'snack',
    'snacks',
    'groceries',
    'chow',
    'chin chin',
    'noodles',
    'indomie',
    'suya',
    'egg',
    'chicken',
    'drink water',
  ],
  transport: [
    'transport',
    'keke',
    'bus',
    'uber',
    'bolt',
    'fare',
    'taxi',
    'cab',
    'okada',
    'bike',
    'ride',
    'fuel',
    'petrol',
    'campus',
    'shuttle',
  ],
  data: [
    'data',
    'airtime',
    'recharge',
    'subscription',
    'sub',
    'mtn',
    'glo',
    'airtel',
    'wifi',
    'internet',
    'browsing',
    'top up',
    'top-up',
  ],
  school: [
    'school',
    'book',
    'books',
    'textbook',
    'printing',
    'print',
    'handout',
    'fees',
    'fee',
    'exam',
    'photocopy',
    'stationery',
    'pen',
    'notebook',
  ],
  personal: [
    'personal',
    'toiletries',
    'soap',
    'haircut',
    'barber',
    'salon',
    'clothes',
    'cloth',
    'shirt',
    'laundry',
    'medicine',
    'drugs',
    'hospital',
    'cream',
    'perfume',
    'shoe',
    'shoes',
  ],
  groceries: [
    'groceries',
    'grocery',
    'market',
    'provisions',
    'supermarket',
    'foodstuff',
    'shoprite',
  ],
  rent: [
    'rent',
    'bill',
    'bills',
    'electricity',
    'nepa',
    'power',
    'light bill',
    'water bill',
    'accommodation',
    'hostel',
  ],
  health: [
    'health',
    'hospital',
    'clinic',
    'pharmacy',
    'medicine',
    'drugs',
    'gym',
    'doctor',
  ],
  entertainment: [
    'entertainment',
    'movie',
    'cinema',
    'netflix',
    'showmax',
    'spotify',
    'concert',
    'show',
    'game',
    'games',
  ],
  shopping: [
    'shopping',
    'clothes',
    'cloth',
    'shirt',
    'shoe',
    'shoes',
    'bag',
    'gadget',
    'accessory',
    'gift',
  ],
  subscriptions: [
    'subscription',
    'subscribe',
    'renewal',
    'plan',
    'membership',
  ],
  fun: [
    'fun',
    'drink',
    'drinks',
    'beer',
    'shawarma',
    'ice cream',
    'party',
    'outing',
    'hangout',
    'club',
    'bet',
    'betting',
  ],
}

/** Spelled-out numbers we might hear for small amounts. */
const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
}

/**
 * Extracts a Naira amount from free speech. Handles digits ("1500"),
 * shorthand ("2k", "2.5k"), and light phrasing ("two thousand", "five hundred").
 */
function extractAmount(text: string): number | null {
  const lower = text.toLowerCase()

  // 1. Shorthand like "2k" or "1.5k"
  const kMatch = lower.match(/(\d+(?:\.\d+)?)\s*k\b/)
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000)
  }

  // 2. "<number> thousand" / "<number> hundred"
  const scaleMatch = lower.match(/(\d+(?:\.\d+)?)\s*(thousand|hundred)/)
  if (scaleMatch) {
    const base = parseFloat(scaleMatch[1])
    return Math.round(base * (scaleMatch[2] === 'thousand' ? 1000 : 100))
  }

  // 3. Plain digits, ignoring commas (e.g. "1,500" or "1500")
  const digitMatch = lower.replace(/,/g, '').match(/\d+(?:\.\d+)?/)
  if (digitMatch) {
    return Math.round(parseFloat(digitMatch[0]))
  }

  // 4. Very light word-number support: "two thousand", "five hundred"
  const words = lower.split(/\s+/)
  let total = 0
  let current = 0
  let matched = false
  for (const w of words) {
    const val = NUMBER_WORDS[w]
    if (val === undefined) continue
    matched = true
    if (val === 1000 || val === 100) {
      current = (current || 1) * val
      total += current
      current = 0
    } else {
      current += val
    }
  }
  total += current
  return matched && total > 0 ? total : null
}

/** Picks the best-matching category based on keyword hits in the speech. */
function extractCategory(text: string): CategoryId {
  const lower = text.toLowerCase()
  let best: CategoryId = 'fun'
  let bestScore = 0
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS) as [
    CategoryId,
    string[],
  ][]) {
    let score = 0
    for (const w of words) {
      if (lower.includes(w)) score += w.includes(' ') ? 2 : 1
    }
    if (score > bestScore) {
      bestScore = score
      best = cat
    }
  }
  return best
}

/**
 * Turns a spoken sentence like "I spent 1500 on lunch at the cafeteria" into
 * a structured expense the app can log.
 */
export function parseSpokenExpense(transcript: string): ParsedExpense {
  const clean = transcript.trim()
  const amount = extractAmount(clean)
  const category = extractCategory(clean)

  // Build a short note from the transcript, trimmed of filler openers.
  const note = clean
    .replace(/^(i\s+)?(just\s+)?(spent|bought|paid|used|got)\s+/i, '')
    .replace(/\bnaira\b/gi, '')
    .replace(/₦/g, '')
    .trim()

  return {
    amount: amount ?? 0,
    category,
    note: note.length > 60 ? note.slice(0, 60) + '…' : note,
    hasAmount: amount !== null && amount > 0,
  }
}
