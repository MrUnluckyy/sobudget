export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  isIncome: boolean
  categoryId: string
  memberId: string
}

export interface Category {
  id: string
  name: string
  color: string
  type: 'income' | 'expense' | 'savings'
}

export interface Member {
  id: string
  name: string
}

export interface BudgetState {
  transactions: Transaction[]
  categories: Category[]
  members: Member[]
  budgets: Record<string, number>
}

export interface ParsedEntry {
  amount: number | null
  isIncome: boolean
  memberId: string
  categoryId: string | undefined
  description: string
  valid: boolean
}

const INCOME_HINTS = ['salary','wage','paycheck','income','freelance','dividend','bonus','revenue','interest','pension','refund','reimbursement']

const CATEGORY_HINTS: Record<string, string[]> = {
  groceries:     ['grocery','groceries','supermarket','lidl','aldi','rimi','maxima','market','produce'],
  housing:       ['rent','mortgage','maintenance','furniture','home','repair','renovation','ikea'],
  health:        ['doctor','pharmacy','medicine','dentist','hospital','optical','therapy','clinic','gym','fitness','sport','wellness','massage'],
  family:        ['family','birthday','anniversary','kids','school','kindergarten','daycare','child'],
  personal:      ['haircut','hair','salon','beauty','clothes','clothing','shoes','jacket','shirt','dress','fashion','zara','hm','mango','personal'],
  pets:          ['pet','dog','cat','vet','veterinary','petfood','animal','aquarium'],
  transport:     ['bus','train','taxi','uber','lyft','bolt','fuel','petrol','parking','metro','tram','flight','ticket','car'],
  dining:        ['restaurant','cafe','coffee','lunch','dinner','pizza','bakery','takeout','takeaway','snack','bar','pub','brunch'],
  savings:       ['savings','saving','invest','investment','etf','stocks'],
  house_loan:    ['house loan','homeloan','mortgage payment'],
  baby:          ['baby','diaper','formula','stroller','nappy','infant','toddler'],
  car_loan:      ['car loan','carloan','auto loan','vehicle loan','leasing'],
  gifts:         ['gift','present','flowers','bouquet','card'],
  subscriptions: ['netflix','spotify','apple','google','youtube','hbo','disney','amazon prime','subscription','adobe','software'],
  utilities:     ['electricity','gas','water','internet','phone','mobile','utility','bill','heating'],
  salary:        ['salary','wage','paycheck','income','freelance','dividend','bonus','revenue','interest','pension'],
}

function parseAmount(str: string): number | null {
  let s = str.trim().replace(/[€$£]/g, '')
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
  s = s.replace(/\s/g, '')
  if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) || n <= 0 ? null : n
}

export function parseEntry(text: string, categories: Category[], members: Member[], defaultMemberId?: string): ParsedEntry {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) {
    return { amount: null, isIncome: false, memberId: members[0]?.id ?? 'me', categoryId: undefined, description: 'Transaction', valid: false }
  }

  let amount: number | null = null
  let isIncome = false
  let memberId: string | null = null
  let categoryId: string | undefined
  const descParts: string[] = []

  for (const token of tokens) {
    const num = parseAmount(token)
    if (num !== null && amount === null) { amount = num; continue }
    const lower = token.toLowerCase().replace(/[€$£+]/g, '')
    if (['income', '+'].includes(lower)) { isIncome = true; continue }
    const mMatch = members.find(m => m.name.toLowerCase() === lower)
    if (mMatch) { memberId = mMatch.id; continue }
    const cMatch = categories.find(c =>
      c.name.toLowerCase() === lower || c.id === lower ||
      c.name.toLowerCase().replace(/[^a-z]/g, '') === lower.replace(/[^a-z]/g, '')
    )
    if (cMatch) { categoryId = cMatch.id; continue }
    if (lower) descParts.push(token)
  }

  const description = descParts.join(' ') || 'Transaction'
  const descLower = description.toLowerCase()

  if (!isIncome && INCOME_HINTS.some(k => descLower.includes(k))) isIncome = true

  if (!categoryId) {
    for (const [cId, hints] of Object.entries(CATEGORY_HINTS)) {
      if (hints.some(h => descLower.includes(h))) {
        const cat = categories.find(c => c.id === cId)
        if (cat) { categoryId = cId; break }
      }
    }
  }
  if (!categoryId) {
    if (isIncome) categoryId = categories.find(c => c.type === 'income')?.id
    categoryId = categoryId ?? categories.find(c => c.type === 'expense')?.id ?? categories[0]?.id
  }

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return {
    amount,
    isIncome,
    memberId: memberId ?? defaultMemberId ?? members[0]?.id ?? 'me',
    categoryId,
    description: cap(description),
    valid: amount !== null,
  }
}

