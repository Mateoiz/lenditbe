'use client'

import { useState, useEffect } from 'react'

const links = [
  { href: '#about', label: 'About' },
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#testimonials', label: 'Stories' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(247,246,243,0.85)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.08)' : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
      }}
    >
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a
          href="/"
          className="font-serif text-xl"
          style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: '#141210' }}
        >
          Lendit<span style={{ color: '#2563EB', fontStyle: 'italic' }}>Be</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium transition-colors"
              style={{ color: '#3D3A35' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#3D3A35')}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            style={{ color: '#3D3A35' }}
          >
            Sign in
          </a>
          <a
            href="/register"
            className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-colors"
            style={{ background: '#2563EB' }}
          >
            Open an account
          </a>
        </div>

        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span className="block w-5 h-0.5" style={{ background: '#141210' }} />
          <span className="block w-5 h-0.5" style={{ background: '#141210' }} />
        </button>
      </nav>

      {open && (
        <div
          className="md:hidden px-6 pb-4 flex flex-col gap-3"
          style={{ background: 'rgba(247,246,243,0.98)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}
        >
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium py-1" style={{ color: '#3D3A35' }}>
              {l.label}
            </a>
          ))}
          <a href="/login" className="text-sm font-medium py-1" style={{ color: '#3D3A35' }}>
            Sign in
          </a>
          <a
            href="/register"
            className="text-sm font-semibold text-center px-4 py-2 rounded-lg text-white"
            style={{ background: '#2563EB' }}
          >
            Open an account
          </a>
        </div>
      )}
    </header>
  )
}