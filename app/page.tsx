// src/app/page.tsx
'use client'

import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CyclingPhrase from '@/components/CyclingPhrase'

export default function HomePage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        :root {
          --bg:        #F7F6F3;
          --bg-2:      #EFEDE8;
          --bg-card:   #FFFFFF;
          --ink:       #141210;
          --ink-2:     #3D3A35;
          --ink-3:     #7A756D;
          --ink-4:     #B8B2A8;
          --blue:      #1D4ED8;
          --blue-mid:  #2563EB;
          --blue-lt:   #3B82F6;
          --blue-bg:   rgba(37,99,235,0.07);
          --blue-bdr:  rgba(37,99,235,0.18);
          --line:      rgba(0,0,0,0.08);
          --line-md:   rgba(0,0,0,0.12);
        }

        @keyframes gradient-x {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @keyframes fade-up {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }

        .font-serif { font-family: 'DM Serif Display', Georgia, serif; }
        .font-mono  { font-family: 'JetBrains Mono', monospace; }

        .animate-gradient { background-size:200% 200%; animation: gradient-x 5s ease infinite; }
        .fade-up  { opacity:0; animation: fade-up 0.9s cubic-bezier(0.16,1,0.3,1) forwards; }
        .d100 { animation-delay:100ms; }
        .d200 { animation-delay:200ms; }
        .d300 { animation-delay:300ms; }
        .d400 { animation-delay:400ms; }
        .d500 { animation-delay:500ms; }

        .ticker-track { display:flex; width:max-content; animation: ticker 40s linear infinite; }
        .ticker-track:hover { animation-play-state: paused; }

        .card {
          background: var(--bg-card);
          border: 1px solid var(--line);
          border-radius: 16px;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03);
        }
        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.04);
          border-color: var(--line-md);
        }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 24px; border-radius: 10px;
          background: var(--blue-mid);
          color: #fff; font-size: 14px; font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(37,99,235,0.3), 0 1px 2px rgba(37,99,235,0.2);
        }
        .btn-primary:hover {
          background: var(--blue);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(37,99,235,0.35), 0 2px 8px rgba(37,99,235,0.2);
        }
        .btn-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 24px; border-radius: 10px;
          background: transparent;
          color: var(--ink-2); font-size: 14px; font-weight: 500;
          text-decoration: none;
          border: 1px solid var(--line-md);
          transition: all 0.2s ease;
        }
        .btn-secondary:hover {
          background: var(--bg-2);
          border-color: rgba(0,0,0,0.18);
          transform: translateY(-1px);
        }

        .section-tag {
          display:inline-flex; align-items:center; gap:6px;
          padding:4px 12px; border-radius:9999px;
          background: var(--blue-bg);
          border: 1px solid var(--blue-bdr);
          color: var(--blue-mid);
          font-size:11px; font-weight:600;
          text-transform:uppercase; letter-spacing:0.1em;
          font-family:'JetBrains Mono',monospace;
        }

        .stat-divider {
          width: 1px;
          height: 40px;
          background: var(--line-md);
        }

        .feat-img::after {
          content:'';
          position:absolute; inset:0;
          background: linear-gradient(to top, rgba(255,255,255,0.5) 0%, transparent 60%);
        }
      `}</style>

      <div style={{ background: 'var(--bg)', color: 'var(--ink)' }} className="min-h-screen overflow-x-hidden">

        <Navbar />

        <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="https://images.unsplash.com/photo-1605543502351-8c5499fcd2ce?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="Hero background"
              fill
              className="object-cover"
              priority
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, rgba(247,246,243,0.82) 0%, rgba(247,246,243,0.70) 40%, rgba(247,246,243,0.96) 100%)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(37,99,235,0.04)', mixBlendMode: 'multiply' }}
            />
          </div>

          <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(37,99,235,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.06) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, black 20%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, black 20%, transparent 100%)',
            }}
          />

          <div className="relative z-10 text-center max-w-4xl mx-auto px-6">

            <div className="fade-up d100 mb-6 flex items-center justify-center">
              <span className="section-tag">
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--blue-mid)', display: 'inline-block' }} />
                Philippine Lending Platform
              </span>
            </div>

            <h1 className="fade-up d100 font-serif leading-[1.05] mb-6">
              <span
                className="block"
                style={{ fontSize: 'clamp(2.8rem,7vw,5.2rem)', color: 'var(--ink)' }}
              >
                Modern lending,
              </span>
              <span
                className="block animate-gradient bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 bg-clip-text text-transparent"
                style={{ fontSize: 'clamp(2.8rem,7vw,5.2rem)' }}
              >
                zero confusion.
              </span>
            </h1>

            <p
              className="fade-up d200 text-lg leading-relaxed max-w-2xl mx-auto mb-4"
              style={{ color: 'var(--ink-3)' }}
            >
              LenditBe is a complete loan management platform — track borrowers, schedule payments, and monitor your entire portfolio from a single, beautiful dashboard.
            </p>

            <CyclingPhrase />

            <div className="fade-up d300 flex items-center justify-center gap-3 flex-wrap mb-14 mt-4">
              <a href="/register" className="btn-primary" style={{ padding: '13px 28px', fontSize: '15px' }}>
                Open an account
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
              <a href="/login" className="btn-secondary" style={{ padding: '13px 28px', fontSize: '15px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Sign in to dashboard
              </a>
            </div>

            <div className="fade-up d400 flex items-center justify-center gap-6 flex-wrap">
              {[
                { d: <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />, d2: <path d="M7 11V7a5 5 0 0 1 10 0v4"/>, label: 'Bank-grade Security' },
                { d: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>, label: 'Real-time Updates' },
                { d: <><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></>, label: 'Full Audit Logs' },
                { d: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>, label: 'RA 10173 Compliant' },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue-mid)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {b.d}{b.d2}
                  </svg>
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            style={{ color: 'var(--ink-4)' }}
          >
            <span className="font-mono text-[10px] tracking-widest uppercase">Scroll to explore</span>
            <div
              className="w-5 h-8 rounded-full border flex items-start justify-center pt-1.5"
              style={{ borderColor: 'var(--line-md)' }}
            >
              <div className="w-1 h-2 rounded-full bg-blue-400 animate-bounce" />
            </div>
          </div>
        </section>

        <div
          className="overflow-hidden py-3.5"
          style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'var(--bg-2)' }}
        >
          <div className="ticker-track">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center">
                {['◆ Loan Management','◆ Borrower KYC','◆ Payment Tracking','◆ Interest Calculation','◆ Amortization','◆ Credit Assessment','◆ Overdue Alerts','◆ Portfolio Analytics','◆ Audit Trail','◆ Philippine Lending','◆ Secure & Compliant','◆ Real-time Dashboard'].map(t => (
                  <span key={t} className="font-mono text-xs px-6 whitespace-nowrap" style={{ color: 'var(--ink-4)' }}>
                    {t}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div
              className="rounded-2xl p-10 flex flex-col sm:flex-row items-center justify-around gap-8"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}
            >
              {[
                { num: '₱0',  label: 'Total Disbursed',  sub: 'across all loans' },
                { num: '0',   label: 'Active Borrowers', sub: 'verified profiles' },
                { num: '0%',  label: 'Collection Rate',  sub: 'on-time payments' },
                { num: '0',   label: 'Loans Managed',    sub: 'and counting' },
              ].map((s, i, arr) => (
                <div key={s.label} className="flex items-center gap-8">
                  <div className="text-center">
                    <div
                      className="font-serif mb-1"
                      style={{ fontSize: '2.5rem', color: 'var(--blue-mid)', lineHeight: 1 }}
                    >
                      {s.num}
                    </div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{s.label}</div>
                    <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>{s.sub}</div>
                  </div>
                  {i < arr.length - 1 && <div className="stat-divider hidden sm:block" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="py-20 px-6" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-center">

            <div className="relative rounded-2xl overflow-hidden aspect-[4/3]"
              style={{ border: '1px solid var(--line)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
              <Image
                src="https://images.unsplash.com/photo-1672380135241-c024f7fbfa13?q=80&w=1170&auto=format&fit=crop"
                alt="About LenditBe"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(247,246,243,0.4) 0%, transparent 60%)' }} />
              <div className="absolute top-4 left-4">
                <div
                  className="font-mono text-xs px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid var(--line-md)', color: 'var(--blue-mid)', backdropFilter: 'blur(8px)' }}
                >
                  // about.us
                </div>
              </div>
            </div>

            <div>
              <div className="section-tag mb-5">About LenditBe</div>
              <h2 className="font-serif mb-5 leading-tight" style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', color: 'var(--ink)' }}>
                Built for those who<br />
                <span style={{ color: 'var(--blue-mid)', fontStyle: 'italic' }}>lend with purpose.</span>
              </h2>
              <p className="leading-relaxed mb-4 text-sm" style={{ color: 'var(--ink-3)' }}>
                LenditBe was designed from the ground up for lending cooperatives, microfinance institutions, and private lenders in the Philippines who need a reliable, transparent system to manage their operations.
              </p>
              <p className="leading-relaxed mb-8 text-sm" style={{ color: 'var(--ink-3)' }}>
                From borrower onboarding and KYC collection to amortization scheduling and payment recording — every feature is purpose-built for the realities of Philippine lending.
              </p>
              <div className="flex gap-3">
                <a href="/register" className="btn-primary">Start today</a>
                <a href="#features" className="btn-secondary">See features</a>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 px-6" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <div className="section-tag mb-4">Features</div>
              <h2 className="font-serif mb-4" style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: 'var(--ink)' }}>The full lending stack</h2>
              <p className="text-sm max-w-xl mx-auto" style={{ color: 'var(--ink-3)' }}>Everything from borrower registration to final payment — handled in one place.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 mb-5">
              {[
                {
                  src: 'https://plus.unsplash.com/premium_photo-1681487769650-a0c3fbaed85a?q=80&w=1255&auto=format&fit=crop',
                  tag: '01 · BORROWERS',
                  title: 'Complete Borrower KYC',
                  desc: 'Collect full personal, employment, and government ID information. Every borrower profile is audit-ready from day one.',
                },
                {
                  src: 'https://plus.unsplash.com/premium_photo-1661371394983-42485fed3a58?q=80&w=1169&auto=format&fit=crop',
                  tag: '02 · LOANS',
                  title: 'Smart Loan Scheduling',
                  desc: 'Set interest rates, terms, and disbursement dates. Auto-generated amortization schedules take the math out of lending.',
                },
                {
                  src: 'https://images.unsplash.com/photo-1734503937317-3b88a42ac50c?q=80&w=1170&auto=format&fit=crop',
                  tag: '03 · ANALYTICS',
                  title: 'Live Portfolio Insights',
                  desc: 'Real-time dashboard showing collection rates, overdue accounts, and disbursement trends — so you always know where you stand.',
                },
              ].map((f) => (
                <div key={f.title} className="card overflow-hidden">
                  <div className="relative h-44">
                    <Image src={f.src} alt={f.title} fill className="object-cover" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.6) 0%, transparent 50%)' }} />
                    <div className="absolute top-3 left-3">
                      <span
                        className="font-mono text-xs px-2.5 py-1 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--blue-mid)', border: '1px solid var(--blue-bdr)', backdropFilter: 'blur(8px)' }}
                      >
                        {f.tag}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold mb-2 text-sm" style={{ color: 'var(--ink)' }}>{f.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>, title: 'Payment Logging', desc: 'Record every repayment instantly with timestamps and receipts.' },
                { icon: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>, title: 'Overdue Alerts', desc: 'Automatic flags for late accounts so nothing slips through.' },
                { icon: <><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></>, title: 'Consent Records', desc: 'Log data privacy and credit check consents per RA 10173.' },
                { icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M12 11v3"/></>, title: 'Role-based Access', desc: 'Control who sees what with granular permission settings.' },
              ].map(f => (
                <div key={f.title} className="card p-5 group">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: 'var(--blue-bg)', border: '1px solid var(--blue-bdr)' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--blue-mid)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg>
                  </div>
                  <div className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>{f.title}</div>
                  <div className="text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20 px-6" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <div className="section-tag mb-4">// How it Works</div>
              <h2 className="font-serif mb-2" style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: 'var(--ink)' }}>
                Up and running{' '}
                <span style={{ color: 'var(--blue-mid)', fontStyle: 'italic' }}>in minutes.</span>
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: '01', title: 'Create your account',     desc: 'Sign up and set up your lending institution profile. No credit card, no commitment.',             code: "auth.signUp({ email, password })" },
                { num: '02', title: 'Register your borrowers', desc: 'Add borrowers with full KYC — name, address, employment, government ID, and consents.',            code: "borrowers.insert({ kyc_data })" },
                { num: '03', title: 'Issue & schedule loans',  desc: 'Create loan records, set terms and interest rates, and auto-generate the repayment schedule.',       code: "loans.create({ amount, rate, term })" },
                { num: '04', title: 'Collect & track',         desc: 'Log payments as they arrive. The dashboard updates in real-time and flags overdue accounts.',        code: "payments.record({ amount, date })" },
              ].map((s) => (
                <div key={s.num} className="card flex gap-5 p-6">
                  <div
                    className="font-serif text-5xl font-bold flex-shrink-0 leading-none mt-1 select-none"
                    style={{ color: 'var(--blue-bdr)', fontSize: '3.5rem' }}
                  >
                    {s.num}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2 text-sm" style={{ color: 'var(--ink)' }}>{s.title}</h3>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--ink-3)' }}>{s.desc}</p>
                    <div
                      className="font-mono text-xs px-3 py-2 rounded-lg"
                      style={{ background: 'var(--blue-bg)', color: 'var(--blue-mid)', border: '1px solid var(--blue-bdr)' }}
                    >
                      {'> '}{s.code}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="testimonials" className="py-20 px-6" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <div className="section-tag mb-4">// Stories</div>
              <h2 className="font-serif" style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: 'var(--ink)' }}>What lenders say</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { name: 'Maria Santos', role: 'Lending Cooperative Officer', location: 'Bulacan',     quote: 'Before LenditBe, we were tracking everything in Excel. Now our entire portfolio is one dashboard click away.' },
                { name: 'Jose Reyes',   role: 'Microfinance Manager',        location: 'Cebu City',   quote: 'The KYC registration alone saved us 2 hours per borrower. The amortization schedule is automatically generated.' },
                { name: 'Ana Cruz',     role: 'Private Lender',              location: 'Quezon City', quote: 'Finally a system that understands Philippine lending. The peso formatting and consent logging are exactly what we needed.' },
              ].map((t) => (
                <div key={t.name} className="card p-6">
                  <div className="font-serif text-4xl mb-4" style={{ color: 'var(--blue-bdr)', lineHeight: 1 }}>"</div>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--ink-2)' }}>{t.quote}</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
                      style={{ border: '2px solid var(--line-md)' }}
                    >
                      <Image
                        src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop"
                        alt={t.name} fill className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{t.name}</div>
                      <div className="font-mono text-[10px]" style={{ color: 'var(--ink-4)' }}>{t.role} · {t.location}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <div className="section-tag mb-4">// Shop & Finance</div>
              <h2 className="font-serif mb-4" style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: 'var(--ink)' }}>
                Get the product now,<br />
                <span style={{ color: 'var(--blue-mid)', fontStyle: 'italic' }}>pay it off monthly.</span>
              </h2>
              <p className="text-sm max-w-xl mx-auto" style={{ color: 'var(--ink-3)' }}>
                Browse gadgets, appliances, and more from our partner merchants — apply for instant financing based on your credit limit, no cash upfront beyond your down payment.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 mb-10">
              {[
                { src: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?q=80&w=800', tag: 'GADGETS', title: 'Samsung Galaxy A55 5G', price: '₱18,999', mo: '₱1,650/mo' },
                { src: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800', tag: 'GADGETS', title: 'MacBook Air M2', price: '₱58,999', mo: '₱4,850/mo' },
                { src: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?q=80&w=800', tag: 'APPLIANCES', title: '2-Door Refrigerator', price: '₱24,999', mo: '₱2,180/mo' },
              ].map((p) => (
                <div key={p.title} className="card overflow-hidden">
                  <div className="relative h-40">
                    <Image src={p.src} alt={p.title} fill className="object-cover" />
                    <div className="absolute top-3 left-3">
                      <span className="font-mono text-xs px-2.5 py-1 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--blue-mid)', border: '1px solid var(--blue-bdr)', backdropFilter: 'blur(8px)' }}>
                        {p.tag}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold mb-2 text-sm" style={{ color: 'var(--ink)' }}>{p.title}</h3>
                    <div className="flex items-end justify-between">
                      <div className="font-serif text-lg" style={{ color: 'var(--ink)' }}>{p.price}</div>
                      <div className="font-mono text-xs" style={{ color: 'var(--blue-mid)' }}>as low as {p.mo}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <a href="/products" className="btn-primary" style={{ padding: '13px 28px', fontSize: '15px' }}>
                Browse all products →
              </a>
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div
              className="rounded-2xl px-12 py-16 relative overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--blue-bdr)',
                boxShadow: '0 8px 40px rgba(37,99,235,0.08), 0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(37,99,235,0.06) 0%, transparent 100%)' }}
              />
              <div className="relative z-10">
                <div className="section-tag mb-6 inline-flex">Ready to start?</div>
                <h2 className="font-serif mb-4" style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', color: 'var(--ink)' }}>
                  Ready to lend{' '}
                  <span
                    className="animate-gradient bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 bg-clip-text text-transparent"
                  >
                    with confidence?
                  </span>
                </h2>
                <p className="text-sm leading-relaxed max-w-xl mx-auto mb-10" style={{ color: 'var(--ink-3)' }}>
                  Join lending institutions across the Philippines that trust LenditBe for their day-to-day operations.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <a href="/register" className="btn-primary" style={{ padding: '14px 32px', fontSize: '15px' }}>
                    Create free account →
                  </a>
                  <a href="/login" className="btn-secondary" style={{ padding: '14px 32px', fontSize: '15px' }}>
                    Sign in instead
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  )
}