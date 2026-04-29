"use client"
import { useState, useMemo } from 'react'
import { fmt, txnsForMonth, type BudgetState } from '../lib/data'

interface TransactionsProps {
  data: BudgetState
  monthKey: string
  onDelete: (id: string) => void
}

export function Transactions({ data, monthKey: mk, onDelete }: TransactionsProps) {
  const { transactions: txns, categories, members } = data
  const [search, setSearch] = useState('')
  const [filterMember, setFilterMember] = useState('all')

  const monthTxns = useMemo(() => txnsForMonth(txns, mk), [txns, mk])

  const filtered = useMemo(() => monthTxns.filter(t => {
    const s = search.toLowerCase()
    const matchSearch = !s || t.description.toLowerCase().includes(s) ||
      categories.find(c => c.id === t.categoryId)?.name.toLowerCase().includes(s)
    const matchMember = filterMember === 'all' || t.memberId === filterMember
    return matchSearch && matchMember
  }), [monthTxns, search, filterMember, categories])

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {}
    for (const t of filtered) {
      if (!map[t.date]) map[t.date] = []
      map[t.date].push(t)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const memberFilters = [{ id: 'all', name: 'All' }, ...members]

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search transactions…"
          className="budget-input"
          style={{ flex: 1, minWidth: 160, border: '1px solid #E0E0DC', borderRadius: 10, padding: '9px 14px', fontSize: 14, fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', outline: 'none', color: '#1C1C1A', background: '#fff' }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {memberFilters.map(m => (
            <button
              key={m.id}
              onClick={() => setFilterMember(m.id)}
              style={{
                border: filterMember === m.id ? '1px solid #1C1C1A' : '1px solid #E0E0DC',
                borderRadius: 8, padding: '8px 14px', fontSize: 13,
                cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                fontWeight: 500, transition: 'all 0.15s',
                background: filterMember === m.id ? '#1C1C1A' : 'transparent',
                color: filterMember === m.id ? '#fff' : '#888882',
              }}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {grouped.length === 0 && (
        <div style={{ textAlign: 'center', color: '#AAAAAA', padding: '60px 0', fontSize: 15 }}>
          No transactions found
        </div>
      )}

      {grouped.map(([date, items]) => {
        const d = new Date(date + 'T00:00:00')
        const dayInc = items.filter(t => t.isIncome).reduce((s, t) => s + t.amount, 0)
        const dayExp = items.filter(t => !t.isIncome).reduce((s, t) => s + t.amount, 0)
        return (
          <div key={date} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #F0F0EE' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#888882', flex: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              {dayInc > 0 && <span style={{ color: 'oklch(45% 0.16 145)', fontSize: 12, fontWeight: 600 }}>+{fmt(dayInc)}</span>}
              {dayExp > 0 && <span style={{ color: 'oklch(45% 0.16 25)', fontSize: 12, fontWeight: 600 }}>−{fmt(dayExp)}</span>}
            </div>
            {items.map(t => {
              const cat = categories.find(c => c.id === t.categoryId)
              const mem = members.find(m => m.id === t.memberId)
              return (
                <div key={t.id} className="txn-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #F8F8F6', position: 'relative' }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: cat?.color ?? '#ccc' }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1C1C1A', lineHeight: 1.3 }}>{t.description}</span>
                    <span style={{ display: 'block', fontSize: 12, color: '#AAAAAA', marginTop: 1 }}>{cat?.name} · {mem?.name}</span>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', flexShrink: 0, color: t.isIncome ? 'oklch(45% 0.16 145)' : '#1C1C1A' }}>
                    {t.isIncome ? '+' : '−'}{fmt(t.amount)}
                  </span>
                  <button onClick={() => onDelete(t.id)} className="del-btn" style={{ background: 'none', border: 'none', color: '#CCCCCC', fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1, opacity: 0, transition: 'opacity 0.15s', fontFamily: 'monospace' }}>
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
