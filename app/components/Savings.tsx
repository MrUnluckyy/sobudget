"use client"
import { useState, useMemo } from 'react'
import {
  fmt, fmtShort, txnsForMonth, toDateKey, monthLabel,
  SAVINGS_BUCKETS, savingsBuckets, bucketTotals, savingsGoalKey, savingsOpenKey,
  type BudgetState, type Transaction, type Category,
} from '../lib/data'

const card: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px #EBEBEB' }
const cardTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#888882', marginBottom: 18, letterSpacing: '0.04em', textTransform: 'uppercase' }

const GREEN = 'oklch(48% 0.16 145)'
const AMBER = 'oklch(55% 0.15 60)'

interface SavingsProps {
  data: BudgetState
  monthKey: string
  isMobile: boolean
  defaultMemberId?: string
  onAdd: (txn: Transaction) => void
  onDelete: (id: string) => void
  onUpdateMeta: (key: string, val: number) => void
}

type Mode = 'deposit' | 'withdraw'

const CANON = new Set(SAVINGS_BUCKETS.map(b => b.id))

export function Savings({ data, monthKey: mk, isMobile, defaultMemberId, onAdd, onDelete, onUpdateMeta }: SavingsProps) {
  const { transactions: txns, categories, members, budgets } = data

  // Canonical buckets first, then any legacy savings category that still has activity.
  const buckets = useMemo<Category[]>(() => {
    const legacy = savingsBuckets(categories).filter(b =>
      !CANON.has(b.id) && (
        txns.some(t => t.categoryId === b.id) ||
        (budgets[savingsOpenKey(b.id)] ?? 0) !== 0 ||
        (budgets[savingsGoalKey(b.id)] ?? 0) !== 0
      )
    )
    return [...SAVINGS_BUCKETS, ...legacy]
  }, [categories, txns, budgets])

  const bucketIds = useMemo(() => new Set(buckets.map(b => b.id)), [buckets])

  const rows = useMemo(() => buckets.map(b => {
    const opening = budgets[savingsOpenKey(b.id)] ?? 0
    const goal = budgets[savingsGoalKey(b.id)] ?? 0
    const t = bucketTotals(txns, b.id, opening)
    return { bucket: b, opening, goal, ...t }
  }), [buckets, budgets, txns])

  const totalBalance = rows.reduce((s, r) => s + r.balance, 0)
  const totalGoal = rows.reduce((s, r) => s + r.goal, 0)

  const monthTxns = useMemo(() => txnsForMonth(txns, mk), [txns, mk])
  const monthDep = monthTxns.filter(t => bucketIds.has(t.categoryId) && !t.isIncome).reduce((s, t) => s + t.amount, 0)
  const monthWdr = monthTxns.filter(t => bucketIds.has(t.categoryId) && t.isIncome).reduce((s, t) => s + t.amount, 0)

  const history = useMemo(
    () => txns.filter(t => bucketIds.has(t.categoryId)).slice().sort((a, b) => b.date.localeCompare(a.date)),
    [txns, bucketIds]
  )

  // ── Add form ──
  const [bucketId, setBucketId] = useState(buckets[0]?.id ?? 'sav_emergency')
  const [mode, setMode] = useState<Mode>('deposit')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [edits, setEdits] = useState<Record<string, string>>({})

  const submit = () => {
    const n = parseFloat(amount.replace(',', '.'))
    if (isNaN(n) || n <= 0) return
    const isWithdraw = mode === 'withdraw'
    const bucket = buckets.find(b => b.id === bucketId)
    onAdd({
      id: Date.now().toString(),
      date: toDateKey(new Date()),
      description: note.trim() || `${bucket?.name ?? 'Savings'} ${isWithdraw ? 'withdrawal' : 'deposit'}`,
      amount: n,
      isIncome: isWithdraw,
      categoryId: bucketId,
      memberId: defaultMemberId ?? members[0]?.id ?? 'me',
    })
    setAmount('')
    setNote('')
  }

  const commitMeta = (key: string, raw: string) => {
    onUpdateMeta(key, parseFloat(raw) || 0)
    setEdits(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const isDeposit = mode === 'deposit'
  const accent = isDeposit ? GREEN : AMBER
  const overallPct = totalGoal > 0 ? Math.min(100, (totalBalance / totalGoal) * 100) : 0

  return (
    <div>
      {/* Hero */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={cardTitle}>Total savings</div>
        <div style={{ fontSize: isMobile ? 38 : 46, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: totalBalance >= 0 ? '#1C1C1A' : 'oklch(48% 0.16 25)' }}>
          {fmt(totalBalance)}
        </div>
        {totalGoal > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 6, background: '#F0F0EE', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${overallPct}%`, borderRadius: 3, background: GREEN, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: 12, color: '#888882', marginTop: 6 }}>
              {Math.round(overallPct)}% of {fmt(totalGoal)} total goal
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 22, marginTop: 18, flexWrap: 'wrap' }}>
          <Stat label={`Deposited · ${monthLabel(mk)}`} value={`+${fmt(monthDep)}`} color={GREEN} />
          <Stat label={`Withdrawn · ${monthLabel(mk)}`} value={`−${fmt(monthWdr)}`} color={AMBER} />
        </div>
      </div>

      {/* Add deposit / withdraw */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', background: '#F2F2F0', borderRadius: 10, padding: 3 }}>
            {(['deposit', 'withdraw'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  border: 'none', borderRadius: 8, padding: '7px 18px', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em',
                  fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', transition: 'all 0.15s',
                  background: mode === m ? '#fff' : 'transparent',
                  color: mode === m ? '#1C1C1A' : '#888882',
                  boxShadow: mode === m ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {m === 'deposit' ? 'Deposit' : 'Withdraw'}
              </button>
            ))}
          </div>
          <select
            value={bucketId}
            onChange={e => setBucketId(e.target.value)}
            className="budget-input"
            style={{ border: '1px solid #E0E0DC', borderRadius: 10, padding: '9px 12px', fontSize: 14, outline: 'none', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: '#1C1C1A', background: '#fff', cursor: 'pointer' }}
          >
            {buckets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #E0E0DC', borderRadius: 10, padding: '0 12px', flex: isMobile ? '1 1 100%' : '0 0 150px' }}>
            <span style={{ color: '#AAAAAA', fontSize: 16 }}>€</span>
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              inputMode="decimal"
              placeholder="0.00"
              className="budget-input"
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: 17, padding: '11px 0', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: '#1C1C1A', background: 'transparent' }}
            />
          </div>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder={isDeposit ? 'Note (e.g. monthly transfer)' : 'Note (e.g. car repair)'}
            className="budget-input"
            style={{ flex: 1, minWidth: isMobile ? '100%' : 0, border: '1px solid #E0E0DC', borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: '#1C1C1A', background: '#fff' }}
          />
          <button
            onClick={submit}
            disabled={!amount}
            style={{
              flexShrink: 0, border: 'none', borderRadius: 10, padding: '12px 22px',
              fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
              fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
              cursor: amount ? 'pointer' : 'default', transition: 'all 0.15s',
              background: amount ? accent : '#E8E8E4',
              color: amount ? '#fff' : '#AAAAAA',
            }}
          >
            {isDeposit ? 'Add deposit' : 'Take out'}
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#AAAAAA', marginTop: 12, lineHeight: 1.5 }}>
          {isDeposit
            ? 'Moves money into the bucket (counts as an outflow this month).'
            : 'Pulls money out of the bucket (counts as inflow this month — pair it with the expense you spent it on so the month nets out).'}
        </div>
      </div>

      {/* Bucket cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 16 }}>
        {rows.map(({ bucket: b, opening, goal, balance, deposited, withdrawn }) => {
          const pct = goal > 0 ? Math.min(100, (balance / goal) * 100) : 0
          const reached = goal > 0 && balance >= goal
          const goalKey = savingsGoalKey(b.id)
          const openKey = savingsOpenKey(b.id)
          const selected = bucketId === b.id
          return (
            <div
              key={b.id}
              onClick={() => setBucketId(b.id)}
              style={{ ...card, padding: '18px 20px', cursor: 'pointer', boxShadow: selected ? `0 1px 3px rgba(0,0,0,0.05), 0 0 0 1.5px ${b.color}` : '0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px #EBEBEB' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: b.color }} />
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1A', flex: 1 }}>{b.name}</span>
                <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: '#1C1C1A' }}>{fmt(balance)}</span>
              </div>

              {goal > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ height: 6, background: '#F0F0EE', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: reached ? GREEN : b.color, transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ fontSize: 12, color: reached ? GREEN : '#888882', marginTop: 5, fontWeight: reached ? 600 : 400 }}>
                    {reached ? `Goal reached · ${fmtShort(goal)}` : `${Math.round(pct)}% of ${fmt(goal)} · ${fmt(goal - balance)} to go`}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#888882', marginBottom: 12 }}>
                <span><span style={{ color: GREEN }}>+{fmtShort(deposited)}</span> in</span>
                <span><span style={{ color: AMBER }}>−{fmtShort(withdrawn)}</span> out</span>
              </div>

              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 14, flexWrap: 'wrap', borderTop: '1px solid #F2F2F0', paddingTop: 12 }}>
                <MetaInput
                  label="Goal" prefix="€"
                  value={edits[goalKey] ?? (goal ? String(goal) : '')}
                  onChange={v => setEdits(p => ({ ...p, [goalKey]: v }))}
                  onCommit={v => commitMeta(goalKey, v)}
                />
                <MetaInput
                  label="Opening" prefix="€"
                  value={edits[openKey] ?? (opening ? String(opening) : '')}
                  onChange={v => setEdits(p => ({ ...p, [openKey]: v }))}
                  onCommit={v => commitMeta(openKey, v)}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* History */}
      <div style={card}>
        <div style={cardTitle}>Savings history</div>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#AAAAAA', padding: '40px 0', fontSize: 14 }}>No savings activity yet</div>
        ) : (
          history.map(t => {
            const bucket = buckets.find(b => b.id === t.categoryId)
            const mem = members.find(m => m.id === t.memberId)
            const d = new Date(t.date + 'T00:00:00')
            return (
              <div key={t.id} className="txn-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #F5F5F3' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: bucket?.color ?? '#ccc' }} />
                <div style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1C1C1A', lineHeight: 1.3 }}>{t.description}</span>
                  <span style={{ display: 'block', fontSize: 12, color: '#AAAAAA', marginTop: 1 }}>
                    {bucket?.name ?? 'Savings'} · {t.isIncome ? 'Withdrawal' : 'Deposit'} · {mem?.name} · {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', flexShrink: 0, color: t.isIncome ? AMBER : GREEN }}>
                  {t.isIncome ? '−' : '+'}{fmt(t.amount)}
                </span>
                <button onClick={() => onDelete(t.id)} className="del-btn" style={{ background: 'none', border: 'none', color: '#CCCCCC', fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1, opacity: 0, transition: 'opacity 0.15s', fontFamily: 'monospace' }}>
                  ×
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color = '#1C1C1A' }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#888882', marginTop: 3, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

function MetaInput({ label, prefix, value, onChange, onCommit }: { label: string; prefix: string; value: string; onChange: (v: string) => void; onCommit: (v: string) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 12, color: '#AAAAAA' }}>{label}</span>
      <span style={{ fontSize: 12, color: '#888882' }}>{prefix}</span>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={e => onCommit(e.target.value)}
        className="budget-input"
        placeholder="0"
        style={{ width: 78, border: '1px solid #E0E0DC', borderRadius: 7, padding: '6px 8px', fontSize: 13, textAlign: 'right', outline: 'none', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: '#1C1C1A' }}
      />
    </label>
  )
}
