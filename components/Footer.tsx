// components/Footer.tsx
import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ background: '#F5F0E4', borderTop: '1.5px solid rgba(20,17,15,0.18)' }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-14 grid sm:grid-cols-2 md:grid-cols-4 gap-10">

        {/* Brand column */}
        <div>
          <div style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 20,
            fontWeight: 600,
            color: '#14110F',
            marginBottom: 12,
          }}>
            Lendit
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#F5A623',
              color: '#073F38',
              fontSize: 11,
              fontWeight: 700,
              marginLeft: 3,
              border: '1.5px solid #14110F',
              verticalAlign: 'middle',
            }}>Be</span>
          </div>
          <p style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            fontSize: 13,
            lineHeight: 1.7,
            color: '#6B655A',
          }}>
            A complete lending platform for Philippine cooperatives, microfinance
            institutions, and private lenders.
          </p>
        </div>

        {/* Product */}
        <FooterCol label="Product" links={[
          { href: '#features',     label: 'Features' },
          { href: '#how-it-works', label: 'How it works' },
          { href: '/products',     label: 'Product financing' },
          { href: '#testimonials', label: 'Stories' },
        ]} />

        {/* Company */}
        <FooterCol label="Company" links={[
          { href: '#about',    label: 'About' },
          { href: '/register', label: 'Open an account' },
          { href: '/login',    label: 'Sign in' },
        ]} />

        {/* Legal */}
        <FooterCol label="Legal" links={[
          { href: '/terms',        label: 'Terms of service' },
          { href: '/privacy',      label: 'Privacy policy' },
          { href: '/data-privacy', label: 'RA 10173 disclosure' },
        ]} />
      </div>

      {/* Bottom bar */}
      <div
        className="max-w-6xl mx-auto px-6 sm:px-10 py-5 flex flex-col sm:flex-row justify-between items-center gap-3"
        style={{ borderTop: '1.5px solid rgba(20,17,15,0.18)' }}
      >
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          color: '#9C9484',
        }}>
          © {new Date().getFullYear()} LenditBe. All rights reserved.
        </span>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          color: '#9C9484',
        }}>
          Made for Philippine lenders.
        </span>
      </div>
    </footer>
  )
}

function FooterCol({ label, links }: { label: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <div style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.09em',
        color: '#9C9484',
        marginBottom: 14,
      }}>
        {label}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="transition-colors duration-150 hover:!text-[#0B5D52]"
              style={{
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: 13,
                color: '#3A362F',
                textDecoration: 'none',
              }}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}