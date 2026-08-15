import type { CategoryId } from './types'

export interface ParsedAlertTransaction {
  id: string
  amount: number
  category: CategoryId
  note: string
  date: string // ISO datetime
  bankName: string
  rawText: string
  confidence: 'high' | 'medium' | 'low'
}

/** Comprehensive keyword mapping to assign categories accurately. */
const CATEGORY_MAP: Record<CategoryId, string[]> = {
  food: [
    'chicken republic',
    'the place',
    'canteen',
    'restaurant',
    'mr biggs',
    'sweet sensation',
    'kilimanjaro',
    'dominos',
    'pizza',
    'burger',
    'shawarma',
    'jollof',
    'bukka',
    'food',
    'lunch',
    'dinner',
    'breakfast',
    'eat',
    'bakery',
    'ice cream',
    'cold stone',
    'grill',
    'suya',
    'kitchen',
  ],
  transport: [
    'bolt',
    'uber',
    'keke',
    'bus',
    'taxi',
    'fare',
    'ride',
    'fuel',
    'petrol',
    'totalenergies',
    'nnpc',
    'mobil',
    'conoil',
    'shuttle',
    'transit',
    'danfo',
    'brt',
  ],
  data: [
    'mtn',
    'airtel',
    'glo',
    '9mobile',
    'airtime',
    'data bundle',
    'recharge',
    'vtu',
    'topup',
    'top-up',
    'internet',
    'spectranet',
    'smile',
    'wifi',
  ],
  groceries: [
    'shoprite',
    'hubmart',
    'spar',
    'supermarket',
    'market',
    'grocery',
    'provisions',
    'store',
    'prince ebeano',
    'foodstuff',
    'justrite',
  ],
  subscriptions: [
    'netflix',
    'spotify',
    'apple',
    'itunes',
    'showmax',
    'dstv',
    'gotv',
    'startimes',
    'prime video',
    'youtube',
    'icloud',
    'google storage',
    'patreon',
    'sub',
  ],
  school: [
    'school',
    'university',
    'college',
    'campus',
    'tuition',
    'faculty',
    'textbook',
    'bookshop',
    'stationery',
    'printing',
    'cyber cafe',
    'handout',
    'exam fee',
    'portal',
  ],
  personal: [
    'barber',
    'salon',
    'spa',
    'laundry',
    'dry clean',
    'haircut',
    'toiletries',
    'cosmetics',
    'soap',
    'cream',
    'perfume',
    'skincare',
  ],
  rent: [
    'rent',
    'hostel',
    'accommodation',
    'lodge',
    'electricity',
    'nepa',
    'ikeja electric',
    'ekedc',
    'eedc',
    'aedc',
    'ibedc',
    'water bill',
    'waste bill',
    'estate due',
  ],
  health: [
    'pharmacy',
    'medplus',
    'healthplus',
    'clinic',
    'hospital',
    'drugs',
    'medicine',
    'doctor',
    'lab test',
    'dental',
    'optical',
  ],
  entertainment: [
    'cinema',
    'filmhouse',
    'genesis',
    'silverbird',
    'concert',
    'ticket',
    'club',
    'lounge',
    'bar',
    'gaming',
    'playstation',
    'bet9ja',
    'sportybet',
    '1xbet',
  ],
  shopping: [
    'jumia',
    'konga',
    'zara',
    'boutique',
    'fashion',
    'shoes',
    'clothes',
    'clothing',
    'accessories',
    'gadgets',
    'slot',
    'microstation',
    'aliexpress',
    'amazon',
  ],
  fun: [
    'outing',
    'party',
    'beach',
    'resort',
    'drinks',
    'hangout',
    'treat',
    'fun',
  ],
  other: [],
}

/** Detects the category based on text tokens in the merchant or narration. */
export function inferCategory(text: string): CategoryId {
  const clean = text.toLowerCase()
  let bestCategory: CategoryId = 'other'
  let bestScore = 0

  for (const [catId, keywords] of Object.entries(CATEGORY_MAP) as [CategoryId, string[]][]) {
    for (const kw of keywords) {
      if (clean.includes(kw)) {
        const score = kw.length // longer matching keyword gets higher weight
        if (score > bestScore) {
          bestScore = score
          bestCategory = catId
        }
      }
    }
  }

  return bestCategory
}

/** Detects the originating bank name from alert text. */
function detectBankName(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('opay')) return 'OPay'
  if (lower.includes('palmpay')) return 'PalmPay'
  if (lower.includes('kuda')) return 'Kuda'
  if (lower.includes('gtbank') || lower.includes('gtb') || lower.includes('guaranty trust')) return 'GTBank'
  if (lower.includes('access')) return 'Access Bank'
  if (lower.includes('zenith')) return 'Zenith Bank'
  if (lower.includes('firstbank') || lower.includes('first bank')) return 'First Bank'
  if (lower.includes('moniepoint')) return 'Moniepoint'
  if (lower.includes('uba') || lower.includes('united bank')) return 'UBA'
  if (lower.includes('stanbic')) return 'Stanbic IBTC'
  if (lower.includes('fcmb')) return 'FCMB'
  if (lower.includes('wema') || lower.includes('alat')) return 'Wema Bank'
  if (lower.includes('sterling')) return 'Sterling Bank'
  return 'Bank Alert'
}

