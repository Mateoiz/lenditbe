// app/dashboard/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function peso(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function pesoShort(n: number) {
  return `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
}
function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatMonthYear(d: Date) {
  return d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
}
function daysUntil(d: string | null) {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

const JOURNEY_STEPS = ['pending', 'approved', 'disbursed', 'active', 'completed'] as const
const JOURNEY_LABELS: Record<string, string> = {
  pending: 'Submitted', approved: 'Approved', disbursed: 'Disbursed', active: 'Active', completed: 'Paid off',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: admin } = await supabase.from('admins').select('id').eq('id', user.id).maybeSingle()
  if (admin) redirect('/admin')

  const { data: borrower } = await supabase.from('borrowers').select('*').eq('id', user.id).maybeSingle()
  const { data: loans } = await supabase
    .from('loans').select('*').eq('borrower_id', user.id).order('created_at', { ascending: false })

  const activeLoan = loans?.find((l) => ['approved', 'active', 'disbursed', 'overdue'].includes(l.status))
  const pendingLoan = loans?.find((l) => l.status === 'pending')

  let installments: any[] = []
  if (activeLoan) {
    const { data } = await supabase
      .from('loan_installments')
      .select('*')
      .eq('loan_id', activeLoan.id)
      .order('installment_number', { ascending: true })
    installments = data ?? []
  }
  const nextInstallment = installments.find(i => Number(i.amount_paid) < Number(i.amount_due)) ?? null

  const { data: recentPayments } = await supabase
    .from('payments').select('*').eq('borrower_id', user.id).order('paid_at', { ascending: false }).limit(6)

  const kycStatus = borrower?.kyc_status ?? 'pending'
  const kycSubmitted = kycStatus === 'pending' && !!borrower?.id_front_image_url
  const firstName = borrower?.first_name ?? user.email?.split('@')[0] ?? 'there'
  const isStudent = borrower?.employment_type === 'student'

  const completedCount = loans?.filter(l => l.status === 'completed').length || 0
  const creditLimitValue = isStudent
    ? (completedCount === 0 ? 500 : completedCount === 1 ? 1000 : 1500)
    : (borrower?.credit_limit || (borrower?.monthly_income ? borrower.monthly_income * 0.15 : 2500))

  const outstandingPrincipal = (loans ?? [])
    .filter(l => ['approved', 'disbursed', 'active', 'overdue'].includes(l.status))
    .reduce((sum, l) => sum + Number(l.principal_amount), 0)

  const utilizationPct = creditLimitValue > 0
    ? Math.min(100, Math.round((outstandingPrincipal / creditLimitValue) * 100))
    : 0
  const availableCredit = Math.max(0, creditLimitValue - outstandingPrincipal)

  const journeyStatus = activeLoan?.status === 'overdue' ? 'active' : (activeLoan?.status ?? null)
  const journeyIndex = journeyStatus ? JOURNEY_STEPS.indexOf(journeyStatus as any) : -1

  const paidSoFar = installments.reduce((s, i) => s + Number(i.amount_paid), 0)
  const repaymentPct = activeLoan
    ? Math.min(100, Math.round((paidSoFar / Number(activeLoan.total_repayable)) * 100))
    : 0

  const dueDays = nextInstallment ? daysUntil(nextInstallment.due_date) : null
  const isOverdue = dueDays !== null && dueDays < 0
  const isUrgent = dueDays !== null && dueDays <= 3

  const RADIUS = 46
  const CIRC = 2 * Math.PI * RADIUS
  const ringOffset = CIRC - (utilizationPct / 100) * CIRC
  const ringColor = utilizationPct >= 90 ? 'var(--magenta)' : utilizationPct >= 60 ? 'var(--marigold)' : 'var(--teal)'

  // ── ONE priority alert, ranked ──
  type Alert = { tone: 'warn' | 'danger'; title: string; body: string; cta?: { href: string; label: string } }
  let priorityAlert: Alert | null = null

  if (kycStatus !== 'verified') {
    priorityAlert = kycStatus === 'rejected'
      ? { tone: 'danger', title: 'Verification not approved', body: 'Review your details and resubmit your ID to continue.', cta: { href: '/profile/verify', label: 'Resubmit' } }
      : kycSubmitted
      ? { tone: 'warn', title: 'Verification in review', body: "We're checking your documents — this usually doesn't take long." }
      : { tone: 'warn', title: 'Verify your identity to apply', body: 'A verified profile is required before you can apply for a loan.', cta: { href: '/profile/verify', label: 'Verify now' } }
  } else if (isUrgent && nextInstallment && activeLoan) {
    priorityAlert = {
      tone: isOverdue ? 'danger' : 'warn',
      title: isOverdue
        ? `Payment overdue by ${Math.abs(dueDays!)} day${Math.abs(dueDays!) !== 1 ? 's' : ''}`
        : dueDays === 0 ? 'Payment due today' : `Payment due in ${dueDays} day${dueDays !== 1 ? 's' : ''}`,
      body: `${peso(Number(nextInstallment.amount_due) - Number(nextInstallment.amount_paid))} for installment #${nextInstallment.installment_number}`,
      cta: { href: `/loans/${activeLoan.id}/pay`, label: 'Pay now' },
    }
  }

  // ── Bar chart geometry for the installment schedule (signature visual) ──
  const maxInstallmentAmt = Math.max(1, ...installments.map(i => Number(i.amount_due)))
  const CHART_H = 140

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
        body { font-family:'Inter',-apple-system,sans-serif; background-image:
          repeating-linear-gradient(transparent, transparent 34px, var(--line) 35px); }

        .ledger-card { background:var(--card); border:1.5px solid var(--line-md); border-radius:6px; position:relative; }
        .punch-line { height:14px; background-image:radial-gradient(circle,var(--paper) 3.5px,transparent 4px);
          background-size:18px 14px; background-position:9px center; border-bottom:1.5px dashed var(--line-md); }

        .btn-primary { display:inline-flex; align-items:center; justify-content:center; gap:8px;
          padding:13px 26px; border-radius:4px; background:var(--marigold); color:var(--teal-dark);
          font-size:14px; font-weight:700; text-decoration:none; border:1.5px solid var(--ink);
          box-shadow:3px 3px 0 var(--ink); transition:all 0.15s ease; }
        .btn-primary:hover { transform:translate(-1px,-1px); box-shadow:4px 4px 0 var(--ink); }
        .btn-primary:active { transform:translate(1px,1px); box-shadow:1px 1px 0 var(--ink); }

        .text-link { font-size:13px; font-weight:600; color:var(--ink-3); text-decoration:none;
          border-bottom:1.5px solid var(--line-md); padding-bottom:1px; transition:all 0.15s ease; }
        .text-link:hover { color:var(--teal-dark); border-color:var(--teal); }

        .stamp { display:inline-flex; align-items:center; gap:5px; font-family:'Space Mono',monospace;
          font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em;
          padding:4px 10px; border-radius:3px; border:2px solid; transform:rotate(-3deg); mix-blend-mode:multiply; }

        .ticker-tile { background:var(--card); border:1.5px solid var(--line-md); border-radius:6px;
          padding:16px 18px; position:relative; overflow:hidden; }
        .ticker-tile::before { content:''; position:absolute; top:0; left:0; width:4px; height:100%; background:var(--tick-color, var(--teal)); }
        .ticker-label { font-family:'Space Mono',monospace; font-size:10px; font-weight:700; text-transform:uppercase;
          letter-spacing:0.09em; color:var(--ink-4); margin-bottom:6px; }
        .ticker-value { font-family:'Fraunces',Georgia,serif; font-weight:500; font-size:26px; color:var(--ink); line-height:1.05; }
        .ticker-sub { font-family:'Space Mono',monospace; font-size:11px; color:var(--ink-3); margin-top:4px; }

        .ring-wrap { position:relative; width:112px; height:112px; flex-shrink:0; }
        .ring-wrap svg { transform:rotate(-90deg); }
        .ring-track { fill:none; stroke:var(--paper-2); stroke-width:11; }
        .ring-fill { fill:none; stroke-width:11; stroke-linecap:butt; transition:stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1); }
        .ring-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }

        .journey-track { display:flex; align-items:center; }
        .journey-step { display:flex; flex-direction:column; align-items:center; flex:1; position:relative; }
        .journey-dot { width:20px; height:20px; border-radius:3px; display:flex; align-items:center; justify-content:center;
          font-size:9px; font-weight:700; font-family:'Space Mono',monospace; border:2px solid var(--line-md);
          background:var(--card); color:var(--ink-4); z-index:1; transition:all 0.3s ease; }
        .journey-dot.done { background:var(--teal); border-color:var(--teal-dark); color:#fff; }
        .journey-dot.current { background:var(--marigold); border-color:var(--ink); color:var(--teal-dark); }
        .journey-line { position:absolute; top:9px; left:50%; width:100%; height:2px; background:var(--line-md); z-index:0; }
        .journey-line.done { background:var(--teal); }
        .journey-step:last-child .journey-line { display:none; }

        .progress-track { width:100%; height:9px; border-radius:2px; background:var(--paper-2); overflow:hidden; border:1px solid var(--line-md); }
        .progress-fill { height:100%; background:repeating-linear-gradient(135deg,var(--teal),var(--teal) 8px,var(--teal-dark) 8px,var(--teal-dark) 16px); transition:width 0.6s ease; }

        .bar-chart-wrap { display:flex; align-items:flex-end; gap:10px; height:${CHART_H}px; padding:0 4px; overflow-x:auto; }
        .bar-col { display:flex; flex-direction:column; align-items:center; justify-content:flex-end; min-width:44px; height:100%; }
        .bar-shape { width:32px; border-radius:3px 3px 0 0; position:relative; transition:height 0.4s ease; }
        .bar-amt { font-family:'Space Mono',monospace; font-size:9px; color:var(--ink-4); margin-bottom:4px; white-space:nowrap; }
        .bar-num { font-family:'Space Mono',monospace; font-size:10px; font-weight:700; color:var(--ink-3); margin-top:8px; }

        .seal-strip { display:flex; flex-wrap:wrap; gap:20px; align-items:center; justify-content:center;
          padding:16px; border-radius:6px; background:var(--paper-2); border:1.5px dashed var(--line-md); }
        .seal-item { display:flex; align-items:center; gap:6px; font-size:11px; font-family:'Space Mono',monospace; color:var(--ink-3); }
      `}</style>

      <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
        <header className="flex items-center justify-between px-6 sm:px-10 py-5" style={{ borderBottom: '2px solid var(--ink)', background: 'var(--paper)' }}>
          <Link href="/" className="font-display text-2xl" style={{ color: 'var(--ink)', fontWeight: 600 }}>
            Lendit
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30,
              borderRadius: '50%', background: 'var(--marigold)', color: 'var(--teal-dark)', fontSize: 15, fontWeight: 700,
              marginLeft: 2, border: '1.5px solid var(--ink)', verticalAlign: 'middle' }}>Be</span>
          </Link>
          <div className="flex items-center gap-3">
            {isStudent && (
              <span className="stamp hidden sm:inline-flex" style={{ color: 'var(--teal-dark)', borderColor: 'var(--teal)' }}>Student</span>
            )}
            <span className="text-sm hidden sm:inline" style={{ color: 'var(--ink-3)' }}>{user.email}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-sm font-medium px-3 py-1.5 rounded" style={{ color: 'var(--ink-3)' }}>Sign out</button>
            </form>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 sm:px-10 py-10">

          {/* Statement masthead */}
          <div className="flex items-end justify-between flex-wrap gap-3 mb-1">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ink-4)' }}>
                Account statement · {formatMonthYear(new Date())}
              </p>
              <h1 className="font-display text-3xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                Welcome back, {firstName}.
              </h1>
            </div>
            <span className="stamp" style={{ color: 'var(--ink-3)', borderColor: 'var(--line-md)' }}>
              Issued {formatDate(new Date().toISOString())}
            </span>
          </div>
          <p className="text-sm mb-7" style={{ color: 'var(--ink-3)' }}>
            {priorityAlert ? "Here's what needs your attention." : "Everything's on track — here's where things stand."}
          </p>

          {priorityAlert && (
            <div
              className="flex items-center justify-between gap-4 flex-wrap px-5 py-4 mb-7 ledger-card"
              style={{
                background: priorityAlert.tone === 'danger' ? 'var(--magenta-bg)' : 'var(--marigold-bg)',
                borderColor: priorityAlert.tone === 'danger' ? 'var(--magenta-bdr)' : 'var(--marigold-bdr)',
              }}
            >
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: priorityAlert.tone === 'danger' ? 'var(--magenta)' : 'var(--marigold-dark)' }}>
                  {priorityAlert.title}
                </p>
                <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{priorityAlert.body}</p>
              </div>
              {priorityAlert.cta && (
                <Link href={priorityAlert.cta.href} className="btn-primary flex-shrink-0">{priorityAlert.cta.label}</Link>
              )}
            </div>
          )}

          {/* Ticker strip: 3 finance tiles + ring */}
          <div className="grid sm:grid-cols-4 gap-3 mb-3">
            <div className="ticker-tile" style={{ ['--tick-color' as any]: 'var(--teal)' }}>
              <p className="ticker-label">Available credit</p>
              <p className="ticker-value">{pesoShort(availableCredit)}</p>
              <p className="ticker-sub">of {pesoShort(creditLimitValue)} limit</p>
            </div>
            <div className="ticker-tile" style={{ ['--tick-color' as any]: 'var(--marigold)' }}>
              <p className="ticker-label">Outstanding</p>
              <p className="ticker-value">{pesoShort(outstandingPrincipal)}</p>
              <p className="ticker-sub">{activeLoan ? 'across active loan' : 'nothing owed'}</p>
            </div>
            <div className="ticker-tile" style={{ ['--tick-color' as any]: nextInstallment ? (isOverdue ? 'var(--magenta)' : 'var(--teal)') : 'var(--ink-4)' }}>
              <p className="ticker-label">Next payment</p>
              <p className="ticker-value" style={{ fontSize: 22 }}>
                {nextInstallment ? peso(Number(nextInstallment.amount_due) - Number(nextInstallment.amount_paid)) : '—'}
              </p>
              <p className="ticker-sub">{nextInstallment ? `due ${formatDate(nextInstallment.due_date)}` : 'nothing scheduled'}</p>
            </div>
            <div className="ticker-tile flex items-center gap-4" style={{ ['--tick-color' as any]: ringColor }}>
              <div className="ring-wrap">
                <svg width="112" height="112" viewBox="0 0 112 112">
                  <circle className="ring-track" cx="56" cy="56" r={RADIUS} />
                  <circle className="ring-fill" cx="56" cy="56" r={RADIUS} stroke={ringColor}
                    strokeDasharray="3 4" strokeDashoffset={ringOffset} />
                </svg>
                <div className="ring-center">
                  <span className="font-display text-xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>{utilizationPct}%</span>
                  <span className="font-mono text-[9px] uppercase" style={{ color: 'var(--ink-4)' }}>used</span>
                </div>
              </div>
            </div>
          </div>

          {/* Signature visual: installment bar chart */}
          {activeLoan && installments.length > 0 && (
            <div className="ledger-card overflow-hidden mb-3">
              <div className="punch-line" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                  <p className="font-display text-lg" style={{ color: 'var(--ink)', fontWeight: 500 }}>Installment schedule</p>
                  <div className="flex items-center gap-4 font-mono text-xs" style={{ color: 'var(--ink-3)' }}>
                    <span className="flex items-center gap-1.5"><span style={{ width: 9, height: 9, background: 'var(--teal)', display: 'inline-block', borderRadius: 2 }} />Paid</span>
                    <span className="flex items-center gap-1.5"><span style={{ width: 9, height: 9, background: 'var(--marigold-bg)', border: '1.5px solid var(--marigold)', display: 'inline-block', borderRadius: 2 }} />Upcoming</span>
                    <span className="flex items-center gap-1.5"><span style={{ width: 9, height: 9, background: 'var(--magenta)', display: 'inline-block', borderRadius: 2 }} />Overdue</span>
                  </div>
                </div>
                <div className="bar-chart-wrap">
                  {installments.map(inst => {
                    const amt = Number(inst.amount_due)
                    const heightPx = Math.max(6, Math.round((amt / maxInstallmentAmt) * (CHART_H - 44)))
                    const isPaid = Number(inst.amount_paid) >= amt
                    const isOver = inst.status === 'overdue'
                    const fill = isPaid ? 'var(--teal)' : isOver ? 'var(--magenta)' : 'var(--marigold-bg)'
                    const border = isPaid ? 'none' : isOver ? 'none' : '1.5px solid var(--marigold)'
                    return (
                      <div key={inst.id} className="bar-col">
                        <span className="bar-amt">{pesoShort(amt)}</span>
                        <div className="bar-shape" style={{ height: heightPx, background: fill, border }} />
                        <span className="bar-num">#{inst.installment_number}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Loan progress card */}
          {(activeLoan || pendingLoan) && (
            <div className="ledger-card overflow-hidden mb-6">
              <div className="punch-line" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>
                    {activeLoan ? 'Loan progress' : 'Your application'}
                  </p>
                  {activeLoan && (
                    <span className="stamp" style={{
                      color: activeLoan.status === 'overdue' ? 'var(--magenta)' : 'var(--teal-dark)',
                      borderColor: activeLoan.status === 'overdue' ? 'var(--magenta)' : 'var(--teal)',
                    }}>
                      {activeLoan.status === 'approved' ? 'Pending release' : activeLoan.status}
                    </span>
                  )}
                </div>

                {activeLoan ? (
                  <>
                    <p className="font-display mb-5" style={{ color: 'var(--ink)', fontWeight: 500, fontSize: 34 }}>
                      {peso(activeLoan.total_repayable)}
                    </p>
                    <div className="journey-track mb-4">
                      {JOURNEY_STEPS.map((step, i) => (
                        <div key={step} className="journey-step">
                          {i > 0 && <div className={`journey-line ${i <= journeyIndex ? 'done' : ''}`} />}
                          <div className={`journey-dot ${i < journeyIndex ? 'done' : i === journeyIndex ? 'current' : ''}`}>
                            {i < journeyIndex ? '✓' : i + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="font-mono text-xs mb-5" style={{ color: 'var(--ink-3)' }}>
                      Currently: <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{JOURNEY_LABELS[journeyStatus ?? 'pending']}</span>
                    </p>
                    <div className="flex items-center justify-between text-xs font-mono mb-1.5" style={{ color: 'var(--ink-3)' }}>
                      <span>{peso(paidSoFar)} paid</span>
                      <span>{repaymentPct}% repaid</span>
                    </div>
                    <div className="progress-track mb-6">
                      <div className="progress-fill" style={{ width: `${repaymentPct}%` }} />
                    </div>
                    <Link href={`/loans/${activeLoan.id}/pay`} className="btn-primary">Make a payment</Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm mb-4" style={{ color: 'var(--ink-2)' }}>
                      Your application for {peso(pendingLoan!.principal_amount)} is under review.
                    </p>
                    <Link href={`/loans/${pendingLoan!.id}`} className="text-link">View application</Link>
                  </>
                )}
              </div>
            </div>
          )}

          {!activeLoan && !pendingLoan && (
            <div className="ledger-card p-6 mb-6">
              <p className="text-sm mb-4" style={{ color: 'var(--ink-2)' }}>You have no active loan right now.</p>
              {kycStatus === 'verified' && availableCredit >= 1000 && (
                <Link href="/loans/apply" className="btn-primary">Apply for a loan</Link>
              )}
            </div>
          )}

          {activeLoan && kycStatus === 'verified' && availableCredit >= 1000 && (
            <div className="mb-6">
              <Link href="/loans/apply" className="text-link">Apply for another loan</Link>
            </div>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-10">
            <Link href="/loans" className="text-link">View loan history</Link>
            <Link href="/profile" className="text-link">Manage profile</Link>
          </div>

          <div className="ledger-card overflow-hidden mb-8">
            <div className="punch-line" />
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1.5px solid var(--line)' }}>
              <h2 className="font-display text-lg" style={{ color: 'var(--ink)', fontWeight: 500 }}>Recent payments</h2>
              <Link href="/loans" className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--teal)' }}>See all</Link>
            </div>
            {recentPayments && recentPayments.length > 0 ? (
              <ul>
                {recentPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-6 py-4 font-mono text-sm" style={{ borderBottom: '1px dashed var(--line)' }}>
                    <div>
                      <p style={{ color: 'var(--ink)' }}>{peso(p.amount)}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>{formatDate(p.paid_at)} · {p.channel ?? 'unspecified'}</p>
                    </div>
                    <span className="stamp" style={{ color: 'var(--teal-dark)', borderColor: 'var(--teal)' }}>Paid</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-10 text-center">
                <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No payments recorded yet.</p>
              </div>
            )}
          </div>

          <div className="seal-strip">
            <div className="seal-item">🔒 256-bit encrypted</div>
            <div className="seal-item">🛡️ BSP-aligned lending practices</div>
            <div className="seal-item">📄 Data Privacy Act compliant</div>
            <div className="seal-item">✓ Verified borrower network</div>
          </div>
        </main>
      </div>
    </>
  )
}