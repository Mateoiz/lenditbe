// components/Navbar.tsx
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

const links = [
  { href: '#about',        label: 'About' },
  { href: '#features',     label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#testimonials', label: 'Stories' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen]         = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background:     scrolled ? 'rgba(255,253,247,0.92)' : 'transparent',
        borderBottom:   scrolled ? '1.5px solid rgba(20,17,15,0.18)' : '1.5px solid transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
      }}
    >
      <nav className="max-w-6xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/"
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 22,
            fontWeight: 600,
            color: '#14110F',
            textDecoration: 'none',
          }}
        >
          Lendit
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#F5A623',
              color: '#073F38',
              fontSize: 13,
              fontWeight: 700,
              marginLeft: 3,
              border: '1.5px solid #14110F',
              verticalAlign: 'middle',
            }}
          >
            Be
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="transition-colors duration-150 hover:!text-[#0B5D52]"
              style={{
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: '#3A362F',
                textDecoration: 'none',
              }}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="transition-colors duration-150 hover:!text-[#073F38] hover:!border-[#0B5D52]"
            style={{
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: '#6B655A',
              textDecoration: 'none',
              borderBottom: '1.5px solid rgba(20,17,15,0.18)',
              paddingBottom: 1,
            }}
          >
            Sign in
          </Link>

          <Link
            href="/register"
            className="transition-all duration-150 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:!shadow-[4px_4px_0_#14110F]"
            style={{
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontSize: 13,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              padding: '9px 18px',
              borderRadius: 4,
              background: '#F5A623',
              color: '#073F38',
              textDecoration: 'none',
              border: '1.5px solid #14110F',
              boxShadow: '3px 3px 0 #14110F',
            }}
          >
            Open an account
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          <span className="block w-5 h-0.5" style={{ background: '#14110F' }} />
          <span className="block w-5 h-0.5" style={{ background: '#14110F' }} />
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div
          className="md:hidden px-6 sm:px-10 pb-5 flex flex-col gap-3"
          style={{
            background:   'rgba(255,253,247,0.98)',
            borderBottom: '1.5px solid rgba(20,17,15,0.18)',
          }}
        >
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="py-1 transition-colors duration-150 hover:!text-[#0B5D52]"
              style={{
                fontFamily:    "'Inter', -apple-system, sans-serif",
                fontSize:      14,
                fontWeight:    500,
                color:         '#3A362F',
                textDecoration: 'none',
              }}
            >
              {l.label}
            </a>
          ))}

          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="py-1 transition-colors duration-150 hover:!text-[#073F38]"
            style={{
              fontFamily:    "'Inter', -apple-system, sans-serif",
              fontSize:      14,
              fontWeight:    500,
              color:         '#6B655A',
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>

          <Link
            href="/register"
            onClick={() => setOpen(false)}
            style={{
              fontFamily:     "'Inter', -apple-system, sans-serif",
              fontSize:       13,
              fontWeight:     700,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              padding:        '11px 18px',
              borderRadius:   4,
              background:     '#F5A623',
              color:          '#073F38',
              textDecoration: 'none',
              border:         '1.5px solid #14110F',
              boxShadow:      '3px 3px 0 #14110F',
            }}
          >
            Open an account
          </Link>
        </div>
      )}
    </header>
  )
}