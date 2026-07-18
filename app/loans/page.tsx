// app/loans/page.tsx
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

const STATUS_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending:   { label: 'Under Review',        bg: 'var(--amber-bg)',  color: 'var(--amber)',    border: 'var(--amber-bdr)' },
  approved:  { label: 'Approved',            bg: 'var(--blue-bg)',   color: 'var(--blue-mid)', border: 'var(--blue-bdr)' },
  disbursed: { label: 'Disbursed',           bg: 'var(--blue-bg)',   color: 'var(--blue-mid)', border: 'var(--blue-bdr)' },
  active:    { label: 'Active',              bg: 'var(--green-bg)',  color: 'var(--green)',    border: 'var(--green-bdr)' },
  completed: { label: 'Completed',           bg: 'var(--green-bg)',  color: 'var(--green)',    border: 'var(--green-bdr)' },
  overdue:   { label: 'Overdue',             bg: 'var(--red-bg)',    color: 'var(--red)',      border: 'var(--red-bdr)' },
  defaulted: { label: 'Defaulted',           bg: 'var(--red-bg)',    color: 'var(--red)',      border: 'var(--red-bdr)' },
  rejected:  { label: 'Not Approved',        bg: '#F8FAFC',          color: 'var(--ink-3)',    border: 'var(--line-md)' },
}

