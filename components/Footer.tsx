export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(0,0,0,0.08)', background: '#F7F6F3' }}>
      <div className="max-w-6xl mx-auto px-6 py-14 grid sm:grid-cols-2 md:grid-cols-4 gap-10">
        <div>
          <div
            className="text-xl mb-3"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: '#141210' }}
          >
            Lendit<span style={{ color: '#2563EB', fontStyle: 'italic' }}>Be</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#7A756D' }}>
            A complete lending platform for Philippine cooperatives, microfinance
            institutions, and private lenders.
          </p>
        </div>

        <div>
          <div className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: '#B8B2A8' }}>
            Product
          </div>
          <ul className="flex flex-col gap-2 text-sm" style={{ color: '#3D3A35' }}>
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How it works</a></li>
            <li><a href="/products">Product financing</a></li>
            <li><a href="#testimonials">Stories</a></li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: '#B8B2A8' }}>
            Company
          </div>
          <ul className="flex flex-col gap-2 text-sm" style={{ color: '#3D3A35' }}>
            <li><a href="#about">About</a></li>
            <li><a href="/register">Open an account</a></li>
            <li><a href="/login">Sign in</a></li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: '#B8B2A8' }}>
            Legal
          </div>
          <ul className="flex flex-col gap-2 text-sm" style={{ color: '#3D3A35' }}>
            <li><a href="/terms">Terms of service</a></li>
            <li><a href="/privacy">Privacy policy</a></li>
            <li><a href="/data-privacy">RA 10173 disclosure</a></li>
          </ul>
        </div>
      </div>

      <div
        className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-mono"
        style={{ borderTop: '1px solid rgba(0,0,0,0.08)', color: '#B8B2A8' }}
      >
        <span>© {new Date().getFullYear()} LenditBe. All rights reserved.</span>
        <span>Made for Philippine lenders.</span>
      </div>
    </footer>
  )
}