export const SAVINGS_BUCKETS: Category[] = [
  { id: 'sav_emergency',   name: 'Emergency',      color: 'oklch(62% 0.15 35)',  type: 'savings' },
  { id: 'sav_holidays',    name: 'Holidays',       color: 'oklch(66% 0.13 200)', type: 'savings' },
  { id: 'sav_opportunity', name: 'Opportunity',    color: 'oklch(62% 0.15 290)', type: 'savings' },
  { id: 'sav_gifts',       name: 'Gifts',          color: 'oklch(67% 0.14 350)', type: 'savings' },
  { id: 'sav_house',       name: 'House Upgrades', color: 'oklch(60% 0.13 250)', type: 'savings' },
  { id: 'sav_investments', name: 'Investments',    color: 'oklch(60% 0.16 150)', type: 'savings' },
]

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'groceries',     name: 'Groceries',              color: 'oklch(65% 0.15 145)', type: 'expense' },
  { id: 'housing',       name: 'Housing',                color: 'oklch(62% 0.14 245)', type: 'expense' },
  { id: 'health',        name: 'Health & Wellness',      color: 'oklch(64% 0.14 25)',  type: 'expense' },
  { id: 'family',        name: 'Family & Relationships', color: 'oklch(65% 0.14 310)', type: 'expense' },
  { id: 'personal',      name: 'Personal',               color: 'oklch(65% 0.13 280)', type: 'expense' },
  { id: 'pets',          name: 'Pets',                   color: 'oklch(68% 0.15 75)',  type: 'expense' },
  { id: 'transport',     name: 'Transportation',         color: 'oklch(68% 0.14 210)', type: 'expense' },
  { id: 'dining',        name: 'Food & Dining',          color: 'oklch(68% 0.15 60)',  type: 'expense' },
  { id: 'savings',       name: 'Savings',                color: 'oklch(62% 0.16 155)', type: 'savings' },
  ...SAVINGS_BUCKETS,
  { id: 'house_loan',    name: 'House Loan',             color: 'oklch(58% 0.14 255)', type: 'expense' },
  { id: 'baby',          name: 'Baby',                   color: 'oklch(68% 0.13 355)', type: 'expense' },
  { id: 'car_loan',      name: 'Car Loan',               color: 'oklch(58% 0.10 230)', type: 'expense' },
  { id: 'gifts',         name: 'Gifts',                  color: 'oklch(67% 0.14 340)', type: 'expense' },
  { id: 'subscriptions', name: 'Subscriptions',          color: 'oklch(65% 0.14 295)', type: 'expense' },
  { id: 'utilities',     name: 'Utilities',              color: 'oklch(65% 0.12 95)',  type: 'expense' },
  { id: 'salary',        name: 'Salary / Income',        color: 'oklch(58% 0.16 145)', type: 'income'  },
]

