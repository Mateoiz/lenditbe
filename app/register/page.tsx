// src/app/register/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function passwordStrength(pw: string) {
  if (pw.length === 0) return { label: '', pct: 0, color: 'var(--line-md)' }
  if (pw.length < 8) return { label: 'Too short', pct: 25, color: '#DC2626' }
  const hasNumber = /\d/.test(pw)
  const hasUpper = /[A-Z]/.test(pw)
  const hasSymbol = /[^A-Za-z0-9]/.test(pw)
  const score = [hasNumber, hasUpper, hasSymbol].filter(Boolean).length
  if (score >= 3) return { label: 'Strong', pct: 100, color: '#2563EB' }
  if (score === 2) return { label: 'Good', pct: 70, color: '#2563EB' }
  return { label: 'Weak', pct: 45, color: '#D97706' }
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const strength = passwordStrength(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords don\u2019t match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)

    if (error) {
      setError(
        error.message.includes('already registered')
          ? 'An account with this email already exists.'
          : error.message
      )
      return
    }

    setSubmitted(true)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap');

        :root {
          --bg:        #F7F6F3;
          --bg-card:   #FFFFFF;
          --ink:       #141210;
          --ink-2:     #3D3A35;
          --ink-3:     #7A756D;
          --ink-4:     #B8B2A8;
          --blue:      #1D4ED8;
          --blue-mid:  #2563EB;
          --blue-bg:   rgba(37,99,235,0.07);
          --blue-bdr:  rgba(37,99,235,0.18);
          --line:      rgba(0,0,0,0.08);
          --line-md:   rgba(0,0,0,0.12);
          --red:       #DC2626;
          --red-bg:    rgba(220,38,38,0.06);
          --red-bdr:   rgba(220,38,38,0.2);
          --green:     #16A34A;
          --green-bg:  rgba(22,163,74,0.07);
          --green-bdr: rgba(22,163,74,0.2);
        }

        .font-serif { font-family: 'DM Serif Display', Georgia, serif; }
        .font-mono  { font-family: 'JetBrains Mono', monospace; }

        .input-field {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid var(--line-md);
          background: #fff;
          color: var(--ink);
          font-size: 14px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .input-field:focus {
          outline: none;
          border-color: var(--blue-mid);
          box-shadow: 0 0 0 3px var(--blue-bg);
        }

        .btn-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%;
          padding: 13px 24px; border-radius: 10px;
          background: var(--blue-mid);
          color: #fff; font-size: 14px; font-weight: 600;
          border: none; cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(37,99,235,0.3);
        }
        .btn-primary:hover:not(:disabled) {
          background: var(--blue);
          transform: translateY(-1px);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .card {
          background: var(--bg-card);
          border: 1px solid var(--line);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03);
        }
      `}</style>

      <div
        className="min-h-screen flex items-center justify-center px-6 py-12"
        style={{ background: 'var(--bg)' }}
      >
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link
              href="/"
              className="font-serif text-2xl inline-block mb-2"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: 'var(--ink)' }}
            >
              Lendit<span style={{ color: 'var(--blue-mid)', fontStyle: 'italic' }}>Be</span>
            </Link>
            <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
              Open your account
            </p>
          </div>

          <div className="card p-8">
            {submitted ? (
              <div className="text-center py-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'var(--green-bg)', border: '1px solid var(--green-bdr)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h2 className="font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                  Check your inbox
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                  We sent a confirmation link to <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{email}</span>. Confirm your email to finish setting up your account.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                  <div
                    className="text-xs px-3 py-2.5 rounded-lg font-mono"
                    style={{ background: 'var(--red-bg)', border: '1px solid var(--red-bdr)', color: 'var(--red)' }}
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-mono uppercase tracking-widest mb-2"
                    style={{ color: 'var(--ink-4)' }}
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-field"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-mono uppercase tracking-widest mb-2"
                    style={{ color: 'var(--ink-4)' }}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="input-field"
                      style={{ paddingRight: '44px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono"
                      style={{ color: 'var(--ink-4)' }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${strength.pct}%`, background: strength.color }}
                        />
                      </div>
                      <span className="text-xs font-mono mt-1 inline-block" style={{ color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-xs font-mono uppercase tracking-widest mb-2"
                    style={{ color: 'var(--ink-4)' }}
                  >
                    Confirm password
                  </label>
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field"
                  />
                </div>

                <button type="submit" className="btn-primary mt-2" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create account'}
                </button>

                <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--ink-4)' }}>
                  By continuing you agree to LenditBe&apos;s{' '}
                  <Link href="/terms" style={{ color: 'var(--blue-mid)' }}>Terms</Link> and{' '}
                  <Link href="/privacy" style={{ color: 'var(--blue-mid)' }}>Privacy Policy</Link>.
                </p>
              </form>
            )}
          </div>

          {!submitted && (
            <p className="text-center text-sm mt-6" style={{ color: 'var(--ink-3)' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-semibold" style={{ color: 'var(--blue-mid)' }}>
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </>
  )
}