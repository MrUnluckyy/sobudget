"use client"
import { useState, useEffect, useRef } from 'react'
import { parseEntry, fmt, toDateKey, type Category, type Member, type Transaction } from '../lib/data'

const HINTS = ['salary 1500 income', 'lizingas 87,29 housing', 'personal 300', 'car 400 car loan', 'invest 300 savings']

interface QuickEntryProps {
  categories: Category[]
  members: Member[]
  isMobile: boolean
  defaultMemberId?: string
  onAdd: (txn: Transaction) => void
}

export function QuickEntry({ categories, members, isMobile, defaultMemberId, onAdd }: QuickEntryProps) {
  const today = toDateKey(new Date())
  const [text, setText] = useState('')
  const [date, setDate] = useState(today)
  const [parsed, setParsed] = useState<ReturnType<typeof parseEntry> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (text.trim()) {
      setParsed(parseEntry(text, categories, members, defaultMemberId))
    } else {
      setParsed(null)
    }
  }, [text, categories, members])

  const submit = () => {
    if (!parsed?.valid || parsed.amount === null) return
    onAdd({
      id: Date.now().toString(),
      date: date || today,
      description: parsed.description,
      amount: parsed.amount,
      isIncome: parsed.isIncome,
      categoryId: parsed.categoryId ?? categories[0].id,
      memberId: parsed.memberId,
    })
    setText('')
    setParsed(null)
    inputRef.current?.focus()
  }

  const cat = parsed ? categories.find(c => c.id === parsed.categoryId) : null
  const member = parsed ? members.find(m => m.id === parsed.memberId) : null
  const isValid = parsed?.valid ?? false
  const isToday = date === today || !date

  const dateInput = (
    <label
      title="Transaction date"
      style={{
        display: 'flex', alignItems: 'center', gap: 6, flex: isMobile ? 1 : 'none',
        border: `1px solid ${isToday ? '#E8E8E4' : '#D8D8D2'}`, borderRadius: 10,
        padding: '0 12px', height: 40, cursor: 'pointer', background: isToday ? '#FAFAF8' : '#fff',
        color: isToday ? '#888882' : '#1C1C1A', transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>🗓</span>
      <input
        type="date"
        value={date}
        max={today}
        onChange={e => setDate(e.target.value)}
        style={{
          border: 'none', outline: 'none', background: 'transparent', width: '100%',
          fontSize: 13, fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
          color: 'inherit', cursor: 'pointer', letterSpacing: '-0.01em', colorScheme: 'light',
        }}
      />
    </label>
  )

  const addButton = (
    <button
      onClick={submit}
      disabled={!isValid}
      style={{
        flexShrink: 0, border: 'none', borderRadius: 10, height: 40, padding: '0 20px',
        fontSize: 14, fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontWeight: 600,
        cursor: isValid ? 'pointer' : 'default', transition: 'all 0.15s', letterSpacing: '-0.01em',
        background: isValid ? '#1C1C1A' : '#E8E8E4',
        color: isValid ? '#fff' : '#AAAAAA',
      }}
    >
      Add{isMobile ? '' : ' ↵'}
    </button>
  )

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? '14px 16px' : '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px #EBEBEB', marginBottom: isMobile ? 20 : 28 }}>
      {/* Input row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 18, color: '#AAAAAA', width: 22, textAlign: 'center', flexShrink: 0 }}>
          {parsed?.isIncome ? '↑' : '↓'}
        </span>
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder={isMobile ? 'coffee 3.80  ·  rent 1200 housing' : 'coffee 3.80  ·  salary 3200 income  ·  rent 1200 housing'}
          autoFocus={!isMobile}
          className="budget-input"
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: isMobile ? 16 : 17, fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: '#1C1C1A', background: 'transparent', letterSpacing: '-0.01em' }}
        />
        {!isMobile && dateInput}
        {!isMobile && addButton}
      </div>

      {/* Mobile controls row */}
      {isMobile && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
          {dateInput}
          {addButton}
        </div>
      )}

      {isValid && cat ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0F0EE', flexWrap: 'wrap' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: cat.color }} />
          <span style={{ fontSize: 13, color: '#555551', fontWeight: 500 }}>{cat.name}</span>
          <span style={{ color: '#CCCCCC', fontSize: 12 }}>·</span>
          <span style={{ fontSize: 13, color: '#888882' }}>{member?.name}</span>
          <span style={{ fontSize: 15, fontWeight: 700, marginLeft: 'auto', letterSpacing: '-0.02em', color: parsed!.isIncome ? 'oklch(48% 0.16 145)' : 'oklch(48% 0.16 25)' }}>
            {parsed!.isIncome ? '+' : '−'}{fmt(parsed!.amount!)}
          </span>
          <span style={{ fontSize: 13, color: '#888882' }}>{parsed!.description}</span>
        </div>
      ) : !isMobile ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0F0EE', flexWrap: 'wrap' }}>
          {HINTS.map((h, i) => (
            <button
              key={i}
              onClick={() => setText(h)}
              style={{ border: '1px solid #EBEBEB', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#888882', cursor: 'pointer', background: 'transparent', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', transition: 'all 0.15s' }}
            >
              {h}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
