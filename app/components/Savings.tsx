"use client"
import { useState, useMemo } from 'react'
import {
  fmt, txnsForMonth, savingsTxns, savingsTotals, toDateKey, monthLabel,
  SAVINGS_CATEGORY_ID, type BudgetState, type Transaction,
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
  openingBalance: number
  onUpdateOpening: (val: number) => void
  onAdd: (txn: Transaction) => void
  onDelete: (id: string) => void
}

type Mode = 'deposit' | 'withdraw'

export function Savings({ data, monthKey: mk, isMobile, defaultMemberId, openingBalance, onUpdateOpening, onAdd, onDelete }: SavingsProps) {
  const { transactions: txns, members } = data

  const totals = useMemo(() => savingsTotals(txns, openingBalance), [txns, openingBalance])
  const month = useMemo(() => savingsTotals(txnsForMonth(txns, mk), 0), [txns, mk])
  const history = useMemo(
    () => savingsTxns(txns).slice().sort((a, b) => b.date.localeCompare(a.date)),
    [txns]
  )

  const [mode, setMode] = useState<Mode>('deposit')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [openingEdit, setOpeningEdit] = useState<string | null>(null)

  const submit = () => {
    const n = parseFloat(amount.replace(',', '.'))
    if (isNaN(n) || n <= 0) return
    const isWithdraw = mode === 'withdraw'
    onAdd({
      id: Date.now().toString(),
      date: toDateKey(new Date()),
      description: note.trim() || (isWithdraw ? 'Withdrawal' : 'Deposit'),
      amount: n,
      isIncome: isWithdraw,
      categoryId: SAVINGS_CATEGORY_ID,
      memberId: defaultMemberId ?? members[0]?.id ?? 'me',
    })
    setAmount('')
    setNote('')
  }

  const isDeposit = mode === 'deposit'
  const accent = isDeposit ? GREEN : AMBER

  return (
    <div>
      {/* Balance hero */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={cardTitle}>Savings balance</div>
        <div style={{ fontSize: isMobile ? 38 : 46, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: totals.balance >= 0 ? '#1C1C1A' : 'oklch(48% 0.16 25)' }}>
          {fmt(totals.balance)}
        </div>
        <div style={{ display: 'flex', gap: 22, marginTop: 18, flexWrap: 'wrap' }}>
          <Stat label="Opening" value={fmt(openingBalance)} />
          <Stat label="Deposited" value={`+${fmt(totals.deposited)}`} color={GREEN} />
          <Stat label="Withdrawn" value={`−${fmt(totals.withdrawn)}`} color={AMBER} />
        </div>
      </div>

      {/* This month */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={cardTitle}>{monthLabel(mk)}</div>
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          <Stat label="Deposited this month" value={`+${fmt(month.deposited)}`} color={GREEN} />
          <Stat label="Withdrawn this month" value={`−${fmt(month.withdrawn)}`} color={AMBER} />
          <Stat
            label="Net change"
            value={`${month.balance >= 0 ? '+' : ''}${fmt(month.balance)}`}
            color={month.balance >= 0 ? GREEN : AMBER}
          />
        </div>
      </div>

      {/* Deposit / withdraw */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'inline-flex', background: '#F2F2F0', borderRadius: 10, padding: 3, marginBottom: 16 }}>
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
            ? 'Moves money into your savings pot (counts as an outflow this month).'
            : 'Pulls money out of savings (counts as inflow this month — pair it with the expense you spent it on so the month nets out).'}
        </div>
      </div>

      {/* Opening balance */}
      <div style={{ ...card, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1A', marginBottom: 2 }}>Opening balance</div>
          <div style={{ fontSize: 12, color: '#888882', lineHeight: 1.5 }}>What you had saved before tracking started. Added on top of logged deposits and withdrawals.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, color: '#888882' }}>€</span>
          <input
            type="number"
            value={openingEdit ?? String(openingBalance)}
            onChange={e => setOpeningEdit(e.target.value)}
            onBlur={e => {
              onUpdateOpening(parseFloat(e.target.value) || 0)
              setOpeningEdit(null)
            }}
            className="budget-input"
            style={{ width: 110, border: '1px solid #E0E0DC', borderRadius: 8, padding: '8px 10px', fontSize: 14, textAlign: 'right', outline: 'none', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: '#1C1C1A' }}
            placeholder="0"
          />
        </div>
      </div>

      {/* History */}
      <div style={card}>
        <div style={cardTitle}>Savings history</div>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#AAAAAA', padding: '40px 0', fontSize: 14 }}>No savings activity yet</div>
        ) : (
          history.map(t => {
            const mem = members.find(m => m.id === t.memberId)
            const d = new Date(t.date + 'T00:00:00')
            return (
              <div key={t.id} className="txn-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #F5F5F3' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: t.isIncome ? AMBER : GREEN }} />
                <div style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1C1C1A', lineHeight: 1.3 }}>{t.description}</span>
                  <span style={{ display: 'block', fontSize: 12, color: '#AAAAAA', marginTop: 1 }}>
                    {t.isIncome ? 'Withdrawal' : 'Deposit'} · {mem?.name} · {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
