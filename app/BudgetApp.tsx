"use client"
import { useState, useEffect, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  DEFAULT_CATEGORIES, DEFAULT_MEMBERS,
  summaryForMonth, fmt, toMonthKey, monthLabel, MONTHS,
  type BudgetState, type Transaction,
} from './lib/data'
import { createClient } from './lib/supabase'
import {
  fetchTransactions, insertTransaction, removeTransaction,
  fetchBudgets, upsertBudget, rowToTransaction, type TxnRow, type BudgetRow,
} from './lib/db'
import { AuthGate } from './components/AuthGate'
import { QuickEntry } from './components/QuickEntry'
import { Overview } from './components/Overview'
import { Transactions } from './components/Transactions'
import { BudgetView } from './components/BudgetView'

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

type Tab = 'overview' | 'transactions' | 'budget'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',     label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'budget',       label: 'Budget' },
]

const EMPTY_STATE: BudgetState = {
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  members: DEFAULT_MEMBERS,
  budgets: {},
}

export function BudgetApp() {
  const isMobile = useIsMobile()
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [data, setData] = useState<BudgetState>(EMPTY_STATE)
  const [view, setView] = useState<Tab>('overview')
  const [currentMonth, setCurrentMonth] = useState(() => toMonthKey(new Date()))

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setData(EMPTY_STATE)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Load data when session is ready ───────────────────────────────────────
  useEffect(() => {
    if (!session) return
    setDataLoading(true)
    Promise.all([fetchTransactions(), fetchBudgets()])
      .then(([transactions, budgets]) => {
        setData(prev => ({ ...prev, transactions, budgets }))
      })
      .finally(() => setDataLoading(false))
  }, [session?.user.id])

  // ── Real-time subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    if (!session) return
    const supabase = createClient()

    const channel = supabase
      .channel('budget-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, payload => {
        const txn = rowToTransaction(payload.new as TxnRow)
        setData(prev => {
          if (prev.transactions.some(t => t.id === txn.id)) return prev
          return {
            ...prev,
            transactions: [txn, ...prev.transactions].sort((a, b) => b.date.localeCompare(a.date)),
          }
        })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'transactions' }, payload => {
        const deletedId = (payload.old as Partial<TxnRow>).id
        if (deletedId) setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== deletedId) }))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'budgets' }, payload => {
        const row = payload.new as BudgetRow
        setData(prev => ({ ...prev, budgets: { ...prev.budgets, [row.category_id]: row.amount } }))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'budgets' }, payload => {
        const row = payload.new as BudgetRow
        setData(prev => ({ ...prev, budgets: { ...prev.budgets, [row.category_id]: row.amount } }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session?.user.id])

  // ── Actions ───────────────────────────────────────────────────────────────
  const addTransaction = useCallback((txn: Transaction) => {
    const memberId = session?.user?.user_metadata?.member_id ?? txn.memberId
    const final = { ...txn, memberId }
    setData(prev => ({ ...prev, transactions: [final, ...prev.transactions] }))
    setCurrentMonth(txn.date.slice(0, 7))
    insertTransaction(final).catch(console.error)
  }, [session])

  const deleteTransaction = useCallback((id: string) => {
    setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }))
    removeTransaction(id).catch(console.error)
  }, [])

  const updateBudget = useCallback((catId: string, val: number) => {
    setData(prev => ({ ...prev, budgets: { ...prev.budgets, [catId]: val } }))
    upsertBudget(catId, val).catch(console.error)
  }, [])

  const signOut = () => createClient().auth.signOut()

  // ── Month nav ─────────────────────────────────────────────────────────────
  const prevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number)
    setCurrentMonth(toMonthKey(new Date(y, m - 2)))
  }
  const nextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number)
    const next = toMonthKey(new Date(y, m))
    if (next <= toMonthKey(new Date())) setCurrentMonth(next)
  }
  const isCurrentMonth = currentMonth === toMonthKey(new Date())
  const net = summaryForMonth(data.transactions, currentMonth).net
  const memberLabel = session?.user?.user_metadata?.member_id === 'partner' ? 'Partner' : 'Me'

  // ── Render ────────────────────────────────────────────────────────────────
  if (authLoading) return null

  if (!session) return <AuthGate onAuth={() => {}} />

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: '#1C1C1A', lineHeight: 1.4 }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? '16px 14px 60px' : '28px 24px 60px' }}>

        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 22 }}>◈</span>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em' }}>Budget</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: isMobile ? 0 : 'auto' }}>
            <button onClick={prevMonth} style={{ background: 'none', border: '1px solid #E0E0DC', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555551', transition: 'all 0.15s' }}>‹</button>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', minWidth: 96, textAlign: 'center' }}>{monthLabel(currentMonth)}</span>
            <button onClick={nextMonth} disabled={isCurrentMonth} style={{ background: 'none', border: '1px solid #E0E0DC', borderRadius: 8, width: 30, height: 30, cursor: isCurrentMonth ? 'default' : 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555551', transition: 'all 0.15s', opacity: isCurrentMonth ? 0.3 : 1 }}>›</button>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E8E8E4', borderRadius: 20, padding: '6px 14px', marginLeft: isMobile ? 'auto' : 0 }}>
            <span style={{ color: net >= 0 ? 'oklch(42% 0.16 145)' : 'oklch(45% 0.16 25)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>
              {net >= 0 ? '+' : ''}{fmt(net)}
            </span>
          </div>

          {/* User badge + sign out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#888882', fontWeight: 500 }}>{memberLabel}</span>
            <button onClick={signOut} style={{ fontSize: 12, color: '#888882', background: 'none', border: '1px solid #E0E0DC', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', transition: 'all 0.15s' }}>Sign out</button>
          </div>
        </header>

        {/* Quick Entry */}
        <QuickEntry
          categories={data.categories}
          members={data.members}
          isMobile={isMobile}
          defaultMemberId={session.user.user_metadata?.member_id}
          onAdd={addTransaction}
        />

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E8E8E4', marginBottom: 24 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              style={{
                background: 'none', border: 'none',
                borderBottom: view === t.id ? '2px solid #1C1C1A' : '2px solid transparent',
                padding: isMobile ? '10px 12px' : '10px 18px',
                fontSize: isMobile ? 13 : 14,
                cursor: 'pointer',
                fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                transition: 'all 0.15s', letterSpacing: '-0.01em',
                color: view === t.id ? '#1C1C1A' : '#888882',
                fontWeight: view === t.id ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {dataLoading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#AAAAAA', fontSize: 14 }}>Loading…</div>
        ) : (
          <>
            {view === 'overview'     && <Overview     data={data} monthKey={currentMonth} isMobile={isMobile} />}
            {view === 'transactions' && <Transactions data={data} monthKey={currentMonth} onDelete={deleteTransaction} />}
            {view === 'budget'       && <BudgetView   data={data} monthKey={currentMonth} onUpdateBudget={updateBudget} />}
          </>
        )}
      </div>
    </div>
  )
}
