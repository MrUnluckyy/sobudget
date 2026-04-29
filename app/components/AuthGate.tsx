"use client"
import { useState } from 'react'
import { createClient } from '../lib/supabase'

interface AuthGateProps {
  onAuth: () => void
}

export function AuthGate({ onAuth }: AuthGateProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [memberId, setMemberId] = useState<'me' | 'partner'>('me')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #E0E0DC', borderRadius: 10,
    padding: '10px 14px', fontSize: 14, fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
    outline: 'none', color: '#1C1C1A', background: '#fff',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { member_id: memberId } },
      })
      if (error) { setError(error.message); setLoading(false); return }
      setDone(true)
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    onAuth()
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px #EBEBEB', maxWidth: 380, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>✉️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>Check your email</h2>
          <p style={{ fontSize: 14, color: '#888882', lineHeight: 1.6 }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back and log in.
          </p>
          <button onClick={() => { setMode('login'); setDone(false) }} style={{ marginTop: 24, fontSize: 13, color: '#1C1C1A', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px #EBEBEB', maxWidth: 380, width: '100%' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 32 }}>
          <span style={{ fontSize: 22 }}>◈</span>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em' }}>Budget</span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6 }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p style={{ fontSize: 14, color: '#888882', marginBottom: 28 }}>
          {mode === 'login' ? 'Sign in to your household budget.' : 'Set up your budget account.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#555551', marginBottom: 6, letterSpacing: '0.02em' }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus className="budget-input"
              style={inputStyle} placeholder="you@example.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#555551', marginBottom: 6, letterSpacing: '0.02em' }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required className="budget-input" style={inputStyle} placeholder="••••••••"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#555551', marginBottom: 8, letterSpacing: '0.02em' }}>You are</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['me', 'partner'] as const).map(id => (
                  <button
                    key={id} type="button" onClick={() => setMemberId(id)}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 14, fontWeight: 500,
                      fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: memberId === id ? '#1C1C1A' : 'transparent',
                      color: memberId === id ? '#fff' : '#888882',
                      border: memberId === id ? '1px solid #1C1C1A' : '1px solid #E0E0DC',
                    }}
                  >
                    {id === 'me' ? 'Me' : 'Partner'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p style={{ fontSize: 13, color: 'oklch(45% 0.16 25)', background: 'oklch(97% 0.04 25)', borderRadius: 8, padding: '10px 14px', margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit" disabled={loading}
            style={{ marginTop: 6, background: '#1C1C1A', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'all 0.15s' }}
          >
            {loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#888882' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }} style={{ background: 'none', border: 'none', color: '#1C1C1A', fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