export const DEFAULT_MEMBERS: Member[] = [
  { id: 'me',      name: 'Justas'    },
  { id: 'partner', name: 'Kornelija' },
]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateSampleData(): Transaction[] {
  const base = new Date(2026, 3, 27)
  const txns: Transaction[] = []
  let id = 1
  const add = (daysBack: number, desc: string, amount: number, isIncome: boolean, catId: string, memberId: string) => {
    const d = new Date(base)
    d.setDate(d.getDate() - daysBack)
    txns.push({ id: String(id++), date: d.toISOString().slice(0, 10), description: desc, amount, isIncome, categoryId: catId, memberId })
  }

  add(0,  'Coffee',            3.80,    false, 'food',          'me')
  add(1,  'Groceries',        67.40,    false, 'food',          'partner')
  add(2,  'Netflix',          15.99,    false, 'entertainment', 'me')
  add(3,  'Metro pass',       22.00,    false, 'transport',     'me')
  add(4,  'Pharmacy',         18.50,    false, 'health',        'partner')
  add(5,  'Salary',         3200.00,    true,  'salary',        'me')
  add(5,  'Salary',         2800.00,    true,  'salary',        'partner')
  add(6,  'Rent',           1200.00,    false, 'housing',       'me')
  add(7,  'Dinner',           48.00,    false, 'food',          'me')
  add(8,  'Electricity',      82.00,    false, 'housing',       'partner')
  add(9,  'Gym',              45.00,    false, 'health',        'me')
  add(10, 'Spotify',           9.99,    false, 'entertainment', 'partner')
  add(11, 'Bakery',            6.20,    false, 'food',          'me')
  add(12, 'Fuel',             55.00,    false, 'transport',     'partner')
  add(15, 'Freelance bonus', 500.00,    true,  'salary',        'me')
  add(18, 'Supermarket',      91.30,    false, 'food',          'partner')
  add(19, 'New jacket',       89.00,    false, 'clothing',      'partner')
  add(20, 'Internet bill',    39.99,    false, 'housing',       'me')
  add(22, 'Doctor visit',     30.00,    false, 'health',        'partner')
  add(25, 'Cinema',           24.00,    false, 'entertainment', 'me')

  add(30, 'Salary',         3200.00,    true,  'salary',        'me')
  add(30, 'Salary',         2800.00,    true,  'salary',        'partner')
  add(31, 'Rent',           1200.00,    false, 'housing',       'me')
  add(32, 'Groceries',        75.00,    false, 'food',          'partner')
  add(33, 'Metro pass',       20.00,    false, 'transport',     'me')
  add(34, 'Netflix',          15.99,    false, 'entertainment', 'me')
  add(35, 'Pharmacy',         25.00,    false, 'health',        'partner')
  add(36, 'Restaurant',       55.00,    false, 'food',          'me')
  add(37, 'Electricity',      90.00,    false, 'housing',       'partner')
  add(38, 'Gym',              45.00,    false, 'health',        'me')
  add(40, 'Groceries',        62.00,    false, 'food',          'me')
  add(42, 'Fuel',             58.00,    false, 'transport',     'partner')
  add(44, 'Shoes',            75.00,    false, 'clothing',      'me')
  add(45, 'Spotify',           9.99,    false, 'entertainment', 'partner')

  add(58, 'Salary',         3200.00,    true,  'salary',        'me')
  add(58, 'Salary',         2800.00,    true,  'salary',        'partner')
  add(59, 'Rent',           1200.00,    false, 'housing',       'me')
  add(60, 'Groceries',        80.00,    false, 'food',          'partner')
  add(61, 'Gym',              45.00,    false, 'health',        'me')
  add(62, 'Electricity',      95.00,    false, 'housing',       'partner')
  add(63, 'Restaurant',       42.00,    false, 'food',          'me')
  add(65, 'Metro pass',       20.00,    false, 'transport',     'me')
  add(66, 'Clothes',         110.00,    false, 'clothing',      'partner')
  add(67, 'Netflix',          15.99,    false, 'entertainment', 'me')
  add(68, 'Spotify',           9.99,    false, 'entertainment', 'partner')

  add(88,  'Salary',        3200.00,    true,  'salary',        'me')
  add(88,  'Salary',        2800.00,    true,  'salary',        'partner')
  add(89,  'Rent',          1200.00,    false, 'housing',       'me')
  add(90,  'Groceries',       85.00,    false, 'food',          'partner')
  add(91,  'Gym',             45.00,    false, 'health',        'me')
  add(92,  'Electricity',    102.00,    false, 'housing',       'partner')
  add(93,  'Fuel',            50.00,    false, 'transport',     'partner')
  add(95,  'Restaurant',      38.00,    false, 'food',          'me')
  add(96,  'Netflix',         15.99,    false, 'entertainment', 'me')
  add(97,  'Spotify',          9.99,    false, 'entertainment', 'partner')
  add(100, 'New Year bonus', 400.00,    true,  'salary',        'me')

  add(118, 'Salary',        3200.00,    true,  'salary',        'me')
  add(118, 'Salary',        2800.00,    true,  'salary',        'partner')
  add(119, 'Rent',          1200.00,    false, 'housing',       'me')
  add(120, 'Groceries',      120.00,    false, 'food',          'partner')
  add(121, 'Gym',             45.00,    false, 'health',        'me')
  add(122, 'Electricity',    115.00,    false, 'housing',       'partner')
  add(123, 'Christmas gifts',280.00,    false, 'clothing',      'me')
  add(124, 'Restaurant',      90.00,    false, 'food',          'me')
  add(125, 'Transport',       30.00,    false, 'transport',     'partner')
  add(126, 'Christmas bonus',600.00,    true,  'salary',        'me')

  return txns.sort((a, b) => b.date.localeCompare(a.date))
}

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export const fmt = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

