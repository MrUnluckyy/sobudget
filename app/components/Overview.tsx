"use client"
import { useMemo } from 'react'
import { fmt, fmtShort, summaryForMonth, catBreakdown, txnsForMonth, toMonthKey, MONTHS, type BudgetState } from '../lib/data'
import { DonutChart, BarChart, AreaChart } from './Charts'

const card: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px #EBEBEB' }
const cardTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#888882', marginBottom: 18, letterSpacing: '0.04em', textTransform: 'uppercase' }

interface OverviewProps {
  data: BudgetState
  monthKey: string
  isMobile: boolean
}

export function Overview({ data, monthKey: mk, isMobile }: OverviewProps) {
  const { transactions: txns, categories, members, budgets } = data
  const { income, expense, net } = useMemo(() => summaryForMonth(txns, mk), [txns, mk])
  const breakdown = useMemo(() => catBreakdown(txns, mk, categories), [txns, mk, categories])
  const totalBudget = useMemo(() => Object.values(budgets).reduce((s, v) => s + v, 0), [budgets])

  const barData = useMemo(() => {
    const now = new Date(mk + '-01')
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i)
      const key = toMonthKey(d)
      const s = summaryForMonth(txns, key)
      return { label: MONTHS[d.getMonth()], ...s, isCurrent: key === mk }
    })
  }, [txns, mk])

  const balanceData = useMemo(() => {
    const now = new Date(mk + '-01')
    let bal = 0
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i)
      const key = toMonthKey(d)
      bal += summaryForMonth(txns, key).net
      return { label: MONTHS[d.getMonth()], value: bal }
    })
  }, [txns, mk])

  const expenseTotal = breakdown.reduce((s, c) => s + c.total, 0)
  const donutSegs = breakdown.map(c => ({ color: c.color, value: c.total }))

  const kpis = [
    { label: 'Income',    value: income,      color: 'oklch(45% 0.16 145)', bg: 'oklch(97% 0.04 145)' },
    { label: 'Expenses',  value: expense,     color: 'oklch(45% 0.16 25)',  bg: 'oklch(97% 0.04 25)'  },
    { label: 'Budgeted',  value: totalBudget, color: 'oklch(40% 0.12 255)', bg: 'oklch(97% 0.03 255)'  },
    { label: 'Saved',     value: net,
      color: net >= 0 ? 'oklch(35% 0.14 145)' : 'oklch(45% 0.16 25)',
      bg:    net >= 0 ? 'oklch(96% 0.04 145)' : 'oklch(97% 0.04 25)' },
  ]

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ borderRadius: 14, padding: '20px 22px', background: k.bg }}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, color: k.color }}>{fmt(k.value)}</div>
            <div style={{ fontSize: 12, color: '#888882', marginTop: 5, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Donut + member grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Spending by category */}
        <div style={card}>
          <div style={cardTitle}>Spending by Category</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <DonutChart segments={donutSegs} size={160} thickness={28} label={fmtShort(expenseTotal)} sublabel="SPENT" />
          </div>
          <div>
            {breakdown.map(c => {
              const budget = budgets[c.id] ?? 0
              const pct = budget > 0 ? Math.min(100, (c.total / budget) * 100) : 0
              const over = budget > 0 && c.total > budget
              return (
                <div key={c.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: c.color }} />
                    <span style={{ fontSize: 13, color: '#555551', flex: 1 }}>{c.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: over ? 'oklch(45% 0.16 25)' : '#1C1C1A', flexShrink: 0 }}>{fmt(c.total)}</span>
                    {budget > 0 && (
                      <span style={{ fontSize: 12, color: '#AAAAAA', flexShrink: 0 }}>/ {fmt(budget)}</span>
                    )}
                  </div>
                  {budget > 0 && (
                    <div style={{ marginLeft: 16, height: 3, background: '#F0F0EE', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, transition: 'width 0.4s ease', background: over ? 'oklch(58% 0.15 25)' : c.color }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* By family member */}
        <div style={card}>
          <div style={cardTitle}>By Family Member</div>
          {members.map(m => {
            const mTxns = txnsForMonth(txns, mk).filter(t => t.memberId === m.id)
            const mExp = mTxns.filter(t => !t.isIncome).reduce((s, t) => s + t.amount, 0)
            const mInc = mTxns.filter(t => t.isIncome).reduce((s, t) => s + t.amount, 0)
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #F5F5F3' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#F0F0EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, color: '#555551', flexShrink: 0 }}>
                  {m.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1A', marginBottom: 2 }}>{m.name}</div>
                  <div style={{ fontSize: 13, color: '#888882' }}>
                    {mInc > 0 && <span style={{ color: 'oklch(45% 0.16 145)' }}>+{fmt(mInc)} </span>}
                    <span style={{ color: 'oklch(45% 0.16 25)' }}>−{fmt(mExp)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={cardTitle}>Income vs Expenses — last 6 months</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          {[{ label: 'Income', color: 'oklch(58% 0.15 145)' }, { label: 'Expenses', color: 'oklch(58% 0.15 25)' }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888882' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: 'inline-block' }} />
              {l.label}
            </div>
          ))}
        </div>
        <BarChart data={barData} height={180} />
      </div>

      {/* Area chart */}
      <div style={card}>
        <div style={cardTitle}>Cumulative Balance — last 6 months</div>
        <AreaChart data={balanceData} height={130} />
      </div>
    </div>
  )
}
