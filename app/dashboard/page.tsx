// app/dashboard/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function peso(n: number) {
  return `\u20b1${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Gatekeeper: Bounce administrators to the admin portal
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

  // Active / most relevant loan (includes 'approved' from automated underwriting)
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

  // Compute algorithmic credit limit display based on student vs. working rules
  const getCreditLimitText = () => {
    if (!borrower) return peso(0)
    if (isStudent) {
      const completedCount = loans?.filter(l => l.status === 'completed').length || 0
      const cap = completedCount === 0 ? 500 : completedCount === 1 ? 1000 : 1500
      return peso(cap)
    }
    return peso(borrower.credit_limit || (borrower.monthly_income ? borrower.monthly_income * 0.15 : 2500))
  }

  return (
    <>
<style>{`
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

  :root {
    /* Crisp, high-contrast digital canvas (replaces earthy cream) */
    --bg:        #F4F6FB;
    --bg-2:      #EAEEF6;
    --bg-card:   #FFFFFF;
    
    /* Deep slate ink for punchier readability */
    --ink:       #0F172A;
    --ink-2:     #334155;
    --ink-3:     #64748B;
    --ink-4:     #94A3B8;
    
    /* POPPY ELECTRIC VIOLET (Drives action and digital trust) */
    --blue:      #4F46E5;
    --blue-mid:  #6366F1;
    --blue-bg:   #EEF2FF;
    --blue-bdr:  #C7D2FE;
    
    /* Subtler, crisper borders */
    --line:      rgba(15, 23, 42, 0.06);
    --line-md:   rgba(15, 23, 42, 0.12);
    
    /* Vibrant Amber for urgent KYC alerts */
    --amber:     #D97706;
    --amber-bg:  #FFFBEB;
    --amber-bdr: #FDE68A;
    
    /* Neo-Mint Green for money, approval, and paid status */
    --green:     #059669;
    --green-bg:  #ECFDF5;
    --green-bdr: #6EE7B7;
    
    /* Clean Coral/Red for overdue/rejection */
    --red:       #E11D48;
    --red-bg:    #FFF1F2;
    --red-bdr:   #FECDD3;
  }

  .font-serif { font-family: 'DM Serif Display', Georgia, serif; }
  .font-mono  { font-family: 'JetBrains Mono', monospace; }
  
  /* Global sans-serif upgrade for a slick app feel */
  body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }

  .card {
    background: var(--bg-card);
    border: 1px solid var(--line);
    border-radius: 20px;
    box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.04), 0 4px 10px -3px rgba(15, 23, 42, 0.02);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .card:hover {
    box-shadow: 0 20px 35px -5px rgba(99, 102, 241, 0.08);
  }

  /* THE HIGH-CONVERTING "POPPY" CTA BUTTON */
  .btn-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 12px 24px; border-radius: 12px;
    background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
    color: #fff; font-size: 14px; font-weight: 600;
    text-decoration: none;
    border: none;
    box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .btn-primary:hover { 
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    transform: translateY(-2px) scale(1.01); 
    box-shadow: 0 6px 20px 0 rgba(99, 102, 241, 0.55);
  }
  .btn-primary:active {
    transform: translateY(0) scale(0.99);
  }

  .btn-secondary {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 12px 22px; border-radius: 12px;
    background: var(--bg-card);
    color: var(--ink-2); font-size: 14px; font-weight: 600;
    text-decoration: none;
    border: 1px solid var(--line-md);
    box-shadow: 0 2px 5px rgba(15, 23, 42, 0.02);
    transition: all 0.2s ease;
  }
  .btn-secondary:hover { 
    background: var(--bg-2); 
    color: var(--ink);
    border-color: var(--ink-3);
  }