export const fmtShort = (n: number) =>
  n >= 1000 ? `€${(n / 1000).toFixed(1)}k` : `€${n.toFixed(0)}`

export function toMonthKey(d: Date): string {
  // Use local date components — toISOString() converts to UTC, which shifts
  // first-of-month dates back a month in timezones ahead of UTC (e.g. UTC+2/+3),
  // breaking month navigation and chart month keys.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function toDateKey(d: Date): string {
  // Local YYYY-MM-DD — avoids the UTC shift that toISOString() introduces.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  return `${MONTHS[parseInt(m) - 1]} ${y}`
}

export function txnsForMonth(txns: Transaction[], key: string): Transaction[] {
  return txns.filter(t => t.date.startsWith(key))
}

export function summaryForMonth(txns: Transaction[], key: string) {
  const month = txnsForMonth(txns, key)
  const income  = month.filter(t => t.isIncome).reduce((s, t) => s + t.amount, 0)
  const expense = month.filter(t => !t.isIncome).reduce((s, t) => s + t.amount, 0)
  return { income, expense, net: income - expense }
}

// ─── Savings ──────────────────────────────────────────────────────────────────
// Savings is split into named buckets, each its own `type: 'savings'` category.
// A deposit is an expense tagged with the bucket id (money leaving monthly cash
// flow into the pot); a withdrawal is income tagged with the bucket id (money
// coming back out). Per-bucket goal and opening balance are persisted in the
// budgets table under namespaced keys, so no schema change is needed.
export const SAVINGS_CATEGORY_ID = 'savings' // legacy single bucket (kept for old data)

export const savingsGoalKey = (bucketId: string) => `savgoal:${bucketId}`
export const savingsOpenKey = (bucketId: string) => `savopen:${bucketId}`

export function savingsBuckets(categories: Category[]): Category[] {
  return categories.filter(c => c.type === 'savings')
}

export function bucketTotals(txns: Transaction[], bucketId: string, opening = 0) {
  const b = txns.filter(t => t.categoryId === bucketId)
  const deposited = b.filter(t => !t.isIncome).reduce((s, t) => s + t.amount, 0)
  const withdrawn = b.filter(t => t.isIncome).reduce((s, t) => s + t.amount, 0)
  return { deposited, withdrawn, balance: opening + deposited - withdrawn }
}

export function catBreakdown(txns: Transaction[], key: string, categories: Category[]) {
  const month = txnsForMonth(txns, key).filter(t => !t.isIncome)
  const map: Record<string, number> = {}
  for (const t of month) {
    map[t.categoryId] = (map[t.categoryId] ?? 0) + t.amount
  }
  return categories
    .filter(c => c.type === 'expense')
    .map(c => ({ ...c, total: map[c.id] ?? 0 }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
}