export default async function LoansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: loans } = await supabase
    .from('loans')
    .select('*')
    .eq('borrower_id', user.id)
    .order('created_at', { ascending: false })

  // For each active/disbursed/approved loan, grab next installment
  const loanIds = (loans ?? [])
    .filter(l => ['active', 'disbursed', 'approved', 'overdue'].includes(l.status))
    .map(l => l.id)

  const { data: nextInstallments } = loanIds.length > 0
    ? await supabase
        .from('loan_installments')
        .select('*')
        .in('loan_id', loanIds)
        .in('status', ['upcoming', 'due', 'overdue'])
        .order('installment_number', { ascending: true })
    : { data: [] }

  // Map loan_id → next installment
  const nextByLoan: Record<string, any> = {}
  for (const inst of nextInstallments ?? []) {
    if (!nextByLoan[inst.loan_id]) nextByLoan[inst.loan_id] = inst
  }

  const allLoans = loans ?? []
  const activeLoans = allLoans.filter(l => ['active', 'disbursed', 'approved', 'overdue'].includes(l.status))
  const pastLoans   = allLoans.filter(l => ['completed', 'rejected', 'defaulted', 'pending'].includes(l.status))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        :root {
          --bg: #F4F6FB; --bg-2: #EAEEF6; --bg-card: #FFFFFF;
          --ink: #0F172A; --ink-2: #334155; --ink-3: #64748B; --ink-4: #94A3B8;
          --blue: #4F46E5; --blue-mid: #6366F1; --blue-bg: #EEF2FF; --blue-bdr: #C7D2FE;
          --line: rgba(15,23,42,0.06); --line-md: rgba(15,23,42,0.12);
          --amber: #D97706; --amber-bg: #FFFBEB; --amber-bdr: #FDE68A;
          --green: #059669; --green-bg: #ECFDF5; --green-bdr: #6EE7B7;
          --red: #E11D48; --red-bg: #FFF1F2; --red-bdr: #FECDD3;
        }
        body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
        .font-serif { font-family: 'DM Serif Display', Georgia, serif; }
        .font-mono  { font-family: 'JetBrains Mono', monospace; }
        .card {
          background: var(--bg-card); border: 1px solid var(--line);
          border-radius: 20px;
          box-shadow: 0 10px 30px -5px rgba(15,23,42,0.04), 0 4px 10px -3px rgba(15,23,42,0.02);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .loan-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 24px; gap: 16px; flex-wrap: wrap;
          border-bottom: 1px solid var(--line);
          transition: background 0.15s ease;
          text-decoration: none;
        }
        .loan-row:last-child { border-bottom: none; }
        .loan-row:hover { background: var(--bg); }
        .status-pill {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; font-weight: 500;
          padding: 3px 10px; border-radius: 999px;
          border: 1px solid; white-space: nowrap;
        }
        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 20px; border-radius: 12px;
          background: linear-gradient(135deg,#6366F1 0%,#8B5CF6 100%);
          color:#fff; font-size:13px; font-weight:600;
          text-decoration:none; border:none;
          box-shadow: 0 4px 14px 0 rgba(99,102,241,0.35);
          transition: all 0.2s ease;
        }
        .btn-primary:hover { background: linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%); transform: translateY(-1px); }
        .btn-ghost {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 18px; border-radius: 12px;
          color: var(--ink-2); font-size: 13px; font-weight: 600;
          text-decoration: none; border: 1px solid var(--line-md);
          background: var(--bg-card); transition: all 0.15s ease;
        }
        .btn-ghost:hover { background: var(--bg-2); border-color: var(--ink-3); }
        .section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; font-weight: 500; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--ink-4);
          margin-bottom: 12px; padding-left: 2px;
        }
        .chevron { color: var(--ink-4); flex-shrink: 0; }
      `}</style>

      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        {/* Header */}
        <header className="flex items-center justify-between px-6 sm:px-10 py-5"
          style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-card)' }}>
          <Link href="/dashboard" className="font-serif text-xl" style={{ fontFamily: "'DM Serif Display',Georgia,serif", color: 'var(--ink)' }}>
            Lendit<span style={{ color: 'var(--blue-mid)', fontStyle: 'italic' }}>Be</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/dashboard" className="btn-ghost">← Dashboard</Link>
          </nav>
        </header>

        <main className="max-w-3xl mx-auto px-6 sm:px-10 py-10">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="font-serif text-3xl mb-1" style={{ fontFamily: "'DM Serif Display',Georgia,serif", color: 'var(--ink)' }}>
                Your loans
              </h1>
              <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
                {allLoans.length === 0 ? 'No loan history yet.' : `${allLoans.length} loan${allLoans.length !== 1 ? 's' : ''} on record`}
              </p>
            </div>
            <Link href="/loans/apply" className="btn-primary">
              + New application
            </Link>
          </div>

          {allLoans.length === 0 && (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>No loans yet</p>
              <p className="text-sm mb-6" style={{ color: 'var(--ink-3)' }}>Apply for your first loan to get started.</p>
              <Link href="/loans/apply" className="btn-primary">Apply for a loan</Link>
            </div>
          )}

          {/* Active / ongoing loans */}
          {activeLoans.length > 0 && (
            <div className="mb-8">
              <p className="section-label">Active</p>
              <div className="card overflow-hidden">
                {activeLoans.map(loan => {
                  const meta = STATUS_META[loan.status] ?? STATUS_META.pending
                  const next = nextByLoan[loan.id]
                  const canPay = ['active', 'disbursed', 'approved', 'overdue'].includes(loan.status)
                  return (
                    <Link key={loan.id} href={`/loans/${loan.id}`} className="loan-row" style={{ color: 'inherit' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-serif text-lg" style={{ fontFamily: "'DM Serif Display',Georgia,serif", color: 'var(--ink)' }}>
                            {peso(loan.principal_amount)}
                          </span>
                          <span className="status-pill" style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="font-mono text-xs flex flex-wrap gap-3" style={{ color: 'var(--ink-3)' }}>
                          <span>Applied {formatDate(loan.applied_at)}</span>
                          {loan.due_date && <span>Due {formatDate(loan.due_date)}</span>}
                          {next && (
                            <span style={{ color: loan.status === 'overdue' ? 'var(--red)' : 'var(--ink-3)' }}>
                              Next payment: {peso(next.amount_due)} on {formatDate(next.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {canPay && (
                          <Link
                            href={`/loans/${loan.id}/pay`}
                            onClick={e => e.stopPropagation()}
                            className="btn-primary"
                            style={{ padding: '8px 16px', fontSize: 12 }}
                          >
                            Pay now
                          </Link>
                        )}
                        <svg className="chevron" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                        </svg>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Past loans */}
          {pastLoans.length > 0 && (
            <div>
              <p className="section-label">History</p>
              <div className="card overflow-hidden">
                {pastLoans.map(loan => {
                  const meta = STATUS_META[loan.status] ?? STATUS_META.rejected
                  return (
                    <Link key={loan.id} href={`/loans/${loan.id}`} className="loan-row" style={{ color: 'inherit' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-serif text-lg" style={{ fontFamily: "'DM Serif Display',Georgia,serif", color: loan.status === 'rejected' ? 'var(--ink-3)' : 'var(--ink)' }}>
                            {peso(loan.principal_amount)}
                          </span>
                          <span className="status-pill" style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="font-mono text-xs flex flex-wrap gap-3" style={{ color: 'var(--ink-4)' }}>
                          <span>Applied {formatDate(loan.applied_at)}</span>
                          {loan.status === 'completed' && loan.due_date && (
                            <span style={{ color: 'var(--green)' }}>Completed</span>
                          )}
                          {loan.status === 'rejected' && loan.rejection_reason && (
                            <span style={{ color: 'var(--ink-3)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {loan.rejection_reason}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg className="chevron" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                      </svg>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}