// src/app/register/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function passwordStrength(pw: string) {
  if (pw.length === 0) return { label: '', pct: 0, color: 'var(--line-md)' }
  if (pw.length < 8) return { label: 'Too short', pct: 25, color: 'var(--magenta)' }
  const hasNumber = /\d/.test(pw)
  const hasUpper = /[A-Z]/.test(pw)
  const hasSymbol = /[^A-Za-z0-9]/.test(pw)
  const score = [hasNumber, hasUpper, hasSymbol].filter(Boolean).length
  if (score >= 3) return { label: 'Strong', pct: 100, color: 'var(--teal)' }
  if (score === 2) return { label: 'Good', pct: 70, color: 'var(--teal)' }
  return { label: 'Weak', pct: 45, color: 'var(--marigold-dark)' }
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
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');

        :root {
          --paper:#FFFDF7; --paper-2:#F5F0E4; --card:#FFFFFF;
          --ink:#14110F; --ink-2:#3A362F; --ink-3:#6B655A; --ink-4:#9C9484;
          --teal:#0B5D52; --teal-dark:#073F38; --teal-bg:#E5F1EE; --teal-bdr:#B9D9D2;
          --marigold:#F5A623; --marigold-dark:#B87814; --marigold-bg:#FDF0DA; --marigold-bdr:#F0CE93;
          --magenta:#C81E5C; --magenta-bg:#FBE7EF; --magenta-bdr:#EFB4CB;
          --line:rgba(20,17,15,0.10); --line-md:rgba(20,17,15,0.18);
        }

        .font-display { font-family:'Fraunces',Georgia,serif; }
        .font-mono { font-family:'Space Mono',monospace; }
        body { font-family:'Inter',-apple-system,sans-serif; }

        .auth-bg {
          background-color: var(--paper);
          background-image: repeating-linear-gradient(transparent, transparent 34px, var(--line) 35px);
        }

        .ledger-card {
          background:var(--card); border:2px solid var(--ink); border-radius:8px;
          box-shadow:5px 5px 0px var(--ink); position:relative;
        }
        .punch-line { height:14px; background-image:radial-gradient(circle,var(--paper) 3.5px,transparent 4px);
          background-size:18px 14px; background-position:9px center; border-bottom:1.5px dashed var(--line-md); }

        .input-field {
          width:100%; padding:12px 14px; border-radius:5px; border:1.5px solid var(--line-md);
          background:var(--paper); color:var(--ink); font-size:14px;
          transition:border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .input-field:focus {
          outline:none; border-color:var(--teal); box-shadow:0 0 0 3px var(--teal-bg);
          background:#fff;
        }

        .field-label {
          font-family:'Space Mono',monospace; font-size:11px; font-weight:700; text-transform:uppercase;
          letter-spacing:0.08em; color:var(--ink-4); display:block; margin-bottom:8px;
        }

        .btn-primary {
          display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%;
          padding:13px 24px; border-radius:5px; background:var(--marigold); color:var(--teal-dark);
          font-size:14px; font-weight:700; border:1.5px solid var(--ink); cursor:pointer;
          box-shadow:3px 3px 0 var(--ink); transition:all 0.15s ease;
        }
        .btn-primary:hover:not(:disabled) { transform:translate(-1px,-1px); box-shadow:4px 4px 0 var(--ink); }
        .btn-primary:active:not(:disabled) { transform:translate(1px,1px); box-shadow:1px 1px 0 var(--ink); }
        .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }

        .text-link { color:var(--teal-dark); font-weight:700; text-decoration:none;
          border-bottom:1.5px solid var(--teal-bdr); padding-bottom:1px; transition:border-color 0.15s ease; }
        .text-link:hover { border-color:var(--teal); }

        .stamp { display:inline-flex; align-items:center; gap:5px; font-family:'Space Mono',monospace;
          font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em;
          padding:4px 10px; border-radius:3px; border:2px solid; transform:rotate(-3deg); mix-blend-mode:multiply; }
      `}</style>

      <div className="min-h-screen flex items-center justify-center px-6 py-12 auth-bg">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link
              href="/"
              className="font-display text-3xl inline-flex items-center"
              style={{ color: 'var(--ink)', fontWeight: 600 }}
            >
              Lendit
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: '50%', background: 'var(--marigold)',
                  color: 'var(--teal-dark)', fontSize: 16, fontWeight: 700, marginLeft: 2,
                  border: '1.5px solid var(--ink)', verticalAlign: 'middle',
                }}
              >
                Be
              </span>
            </Link>
            <p className="font-mono text-xs uppercase tracking-widest mt-3" style={{ color: 'var(--ink-4)' }}>
              Open your account
            </p>
          </div>

          <div className="ledger-card overflow-hidden">
            <div className="punch-line" />
            <div className="p-8">
              {submitted ? (
                <div className="text-center py-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'var(--teal-bg)', border: '1.5px solid var(--teal-bdr)' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal-dark)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <h2 className="font-display text-xl mb-2" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                    Check your inbox
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                    We sent a confirmation link to{' '}
                    <span className="font-mono" style={{ color: 'var(--ink-2)', fontWeight: 700 }}>{email}</span>.
                    Confirm your email to finish setting up your account.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {error && (
                    <div
                      className="text-xs px-3 py-2.5 rounded font-mono"
                      style={{ background: 'var(--magenta-bg)', border: '1.5px solid var(--magenta-bdr)', color: 'var(--magenta)' }}
                    >
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="field-label">Email</label>
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
                    <label htmlFor="password" className="field-label">Password</label>
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
                        style={{ paddingRight: '48px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold"
                        style={{ color: 'var(--ink-4)' }}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {password.length > 0 && (
                      <div className="mt-2.5">
                        <div className="h-2 rounded overflow-hidden" style={{ background: 'var(--paper-2)', border: '1.5px solid var(--ink)' }}>
                          <div
                            className="h-full transition-all duration-300"
                            style={{ width: `${strength.pct}%`, background: strength.color }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold mt-1.5 inline-block" style={{ color: strength.color }}>
                          {strength.label}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="field-label">Confirm password</label>
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
                    {loading ? 'Creating account…' : 'Create account →'}
                  </button>

                  <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--ink-4)' }}>
                    By continuing you agree to LenditBe&apos;s{' '}
                    <Link href="/terms" className="text-link" style={{ fontWeight: 600 }}>Terms</Link> and{' '}
                    <Link href="/privacy" className="text-link" style={{ fontWeight: 600 }}>Privacy Policy</Link>.
                  </p>
                </form>
              )}
            </div>
          </div>

          {!submitted && (
            <p className="text-center text-sm mt-6" style={{ color: 'var(--ink-3)' }}>
              Already have an account?{' '}
              <Link href="/login" className="text-link">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </>
  )
}