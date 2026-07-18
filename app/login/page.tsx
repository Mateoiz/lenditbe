// src/app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'That email or password doesn\u2019t match our records.'
          : error.message
      )
      return
    }

    router.push('/dashboard')
    router.refresh()
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
              Sign in to your dashboard
            </p>
          </div>

          <div className="card p-8">
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
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="password"
                    className="block text-xs font-mono uppercase tracking-widest"
                    style={{ color: 'var(--ink-4)' }}
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium"
                    style={{ color: 'var(--blue-mid)' }}
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
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
              </div>

              <button type="submit" className="btn-primary mt-2" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--ink-3)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold" style={{ color: 'var(--blue-mid)' }}>
              Open one
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}