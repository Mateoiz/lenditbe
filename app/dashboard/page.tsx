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
  const creditLimitValue = Number(borrower?.credit_limit ?? 0)

  const outstandingPrincipal = (loans ?? [])
    .filter(l => ['approved', 'disbursed', 'active', 'overdue'].includes(l.status))
    .reduce((sum, l) => sum + Number(l.principal_amount), 0)

  const utilizationPct = creditLimitValue > 0
    ? Math.min(100, Math.round((outstandingPrincipal / creditLimitValue) * 100))
    : 0
  const availableCredit = Math.max(0, creditLimitValue - outstandingPrincipal)
  const availablePct = 100 - utilizationPct

  const journeyStatus = activeLoan?.status === 'overdue' ? 'active' : (activeLoan?.status ?? null)
  const journeyIndex = journeyStatus ? JOURNEY_STEPS.indexOf(journeyStatus as any) : -1

  const paidSoFar = installments.reduce((s, i) => s + Number(i.amount_paid), 0)
  const repaymentPct = activeLoan
    ? Math.min(100, Math.round((paidSoFar / Number(activeLoan.total_repayable)) * 100))
    : 0

  const dueDays = nextInstallment ? daysUntil(nextInstallment.due_date) : null
  const isOverdue = dueDays !== null && dueDays < 0
  const isUrgent = dueDays !== null && dueDays <= 3

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
        body { font-family:'Inter',-apple-system,sans-serif; background-color:var(--paper);
          background-image:repeating-linear-gradient(transparent, transparent 34px, var(--line) 35px); }

        .ledger-card { 
          background:var(--card); border:1.5px solid var(--ink); border-radius:6px; 
          position:relative; box-shadow:3px 3px 0px var(--line-md);
          transition:transform 0.15s ease, box-shadow 0.15s ease;
        }
        .ledger-card:hover { transform:translate(-1px,-1px); box-shadow:4px 4px 0px var(--ink); }
        
        .punch-line { height:14px; background-image:radial-gradient(circle,var(--paper) 3.5px,transparent 4px);
          background-size:18px 14px; background-position:9px center; border-bottom:1.5px dashed var(--line-md); }

        .btn-primary { display:inline-flex; align-items:center; justify-content:center; gap:8px;
          padding:12px 24px; border-radius:4px; background:var(--marigold); color:var(--teal-dark);
          font-size:14px; font-weight:700; text-decoration:none; border:1.5px solid var(--ink);
          box-shadow:3px 3px 0 var(--ink); transition:all 0.15s ease; }
        .btn-primary:hover { transform:translate(-1px,-1px); box-shadow:4px 4px 0 var(--ink); }
        .btn-primary:active { transform:translate(1px,1px); box-shadow:1px 1px 0 var(--ink); }
        .btn-primary.lg { padding:16px 32px; font-size:15px; }
        .btn-primary.sm { padding:6px 14px; font-size:12px; box-shadow:2px 2px 0 var(--ink); }

        .btn-secondary { display:inline-flex; align-items:center; justify-content:center; gap:8px;
          padding:12px 22px; border-radius:4px; background:var(--card); color:var(--ink);
          font-size:14px; font-weight:700; text-decoration:none; border:1.5px solid var(--ink);
          transition:all 0.15s ease; }
        .btn-secondary:hover { background:var(--paper-2); }

        .text-link { font-size:13px; font-weight:600; color:var(--ink-3); text-decoration:none;
          border-bottom:1.5px solid var(--line-md); padding-bottom:1px; transition:all 0.15s ease; }
        .text-link:hover { color:var(--teal-dark); border-color:var(--teal); }

        .stamp { display:inline-flex; align-items:center; gap:5px; font-family:'Space Mono',monospace;
          font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em;
          padding:4px 10px; border-radius:3px; border:2px solid; transform:rotate(-3deg); mix-blend-mode:multiply; }
        .stamp.flat { transform:none; }

        /* ── Hero action card ── */
        .hero-action {
          display:flex; align-items:center; justify-content:space-between; gap:24px; flex-wrap:wrap;
          padding:26px 28px; border-radius:8px; position:relative; overflow:hidden;
          border:2px solid var(--ink); box-shadow:4px 4px 0px var(--ink);
        }
        .hero-action.due { background:var(--teal-bg); border-color:var(--teal); }
        .hero-action.overdue { background:var(--magenta-bg); border-color:var(--magenta); }
        .hero-action.neutral { background:var(--card); }
        .hero-action.blueprint {
          background-color: var(--teal-bg);
          background-image: radial-gradient(var(--teal-bdr) 1.5px, transparent 1.5px);
          background-size: 18px 18px;
          border-color: var(--teal-dark);
        }
        .hero-eyebrow { font-family:'Space Mono',monospace; font-size:11px; font-weight:700; text-transform:uppercase;
          letter-spacing:0.09em; margin-bottom:6px; }
        .hero-amount { font-family:'Fraunces',Georgia,serif; font-weight:500; font-size:40px; color:var(--ink); line-height:1; }
        .hero-sub { font-size:13px; color:var(--ink-3); margin-top:6px; }

        /* ── Credit Gauge Card ── */
        .credit-gauge-card {
          background:var(--card); border:2px solid var(--ink); border-radius:8px;
          padding:26px 28px; position:relative; box-shadow:5px 5px 0px var(--ink);
        }
        .credit-gauge-bar {
          width:100%; height:16px; border-radius:4px; background:var(--paper-2);
          border:1.5px solid var(--ink); overflow:hidden; display:flex; margin:18px 0 14px;
        }
        .gauge-fill-used { background:var(--ink-3); height:100%; transition:width 0.6s cubic-bezier(0.4,0,0.2,1); }
        .gauge-fill-avail { background:var(--teal); height:100%; transition:width 0.6s cubic-bezier(0.4,0,0.2,1); }
        .credit-stat-num { font-family:'Fraunces',Georgia,serif; font-weight:500; color:var(--ink); line-height:1; }

        /* ── Enhanced Ledger Table ── */
        .ledger-table-wrap { width:100%; overflow-x:auto; }
        .ledger-table { width:100%; border-collapse:collapse; text-align:left; }
        .ledger-table th {
          font-family:'Space Mono',monospace; font-size:10px; font-weight:700; text-transform:uppercase;
          letter-spacing:0.08em; color:var(--ink-4); padding:12px 16px; border-bottom:1.5px solid var(--line-md);
          background:var(--paper);
        }
        .ledger-table td {
          padding:16px; border-bottom:1px dashed var(--line); font-size:13.5px; color:var(--ink-2);
          vertical-align:middle;
        }
        .ledger-table tr:last-child td { border-bottom:none; }
        .ledger-table tr:hover td { background:var(--paper-2); }

        .journey-track { display:flex; align-items:center; }
        .journey-step { display:flex; flex-direction:column; align-items:center; flex:1; position:relative; }
        .journey-dot { width:22px; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center;
          font-size:9.5px; font-weight:700; font-family:'Space Mono',monospace; border:2px solid var(--line-md);
          background:var(--card); color:var(--ink-4); z-index:1; transition:all 0.3s ease; }
        .journey-dot.done { background:var(--teal); border-color:var(--teal-dark); color:#fff; }
        .journey-dot.current { background:var(--marigold); border-color:var(--ink); color:var(--teal-dark); box-shadow:2px 2px 0 var(--ink); }
        .journey-line { position:absolute; top:10px; left:50%; width:100%; height:2px; background:var(--line-md); z-index:0; }
        .journey-line.done { background:var(--teal); }
        .journey-step:last-child .journey-line { display:none; }

        .progress-track { width:100%; height:10px; border-radius:3px; background:var(--paper-2); overflow:hidden; border:1.5px solid var(--ink); }
        .progress-fill { height:100%; background:repeating-linear-gradient(135deg,var(--teal),var(--teal) 8px,var(--teal-dark) 8px,var(--teal-dark) 16px); transition:width 0.6s ease; }

        /* ── Stacked Sidebar Navigation ── */
        .sidebar-nav { display:flex; flex-direction:column; }
        .sidebar-nav-item {
          display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 18px; 
          text-decoration:none; border-bottom:1px dashed var(--line-md); transition:all 0.15s ease;
        }
        .sidebar-nav-item:last-child { border-bottom:none; }
        .sidebar-nav-item:hover { background:var(--paper-2); padding-left:22px; }
        .sidebar-nav-item:hover .sidebar-nav-label { color:var(--teal-dark); }
        .sidebar-nav-icon {
          display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:5px;
          flex-shrink:0; background:var(--teal-bg); border:1.5px solid var(--teal-bdr); color:var(--teal-dark);
        }
        .sidebar-nav-label { font-size:14px; font-weight:600; color:var(--ink-2); transition:color 0.15s ease; }
        .sidebar-nav-sub { font-family:'Space Mono',monospace; font-size:10.5px; color:var(--ink-4); margin-top:2px; display:block; }
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

        {/* Widened to max-w-6xl to accommodate the 2/3 + 1/3 desktop split seamlessly */}
        <main className="max-w-6xl mx-auto px-6 sm:px-10 py-10 flex flex-col gap-8">

          {/* ── Masthead ── */}
          <div>
            <p className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--ink-4)' }}>
              Account statement · {formatMonthYear(new Date())}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl leading-tight" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              Welcome back, {firstName}.
            </h1>
          </div>

          {/* ── Full-Width Anchor: Credit Gauge Card ── */}
          <div className="credit-gauge-card">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--teal-dark)' }}>
                  Available Credit to Borrow
                </p>
                <p className="credit-stat-num mt-1" style={{ fontSize: 44, color: 'var(--teal-dark)' }}>
                  {pesoShort(availableCredit)}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>
                  Total Approved Limit
                </p>
                <p className="credit-stat-num mt-1 font-mono" style={{ fontSize: 26, color: 'var(--ink-2)' }}>
                  {pesoShort(creditLimitValue)}
                </p>
              </div>
            </div>

            {/* Tactile Gauge Bar */}
            <div className="credit-gauge-bar" title={`${utilizationPct}% Used, ${availablePct}% Available`}>
              <div className="gauge-fill-used" style={{ width: `${utilizationPct}%` }} />
              <div className="gauge-fill-avail" style={{ width: `${availablePct}%` }} />
            </div>

            <div className="flex items-center justify-between font-mono text-xs flex-wrap gap-2" style={{ color: 'var(--ink-3)' }}>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span style={{ width: 10, height: 10, background: 'var(--ink-3)', display: 'inline-block', borderRadius: 2 }} />
                  In use: <strong style={{ color: 'var(--ink)' }}>{pesoShort(outstandingPrincipal)} ({utilizationPct}%)</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span style={{ width: 10, height: 10, background: 'var(--teal)', display: 'inline-block', borderRadius: 2 }} />
                  Available: <strong style={{ color: 'var(--teal-dark)' }}>{availablePct}%</strong>
                </span>
              </div>
              {activeLoan && (
                <span>Total Repaid: <strong style={{ color: 'var(--ink)' }}>{repaymentPct}%</strong></span>
              )}
            </div>

            {kycStatus === 'verified' && availableCredit > 0 && (
              <div
                className="flex items-center justify-between gap-3 flex-wrap mt-5 pt-5"
                style={{ borderTop: '1px dashed var(--line-md)' }}
              >
                <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
                  Use your available credit on gadgets, appliances, and more from partner merchants.
                </p>
                <Link href="/products" className="btn-secondary flex-shrink-0" style={{ fontSize: 13, padding: '10px 18px' }}>
                  Browse products →
                </Link>
              </div>
            )}
          </div>

          {/* ── Priority Action Section ── */}
          {kycStatus !== 'verified' ? (
            priorityAlert && (
              <div className={`hero-action ${priorityAlert.tone === 'danger' ? 'overdue' : 'due'}`}>
                <div>
                  <p className="hero-eyebrow" style={{ color: priorityAlert.tone === 'danger' ? 'var(--magenta)' : 'var(--marigold-dark)' }}>
                    {priorityAlert.title}
                  </p>
                  <p className="hero-sub" style={{ marginTop: 2 }}>{priorityAlert.body}</p>
                </div>
                {priorityAlert.cta && (
                  <Link href={priorityAlert.cta.href} className="btn-primary lg flex-shrink-0">{priorityAlert.cta.label} →</Link>
                )}
              </div>
            )
          ) : activeLoan ? (
            <div className={`hero-action ${isOverdue ? 'overdue' : isUrgent ? 'due' : 'neutral'}`}>
              <div>
                <p className="hero-eyebrow" style={{ color: isOverdue ? 'var(--magenta)' : 'var(--teal-dark)' }}>
                  {isOverdue ? 'Payment overdue' : 'Next installment due'}
                </p>
                <p className="hero-amount">
                  {nextInstallment
                    ? peso(Number(nextInstallment.amount_due) - Number(nextInstallment.amount_paid))
                    : peso(Number(activeLoan.total_repayable) - paidSoFar)}
                </p>
                <p className="hero-sub">
                  {nextInstallment
                    ? `Installment #${nextInstallment.installment_number} · due ${formatDate(nextInstallment.due_date)}`
                    : 'Loan balance remaining'}
                </p>
              </div>
              <Link href={`/loans/${activeLoan.id}/pay`} className="btn-primary lg flex-shrink-0">
                Pay now →
              </Link>
            </div>
          ) : completedCount > 0 ? (
            /* Blueprint Level-Up State: Turns zero debt into a high score */
            <div className="hero-action blueprint">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="stamp flat" style={{ color: 'var(--teal-dark)', borderColor: 'var(--teal-dark)', background: '#FFF' }}>
                    ★ Tier {completedCount} Borrower
                  </span>
                </div>
                <p className="hero-amount mt-2" style={{ fontSize: 32 }}>Ready for your next step?</p>
                <p className="hero-sub font-mono text-xs mt-1" style={{ color: 'var(--teal-dark)' }}>
                  {completedCount} loan{completedCount !== 1 ? 's' : ''} paid on schedule • 100% limit unlocked for instant release.
                </p>
              </div>
              <Link href="/loans/apply" className="btn-primary lg flex-shrink-0">Apply again →</Link>
            </div>
          ) : (
            <div className="hero-action neutral">
              <div>
                <p className="hero-eyebrow" style={{ color: 'var(--teal-dark)' }}>You're approved</p>
                <p className="hero-amount" style={{ fontSize: 32 }}>Start your first loan</p>
                <p className="hero-sub">Choose your amount and terms to get started immediately.</p>
              </div>
              <Link href="/loans/apply" className="btn-primary lg flex-shrink-0">Apply now →</Link>
            </div>
          )}

          {/* Secondary alert */}
          {priorityAlert && kycStatus === 'verified' && !activeLoan && (
            <div
              className="flex items-center justify-between gap-4 flex-wrap px-5 py-4 ledger-card"
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
                <Link href={priorityAlert.cta.href} className="btn-secondary flex-shrink-0">{priorityAlert.cta.label}</Link>
              )}
            </div>
          )}

          {/* ── ASYMMETRIC DESKTOP GRID (2/3 Left + 1/3 Right) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left Column (2 Spans): Active Ledger OR Repayment Track Record */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              
              {activeLoan && installments.length > 0 ? (
                <div className="ledger-card overflow-hidden">
                  <div className="punch-line" />
                  <div className="p-6 pb-4 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h2 className="font-display text-xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>Installment Schedule</h2>
                      <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                        Loan ID #{activeLoan.id.slice(0, 8)} · {pesoShort(Number(activeLoan.principal_amount))} principal
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="stamp flat" style={{ color: 'var(--teal-dark)', borderColor: 'var(--teal)' }}>
                        {activeLoan.status === 'approved' ? 'Pending release' : activeLoan.status}
                      </span>
                    </div>
                  </div>

                  {/* Comprehensive Ledger Table */}
                  <div className="ledger-table-wrap">
                    <table className="ledger-table">
                      <thead>
                        <tr>
                          <th style={{ paddingLeft: 24 }}>#</th>
                          <th>Due Date</th>
                          <th>Amount Due</th>
                          <th>Paid</th>
                          <th>Status</th>
                          <th style={{ paddingRight: 24, textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {installments.map((inst) => {
                          const due = Number(inst.amount_due);
                          const paid = Number(inst.amount_paid);
                          const isPaid = paid >= due;
                          const isOver = inst.status === 'overdue';
                          const isNext = nextInstallment?.id === inst.id;

                          return (
                            <tr key={inst.id} style={{ background: isNext ? 'var(--marigold-bg)' : 'transparent' }}>
                              <td className="font-mono font-bold" style={{ paddingLeft: 24, color: 'var(--ink)' }}>
                                {String(inst.installment_number).padStart(2, '0')}
                              </td>
                              <td className="font-mono text-xs" style={{ color: isOver ? 'var(--magenta)' : 'var(--ink-2)' }}>
                                {formatDate(inst.due_date)}
                              </td>
                              <td className="font-mono font-bold" style={{ color: 'var(--ink)' }}>
                                {peso(due)}
                              </td>
                              <td className="font-mono" style={{ color: isPaid ? 'var(--teal-dark)' : 'var(--ink-4)' }}>
                                {peso(paid)}
                              </td>
                              <td>
                                {isPaid ? (
                                  <span className="stamp flat" style={{ fontSize: 10, padding: '2px 6px', color: 'var(--teal-dark)', borderColor: 'var(--teal)', background: 'var(--teal-bg)' }}>
                                    ✓ Paid
                                  </span>
                                ) : isOver ? (
                                  <span className="stamp flat" style={{ fontSize: 10, padding: '2px 6px', color: 'var(--magenta)', borderColor: 'var(--magenta)', background: 'var(--magenta-bg)' }}>
                                    Overdue
                                  </span>
                                ) : isNext ? (
                                  <span className="stamp flat" style={{ fontSize: 10, padding: '2px 6px', color: 'var(--marigold-dark)', borderColor: 'var(--marigold-dark)', background: '#FFF' }}>
                                    Due Next
                                  </span>
                                ) : (
                                  <span className="font-mono text-xs" style={{ color: 'var(--ink-4)' }}>Upcoming</span>
                                )}
                              </td>
                              <td style={{ paddingRight: 24, textAlign: 'right' }}>
                                {!isPaid && (
                                  <Link href={`/loans/${activeLoan.id}/pay`} className={`btn-primary sm ${isNext || isOver ? '' : 'opacity-60'}`}>
                                    Pay {pesoShort(due - paid)}
                                  </Link>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Journey Tracker Footer */}
                  <div className="p-6" style={{ borderTop: '1.5px dashed var(--line-md)', background: 'var(--paper)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs" style={{ color: 'var(--ink-3)' }}>
                        Loan Lifecycle: <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{JOURNEY_LABELS[journeyStatus ?? 'pending']}</span>
                      </span>
                      <span className="font-mono text-xs font-bold" style={{ color: 'var(--teal-dark)' }}>
                        {repaymentPct}% Repaid
                      </span>
                    </div>
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
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${repaymentPct}%` }} />
                    </div>
                  </div>
                </div>
              ) : completedCount > 0 ? (
                /* Zero-Debt Enrichment Card: Fills the left column when no active loans exist */
                <div className="ledger-card overflow-hidden">
                  <div className="punch-line" />
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-display text-xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>Repayment Track Record</h2>
                      <span className="stamp flat" style={{ color: 'var(--teal-dark)', borderColor: 'var(--teal)' }}>Good Standing</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 py-4" style={{ borderTop: '1px dashed var(--line-md)', borderBottom: '1px dashed var(--line-md)' }}>
                      <div>
                        <p className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>Completed Loans</p>
                        <p className="font-display text-2xl mt-1" style={{ color: 'var(--ink)' }}>{completedCount}</p>
                      </div>
                      <div>
                        <p className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>On-Time Rate</p>
                        <p className="font-display text-2xl mt-1" style={{ color: 'var(--teal-dark)' }}>100%</p>
                      </div>
                      <div>
                        <p className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>Available Status</p>
                        <p className="font-mono text-sm font-bold mt-2" style={{ color: 'var(--teal)' }}>Unlocked</p>
                      </div>
                    </div>
                    <p className="text-sm mt-4" style={{ color: 'var(--ink-3)' }}>
                      You have no active balances or pending installments. Your consistent repayment history ensures rapid disbursement on your next application.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Pending application */}
              {!activeLoan && pendingLoan && (
                <div className="ledger-card overflow-hidden">
                  <div className="punch-line" />
                  <div className="p-6">
                    <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--ink-4)' }}>
                      Your application
                    </p>
                    <p className="text-sm mb-4" style={{ color: 'var(--ink-2)' }}>
                      Your application for {peso(pendingLoan.principal_amount)} is currently under review by our lending team.
                    </p>
                    <Link href={`/loans/${pendingLoan.id}`} className="text-link">View application details →</Link>
                  </div>
                </div>
              )}

              {/* Recent payments table */}
              <div className="ledger-card overflow-hidden">
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
                        <span className="stamp flat" style={{ color: 'var(--teal-dark)', borderColor: 'var(--teal)' }}>Paid</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-6 py-10 text-center">
                    <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No payments recorded yet.</p>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column (1 Span): Stacked Navigation & Trust Perks */}
            <div className="flex flex-col gap-8">
              
              {/* Stacked Quick Nav Sidebar */}
              <div className="ledger-card overflow-hidden">
                <div className="px-5 py-3.5" style={{ background: 'var(--paper)', borderBottom: '1.5px solid var(--line-md)' }}>
                  <span className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>Quick Access</span>
                </div>
                <div className="sidebar-nav">
                  <Link href="/loans" className="sidebar-nav-item">
                    <div className="flex items-center gap-3">
                      <span className="sidebar-nav-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 3v18h18" />
                          <path d="M18.7 8.3l-5.2 5.2-3-3-4.5 4.5" />
                        </svg>
                      </span>
                      <div>
                        <span className="sidebar-nav-label">Loan history</span>
                        <span className="sidebar-nav-sub">{loans?.length ?? 0} total loan{(loans?.length ?? 0) !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <span style={{ color: 'var(--ink-4)' }}>→</span>
                  </Link>

                  <Link href="/loans" className="sidebar-nav-item">
                    <div className="flex items-center gap-3">
                      <span className="sidebar-nav-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="16" rx="2" />
                          <path d="M3 9h18" />
                          <path d="M8 3v3" /><path d="M16 3v3" />
                        </svg>
                      </span>
                      <div>
                        <span className="sidebar-nav-label">Payments</span>
                        <span className="sidebar-nav-sub">All transactions</span>
                      </div>
                    </div>
                    <span style={{ color: 'var(--ink-4)' }}>→</span>
                  </Link>

                  <Link href="/products" className="sidebar-nav-item">
                    <div className="flex items-center gap-3">
                      <span className="sidebar-nav-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                          <path d="M3 6h18" />
                          <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                      </span>
                      <div>
                        <span className="sidebar-nav-label">Shop & finance</span>
                        <span className="sidebar-nav-sub">{pesoShort(availableCredit)} available</span>
                      </div>
                    </div>
                    <span style={{ color: 'var(--ink-4)' }}>→</span>
                  </Link>

                  <Link href="/profile" className="sidebar-nav-item">
                    <div className="flex items-center gap-3">
                      <span className="sidebar-nav-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
                        </svg>
                      </span>
                      <div>
                        <span className="sidebar-nav-label">Profile settings</span>
                        <span className="sidebar-nav-sub">{kycStatus === 'verified' ? 'Verified status' : 'Manage KYC'}</span>
                      </div>
                    </div>
                    <span style={{ color: 'var(--ink-4)' }}>→</span>
                  </Link>
                </div>
              </div>

              {/* Borrower Protection & Security Card */}
              <div className="ledger-card overflow-hidden p-6" style={{ background: 'var(--paper-2)', borderStyle: 'dashed' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: 18 }}>🛡️</span>
                  <h3 className="font-display text-base font-semibold" style={{ color: 'var(--ink)' }}>Borrower Protection</h3>
                </div>
                <ul className="flex flex-col gap-2.5 font-mono text-xs" style={{ color: 'var(--ink-3)' }}>
                  <li className="flex items-center gap-2">✓ 256-bit SSL encryption</li>
                  <li className="flex items-center gap-2">✓ BSP-aligned interest practices</li>
                  <li className="flex items-center gap-2">✓ Data Privacy Act compliant</li>
                  <li className="flex items-center gap-2">✓ Transparent schedule & zero hidden fees</li>
                </ul>
              </div>

            </div>

          </div>

        </main>
      </div>
    </>
  )
}