`}</style>

      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-6 sm:px-10 py-5"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <Link
            href="/"
            className="font-serif text-xl"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: 'var(--ink)' }}
          >
            Lendit<span style={{ color: 'var(--blue-mid)', fontStyle: 'italic' }}>Be</span>
          </Link>
          <div className="flex items-center gap-3">
            {isStudent && (
              <span 
                className="text-xs font-mono px-2.5 py-1 rounded-md uppercase tracking-wider hidden sm:inline"
                style={{ background: 'var(--blue-bg)', color: 'var(--blue-mid)', border: '1px solid var(--blue-bdr)' }}
              >
                Student Account
              </span>
            )}
            <span className="text-sm hidden sm:inline" style={{ color: 'var(--ink-3)' }}>
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm font-medium px-3 py-1.5 rounded-lg"
                style={{ color: 'var(--ink-3)' }}
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 sm:px-10 py-10">
          <h1 className="font-serif text-3xl mb-1" style={{ color: 'var(--ink)' }}>
            Welcome back, {firstName}.
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--ink-3)' }}>
            Here&apos;s where things stand with your account.
          </p>

          {/* KYC banner */}
          {kycStatus !== 'verified' && (
            <div
              className="flex items-center justify-between gap-4 flex-wrap rounded-xl px-5 py-4 mb-8"
              style={{
                background: kycStatus === 'rejected' ? 'var(--red-bg)' : 'var(--amber-bg)',
                border: `1px solid ${kycStatus === 'rejected' ? 'var(--red-bdr)' : 'var(--amber-bdr)'}`,
              }}
            >
              <div>
                <p
                  className="text-sm font-semibold mb-0.5"
                  style={{ color: kycStatus === 'rejected' ? 'var(--red)' : 'var(--amber)' }}
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

          {/* Summary cards */}
          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            <div className="card p-6">
              <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--ink-4)' }}>
                Credit limit
              </p>
              <p className="font-serif text-3xl" style={{ color: 'var(--ink)' }}>
                {getCreditLimitText()}
              </p>
              <span className="text-xs font-mono mt-1 inline-block" style={{ color: 'var(--ink-3)' }}>
                {isStudent ? 'Allowance-protected micro-cap' : 'Max 15% DTI capacity'}
              </span>
            </div>

            <div className="card p-6">
              <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--ink-4)' }}>
                Active loan
              </p>
              <p className="font-serif text-3xl" style={{ color: 'var(--ink)' }}>
                {activeLoan ? peso(activeLoan.total_repayable) : '—'}
              </p>
              {activeLoan && (
                <span
                  className="text-xs font-mono mt-1 inline-block capitalize px-2 py-0.5 rounded"
                  style={{ 
                    background: activeLoan.status === 'overdue' ? 'var(--red-bg)' : 'var(--blue-bg)',
                    color: activeLoan.status === 'overdue' ? 'var(--red)' : 'var(--blue-mid)' 
                  }}
                >
                  {activeLoan.status === 'approved' ? 'Approved (Pending Disbursement)' : activeLoan.status}
                </span>
              )}
            </div>

            <div className="card p-6">
              <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--ink-4)' }}>
                Next payment due
              </p>
              <p className="font-serif text-3xl" style={{ color: 'var(--ink)' }}>
                {nextInstallment ? peso(nextInstallment.amount_due) : '—'}
              </p>
              {nextInstallment && (
                <span className="text-xs font-mono mt-1 inline-block" style={{ color: 'var(--ink-3)' }}>
                  due {formatDate(nextInstallment.due_date)}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mb-10">
            {kycStatus === 'verified' && !activeLoan && !pendingLoan && (
              <Link href="/loans/apply" className="btn-primary">
                Apply for a loan
              </Link>
            )}
            {pendingLoan && (
              <span
                className="text-sm font-mono px-4 py-2.5 rounded-lg"
                style={{ background: 'var(--blue-bg)', color: 'var(--blue-mid)', border: '1px solid var(--blue-bdr)' }}
              >
                Your application is under review
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

          {/* Recent payments */}
          <div className="card overflow-hidden">
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--line)' }}
            >
              <h2 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                Recent payments
              </h2>
              <Link href="/loans" className="text-xs font-medium" style={{ color: 'var(--blue-mid)' }}>
                See all
              </Link>
            </div>

            {recentPayments && recentPayments.length > 0 ? (
              <ul>
                {recentPayments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between px-6 py-4 font-mono text-sm"
                    style={{ borderBottom: '1px solid var(--line)' }}
                  >
                    <div>
                      <p style={{ color: 'var(--ink)' }}>{peso(p.amount)}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                        {formatDate(p.paid_at)} · {p.channel ?? 'unspecified'}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2.5 py-1 rounded-full capitalize"
                      style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-bdr)' }}
                    >
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
        </main>
      </div>
    </>
  )
}