/** Parses a single bank alert snippet. */
export function parseSingleAlert(raw: string): ParsedAlertTransaction | null {
  const text = raw.trim()
  if (!text || text.length < 10) return null

  // 1. Extract Amount
  // Patterns like: "NGN 2,500.00", "₦3,500", "Amt: 1500", "debited with NGN 4,000"
  let amount: number | null = null

  const ngnMatch = text.match(/(?:ngn|naira|₦|\bamt:?|\bamount:?|\bdr:?)\s*([\d,]+(?:\.\d{2})?)/i)
  if (ngnMatch && ngnMatch[1]) {
    amount = parseFloat(ngnMatch[1].replace(/,/g, ''))
  }

  // Fallback: look for debited with <amount> or spent <amount>
  if (!amount) {
    const debitedMatch = text.match(/(?:debited with|spent|paid|purchase of)\s*(?:ngn|₦)?\s*([\d,]+(?:\.\d{2})?)/i)
    if (debitedMatch && debitedMatch[1]) {
      amount = parseFloat(debitedMatch[1].replace(/,/g, ''))
    }
  }

  // Fallback: search for numbers over 50 that look like transactions
  if (!amount) {
    const genericMatch = text.match(/\b([\d,]{3,}(?:\.\d{2})?)\b/)
    if (genericMatch && genericMatch[1]) {
      const val = parseFloat(genericMatch[1].replace(/,/g, ''))
      if (val >= 50 && val <= 10000000) {
        amount = val
      }
    }
  }

  if (!amount || isNaN(amount) || amount <= 0) return null

  // 2. Extract Merchant / Note
  let merchant = ''

  // Pattern: "Desc: <merchant>" or "Merchant: <merchant>" or "to <merchant>" or "at <merchant>"
  const descMatch = text.match(/(?:desc|description|merchant|narration|details|for payment to|to|at)\s*[:|-]?\s*([A-Za-z0-9\s/._-]+?)(?:\s*(?:on|date|bal|ref|acct|available|\.|\n|$))/i)
  if (descMatch && descMatch[1]) {
    merchant = descMatch[1]
      .replace(/^(pos|trf|web|atm|nip|transfer to|payment to)\s*[/|-]?\s*/i, '')
      .replace(/[/_-]+/g, ' ')
      .trim()
  }

  if (!merchant || merchant.length < 2) {
    // Attempt fallback from words in alert
    const words = text.replace(/[\n\r]+/g, ' ').split(/\s+/)
    merchant = words.slice(0, 5).join(' ')
  }

  // Clean merchant text
  merchant = merchant.slice(0, 45).trim()
  if (!merchant) merchant = 'Bank Card Debit'

  // 3. Extract or default Date
  let date = new Date().toISOString()
  const dateMatch = text.match(/(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}-[A-Za-z]{3}-\d{2,4})/)
  if (dateMatch && dateMatch[1]) {
    try {
      const parsedD = new Date(dateMatch[1])
      if (!isNaN(parsedD.getTime())) {
        date = parsedD.toISOString()
      }
    } catch {
      // keep current date
    }
  }

  const category = inferCategory(text)
  const bankName = detectBankName(text)

  return {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    amount: Math.round(amount),
    category,
    note: merchant,
    date,
    bankName,
    rawText: text,
    confidence: amount && merchant ? 'high' : 'medium',
  }
}

/** Parses multiple bank alerts separated by newlines or paragraphs. */
export function parseBankAlertsBatch(text: string): ParsedAlertTransaction[] {
  if (!text.trim()) return []

  // Split by multiple newlines or common delimiter patterns
  const blocks = text.split(/\n\s*\n|(?=Txn:|Debit Alert:|Acct:|Kuda:|PalmPay:)/i)
  const results: ParsedAlertTransaction[] = []

  for (const block of blocks) {
    const parsed = parseSingleAlert(block)
    if (parsed) {
      results.push(parsed)
    }
  }

  // If split didn't yield multiple, try parsing as single
  if (results.length === 0) {
    const single = parseSingleAlert(text)
    if (single) results.push(single)
  }

  return results
}

/** Built-in realistic sample alerts for user testing. */
export const SAMPLE_BANK_ALERTS = [
  {
    title: 'OPay · Chicken Republic',
    text: 'Debit Alert: Your OPay Acct has been debited with NGN 2,800.00 for payment to CHICKEN REPUBLIC on 15-Aug-2026 13:30. Bal: NGN 14,500.00',
  },
  {
    title: 'GTBank · Bolt Ride',
    text: 'Txn: Debit | Amt: NGN 1,450.00 | Acc: 021****789 | Desc: TRF/BOLT RIDES/CAMPUS | Date: 15-Aug-2026 10:15 | Bal: NGN 32,100.00',
  },
  {
    title: 'Kuda · Shoprite Provisions',
    text: 'Kuda: You just spent ₦6,500.00 at Shoprite Ikeja City Mall on 15 Aug 2026. Available balance: ₦18,200.00',
  },
  {
    title: 'PalmPay · MTN Data Top-up',
    text: 'Debit Alert: NGN 2,000.00 has been debited from your PalmPay account for MTN 2.5GB Data bundle. Ref: PP20260815112',
  },
  {
    title: 'Zenith · Netflix Subscription',
    text: 'Acct: 200***456 | Dr: NGN 4,500.00 | Desc: WEB/NETFLIX.COM | Date: 15/08/2026 09:00 | Bal: ₦45,000.00',
  },
]
