"use client"
import { useState, useMemo } from 'react'
import { fmt, catBreakdown, type BudgetState } from '../lib/data'

interface BudgetViewProps {
  data: BudgetState
  monthKey: string
  onUpdateBudget: (catId: string, val: number) => void
}

export function BudgetView({ data, monthKey: mk, onUpdateBudget }: BudgetViewProps) {
  const { transactions: txns, categories, budgets } = data
  const breakdown = useMemo(() => catBreakdown(txns, mk, categories), [txns, mk, categories])
  const [editing, setEditing] = useState<Record<string, string>>({})

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: '#888882', lineHeight: 1.5 }}>
          Set monthly budget targets per category and track progress.
        </div>
      </div>

      {categories.filter(c => c.type === 'expense').map(cat => {
        const spent = breakdown.find(b => b.id === cat.id)?.total ?? 0
        const budget = budgets[cat.id] ?? 0
        const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0
        const over = budget > 0 && spent > budget
        const editVal = editing[cat.id] ?? String(budget)

        return (
          <div key={cat.id} style={{ display: 'flex', gap: 16, background: '#fff', borderRadius: 14, padding: '18px 20px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px #EBEBEB', alignItems: 'flex-start' }}>
            <div style={{ width: 4, borderRadius: 2, minHeight: 60, flexShrink: 0, alignSelf: 'stretch', background: cat.color }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1A' }}>{cat.name}</span>
                <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: over ? 'oklch(45% 0.16 25)' : '#1C1C1A' }}>
                  {fmt(spent)}
                  {budget > 0 && <span style={{ fontSize: 13, fontWeight: 400, color: '#888882' }}> of {fmt(budget)}</span>}
                </span>
              </div>

              {budget > 0 && (
                <div style={{ height: 6, background: '#F0F0EE', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ height: '100%', borderRadius: 3, transition: 'width 0.4s ease', width: `${pct}%`, background: over ? 'oklch(58% 0.15 25)' : cat.color }} />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#AAAAAA' }}>Monthly budget:</span>
                <input
                  type="number"
                  value={editVal}
                  onChange={e => setEditing(prev => ({ ...prev, [cat.id]: e.target.value }))}
                  onBlur={e => {
                    onUpdateBudget(cat.id, parseFloat(e.target.value) || 0)
                    setEditing(prev => { const n = { ...prev }; delete n[cat.id]; return n })
                  }}
                  className="budget-input"
                  style={{ width: 80, border: '1px solid #E0E0DC', borderRadius: 7, padding: '5px 8px', fontSize: 13, fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', outline: 'none', textAlign: 'right', color: '#1C1C1A' }}
                  placeholder="0"
                />
                <span style={{ fontSize: 12, color: '#888882' }}>€</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
