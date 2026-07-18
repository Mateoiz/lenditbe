// app/dashboard/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function peso(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(d: string | null) {
  if (!d) return null
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  return diff
}

const JOURNEY_STEPS = ['pending', 'approved', 'disbursed', 'active', 'completed'] as const

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (admin) {
    redirect('/admin')
  }

  const { data: borrower } = await supabase
    .from('borrowers')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const { data: loans } = await supabase
    .from('loans')
    .select('*')
    .eq('borrower_id', user.id)
    .order('created_at', { ascending: false })

  const activeLoan = loans?.find((l) =>
    ['approved', 'active', 'disbursed', 'overdue'].includes(l.status)
  )
  const pendingLoan = loans?.find((l) => l.status === 'pending')

  let nextInstallment = null
  if (activeLoan) {
    const { data: installment } = await supabase
      .from('loan_installments')
      .select('*')
      .eq('loan_id', activeLoan.id)
      .in('status', ['upcoming', 'due', 'overdue'])
      .order('installment_number', { ascending: true })
      .limit(1)
      .maybeSingle()
    nextInstallment = installment
  }

  const { data: recentPayments } = await supabase
    .from('payments')
    .select('*')
    .eq('borrower_id', user.id)
    .order('paid_at', { ascending: false })
    .limit(5)

  const kycStatus = borrower?.kyc_status ?? 'pending'
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

  const RADIUS = 42
  const CIRC = 2 * Math.PI * RADIUS
  const ringOffset = CIRC - (utilizationPct / 100) * CIRC
  const ringColor = utilizationPct >= 90 ? 'var(--magenta)' : utilizationPct >= 60 ? 'var(--marigold)' : 'var(--teal)'

  const journeyStatus = activeLoan?.status === 'overdue' ? 'active' : (activeLoan?.status ?? null)
  const journeyIndex = journeyStatus ? JOURNEY_STEPS.indexOf(journeyStatus as any) : -1

  let paidSoFar = 0
  if (activeLoan) {
    const { data: loanPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('loan_id', activeLoan.id)
    paidSoFar = (loanPayments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  }
  const repaymentPct = activeLoan
    ? Math.min(100, Math.round((paidSoFar / Number(activeLoan.total_repayable)) * 100))
    : 0

  const dueDays = nextInstallment ? daysUntil(nextInstallment.due_date) : null
  const isUrgent = dueDays !== null && dueDays <= 3

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');

        :root {
          --paper:     #FFFDF7;
          --paper-2:   #F5F0E4;
          --card:      #FFFFFF;

          --ink:       #14110F;
          --ink-2:     #3A362F;
          --ink-3:     #6B655A;
          --ink-4:     #9C9484;

          --teal:      #0B5D52;
          --teal-dark: #073F38;
          --teal-bg:   #E5F1EE;
          --teal-bdr:  #B9D9D2;

          --marigold:      #F5A623;
          --marigold-dark: #B87814;
          --marigold-bg:   #FDF0DA;
          --marigold-bdr:  #F0CE93;

          --magenta:     #C81E5C;
          --magenta-bg:  #FBE7EF;
          --magenta-bdr: #EFB4CB;

          --line:      rgba(20, 17, 15, 0.10);
          --line-md:   rgba(20, 17, 15, 0.18);
        }

        .font-display { font-family: 'Fraunces', Georgia, serif; }
        .font-mono    { font-family: 'Space Mono', monospace; }
        body { font-family: 'Inter', -apple-system, sans-serif; }

        /* --- Ledger card with punch-hole tear line --- */
        .ledger-card {
          background: var(--card);
          border: 1.5px solid var(--line-md);
          border-radius: 6px;
          position: relative;
        }
        .punch-line {
          height: 14px;
          background-image: radial-gradient(circle, var(--paper) 3.5px, transparent 4px);
          background-size: 18px 14px;
          background-position: 9px center;
          border-bottom: 1.5px dashed var(--line-md);
        }

        .btn-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 24px; border-radius: 4px;
          background: var(--marigold);
          color: var(--teal-dark); font-size: 14px; font-weight: 700;
          text-decoration: none; border: 1.5px solid var(--ink);
          box-shadow: 3px 3px 0 var(--ink);
          transition: all 0.15s ease;
        }
        .btn-primary:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--ink); }
        .btn-primary:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 var(--ink); }

        .btn-secondary {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 22px; border-radius: 4px;
          background: var(--card);
          color: var(--ink-2); font-size: 14px; font-weight: 600;
          text-decoration: none; border: 1.5px solid var(--line-md);
          transition: all 0.15s ease;
        }
        .btn-secondary:hover { border-color: var(--teal); color: var(--teal); background: var(--teal-bg); }

        /* --- Ink stamp badge --- */
        .stamp {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em;
          padding: 4px 10px; border-radius: 3px;
          border: 2px solid; transform: rotate(-3deg);
          mix-blend-mode: multiply;
        }

        /* --- Credit utilization ring --- */
        .ring-wrap { position: relative; width: 108px; height: 108px; flex-shrink: 0; }
        .ring-wrap svg { transform: rotate(-90deg); }
        .ring-track { fill: none; stroke: var(--paper-2); stroke-width: 9; }
        .ring-fill  { fill: none; stroke-width: 9; stroke-linecap: butt; transition: stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1); }
        .ring-center {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
        }

        /* --- Loan journey stepper --- */
        .journey-track { display: flex; align-items: center; }
        .journey-step { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; }
        .journey-dot {
          width: 22px; height: 22px; border-radius: 3px;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; font-family: 'Space Mono', monospace;
          border: 2px solid var(--line-md); background: var(--card); color: var(--ink-4);
          z-index: 1; transition: all 0.3s ease;
        }
        .journey-dot.done { background: var(--teal); border-color: var(--teal-dark); color: #fff; }
        .journey-dot.current {
          background: var(--marigold); border-color: var(--ink); color: var(--teal-dark);
        }
        .journey-line {
          position: absolute; top: 11px; left: 50%; width: 100%; height: 2px;
          background: var(--line-md); z-index: 0;
        }
        .journey-line.done { background: var(--teal); }
        .journey-step:last-child .journey-line { display: none; }
        .journey-label {
          font-size: 10px; font-family: 'Space Mono', monospace; text-transform: uppercase;
          letter-spacing: 0.05em; color: var(--ink-4); margin-top: 8px; text-align: center;
        }
        .journey-label.active { color: var(--ink-2); font-weight: 700; }

        .countdown-pill {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: 'Space Mono', monospace; font-size: 12px; font-weight: 700;
          padding: 4px 10px; border-radius: 3px; border: 1.5px solid;
        }

        .progress-track { width: 100%; height: 10px; border-radius: 2px; background: var(--paper-2); overflow: hidden; border: 1px solid var(--line-md); }
        .progress-fill { height: 100%; background: repeating-linear-gradient(135deg, var(--teal), var(--teal) 8px, var(--teal-dark) 8px, var(--teal-dark) 16px); transition: width 0.6s ease; }

        .seal-strip {
          display: flex; flex-wrap: wrap; gap: 24px; align-items: center; justify-content: center;
          padding: 20px; border-radius: 6px; background: var(--paper-2); border: 1.5px dashed var(--line-md);
        }
        .seal-item {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; font-family: 'Space Mono', monospace; color: var(--ink-3);
        }
      `}</style>

      <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
        <header
          className="flex items-center justify-between px-6 sm:px-10 py-5"
          style={{ borderBottom: '2px solid var(--ink)', background: 'var(--paper)' }}
        >
          <Link
            href="/"
            className="font-display text-2xl"
            style={{ color: 'var(--ink)', fontWeight: 600 }}
          >
            Lendit
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: '50%', background: 'var(--marigold)',
                color: 'var(--teal-dark)', fontSize: 15, fontWeight: 700, marginLeft: 2,
                border: '1.5px solid var(--ink)', verticalAlign: 'middle',
              }}
            >
              Be
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {isStudent && (
              <span className="stamp hidden sm:inline-flex" style={{ color: 'var(--teal-dark)', borderColor: 'var(--teal)' }}>
                Student
              </span>
            )}
            <span className="text-sm hidden sm:inline" style={{ color: 'var(--ink-3)' }}>
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm font-medium px-3 py-1.5 rounded"
                style={{ color: 'var(--ink-3)' }}
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 sm:px-10 py-10">
          <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            Welcome back, {firstName}.
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--ink-3)' }}>
            Here&apos;s where things stand with your account.
          </p>

          {kycStatus !== 'verified' && (
            <div
              className="flex items-center justify-between gap-4 flex-wrap px-5 py-4 mb-8 ledger-card"
              style={{
                background: kycStatus === 'rejected' ? 'var(--magenta-bg)' : 'var(--marigold-bg)',
                borderColor: kycStatus === 'rejected' ? 'var(--magenta-bdr)' : 'var(--marigold-bdr)',
              }}
            >
              <div>
                <p
                  className="text-sm font-semibold mb-0.5"
                  style={{ color: kycStatus === 'rejected' ? 'var(--magenta)' : 'var(--marigold-dark)' }}
                >
                  {kycStatus === 'rejected'
                    ? 'Your verification was not approved'
                    : 'Finish verifying your identity'}
                </p>
                <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                  {kycStatus === 'rejected'
                    ? 'Review the details on your profile and resubmit your ID.'
                    : 'Our underwriting algorithm requires a verified profile before you can apply for a loan.'}
                </p>
              </div>
              <Link href="/profile/verify" className="btn-primary flex-shrink-0">
                {kycStatus === 'rejected' ? 'Resubmit' : 'Verify now'}
              </Link>
            </div>
          )}

          {isUrgent && nextInstallment && activeLoan && (
            <div
              className="flex items-center justify-between gap-4 flex-wrap px-5 py-4 mb-8 ledger-card"
              style={{ background: 'var(--magenta-bg)', borderColor: 'var(--magenta-bdr)' }}
            >
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--magenta)' }}>
                  {dueDays !== null && dueDays < 0
                    ? `Payment overdue by ${Math.abs(dueDays)} day${Math.abs(dueDays) !== 1 ? 's' : ''}`
                    : dueDays === 0
                    ? 'Payment due today'
                    : `Payment due in ${dueDays} day${dueDays !== 1 ? 's' : ''}`}
                </p>
                <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                  {peso(Number(nextInstallment.amount_due) - Number(nextInstallment.amount_paid))} for installment #{nextInstallment.installment_number}
                </p>
              </div>
              <Link href={`/loans/${activeLoan.id}/pay`} className="btn-primary flex-shrink-0">
                Pay now
              </Link>
            </div>
          )}

          <div className="grid sm:grid-cols-5 gap-5 mb-8">
            <div className="ledger-card sm:col-span-2 p-6 flex items-center gap-5">
              <div className="ring-wrap">
                <svg width="108" height="108" viewBox="0 0 108 108">
                  <circle className="ring-track" cx="54" cy="54" r={RADIUS} />
                  <circle
                    className="ring-fill"
                    cx="54" cy="54" r={RADIUS}
                    stroke={ringColor}
                    strokeDasharray={CIRC}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div className="ring-center">
                  <span className="font-display text-2xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>{utilizationPct}%</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>used</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--ink-4)' }}>
                  Available credit
                </p>
                <p className="font-display text-2xl mb-2" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                  {peso(availableCredit)}
                </p>
                <p className="text-xs font-mono" style={{ color: 'var(--ink-3)' }}>
                  of {peso(creditLimitValue)} limit
                </p>
                {outstandingPrincipal > 0 && (
                  <p className="text-xs font-mono mt-1" style={{ color: 'var(--ink-4)' }}>
                    {peso(outstandingPrincipal)} outstanding
                  </p>
                )}
              </div>
            </div>

            <div className="ledger-card sm:col-span-3 overflow-hidden">
              <div className="punch-line" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>
                    {activeLoan ? 'Active loan' : 'Loan status'}
                  </p>
                  {activeLoan && (
                    <span
                      className="stamp"
                      style={{
                        color: activeLoan.status === 'overdue' ? 'var(--magenta)' : 'var(--teal-dark)',
                        borderColor: activeLoan.status === 'overdue' ? 'var(--magenta)' : 'var(--teal)',
                      }}
                    >
                      {activeLoan.status === 'approved' ? 'Pending release' : activeLoan.status}
                    </span>
                  )}
                </div>

                {activeLoan ? (
                  <>
                    <p className="font-display text-3xl mb-4" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                      {peso(activeLoan.total_repayable)}
                    </p>

                    <div className="journey-track mb-4">
                      {JOURNEY_STEPS.map((step, i) => (
                        <div key={step} className="journey-step">
                          {i > 0 && <div className={`journey-line ${i <= journeyIndex ? 'done' : ''}`} />}
                          <div className={`journey-dot ${i < journeyIndex ? 'done' : i === journeyIndex ? 'current' : ''}`}>
                            {i < journeyIndex ? '✓' : i + 1}
                          </div>
                          <span className={`journey-label ${i === journeyIndex ? 'active' : ''}`}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono mb-1.5" style={{ color: 'var(--ink-3)' }}>
                      <span>{peso(paidSoFar)} paid</span>
                      <span>{repaymentPct}%</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${repaymentPct}%` }} />
                    </div>
                  </>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
                    {pendingLoan ? 'Your application is under review.' : 'No active loan right now.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {nextInstallment && !isUrgent && (
            <div className="ledger-card p-6 mb-8 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--ink-4)' }}>
                  Next payment due
                </p>
                <p className="font-display text-2xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                  {peso(Number(nextInstallment.amount_due) - Number(nextInstallment.amount_paid))}
                </p>
              </div>
              <span
                className="countdown-pill"
                style={{ background: 'var(--teal-bg)', color: 'var(--teal-dark)', borderColor: 'var(--teal-bdr)' }}
              >
                due {formatDate(nextInstallment.due_date)}
                {dueDays !== null && ` · ${dueDays}d`}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mb-10">
            {kycStatus === 'verified' && availableCredit >= 1000 && (
              <Link href="/loans/apply" className="btn-primary">
                {activeLoan ? 'Apply for another loan' : 'Apply for a loan'}
              </Link>
            )}
            {pendingLoan && (
              <span className="stamp" style={{ color: 'var(--teal-dark)', borderColor: 'var(--teal)' }}>
                Under review
              </span>
            )}
            {activeLoan && (
              <Link href={`/loans/${activeLoan.id}/pay`} className="btn-primary">
                Make a payment
              </Link>
            )}
            <Link href="/loans" className="btn-secondary">
              View loan history
            </Link>
            <Link href="/profile" className="btn-secondary">
              Manage profile
            </Link>
          </div>

          <div className="ledger-card overflow-hidden mb-8">
            <div className="punch-line" />
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1.5px solid var(--line)' }}
            >
              <h2 className="font-display text-lg" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                Recent payments
              </h2>
              <Link href="/loans" className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--teal)' }}>
                See all
              </Link>
            </div>

            {recentPayments && recentPayments.length > 0 ? (
              <ul>
                {recentPayments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between px-6 py-4 font-mono text-sm"
                    style={{ borderBottom: '1px dashed var(--line)' }}
                  >
                    <div>
                      <p style={{ color: 'var(--ink)' }}>{peso(p.amount)}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                        {formatDate(p.paid_at)} · {p.channel ?? 'unspecified'}
                      </p>
                    </div>
                    <span className="stamp" style={{ color: 'var(--teal-dark)', borderColor: 'var(--teal)' }}>
                      Paid
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-10 text-center">
                <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
                  No payments recorded yet.
                </p>
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