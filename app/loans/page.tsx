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
function daysUntil(d: string | null) {
  if (!d) return null
  const due = new Date(d)
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const STATUS_META: Record<string, { label: string; color: string; border: string }> = {
  pending:   { label: 'Under review',  color: 'var(--marigold-dark)', border: 'var(--marigold)' },
  approved:  { label: 'Approved',      color: 'var(--teal-dark)',     border: 'var(--teal)' },
  disbursed: { label: 'Disbursed',     color: 'var(--teal-dark)',     border: 'var(--teal)' },
  active:    { label: 'Active',        color: 'var(--teal-dark)',     border: 'var(--teal)' },
  completed: { label: 'Paid',          color: 'var(--teal-dark)',     border: 'var(--teal)' },
  overdue:   { label: 'Overdue',       color: 'var(--magenta)',       border: 'var(--magenta)' },
  defaulted: { label: 'Defaulted',     color: 'var(--magenta)',       border: 'var(--magenta)' },
  rejected:  { label: 'Not approved',  color: 'var(--ink-3)',         border: 'var(--line-md)' },
}

// Groups the raw status column into the tab buckets shown at the top.
// "open" = still owes money in some form (covers overdue too, since an
// overdue loan is still an open obligation, just a late one).
const FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'open',      label: 'Open',      statuses: ['approved', 'disbursed', 'active', 'overdue'] },
  { key: 'pending',   label: 'Pending',   statuses: ['pending'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'closed',    label: 'Not approved', statuses: ['rejected', 'defaulted'] },
] as const

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter: rawFilter } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: loans, error: loansError } = await supabase
    .from('loans')
    .select('*')
    .eq('borrower_id', user.id)
    .order('applied_at', { ascending: false })

  const allLoans = loans ?? []
  const loanIds = allLoans.map(l => l.id)

  // Pull installments + payments for every loan in one shot each, then
  // group client-side, rather than N+1 querying per loan row.
  const { data: installments } = loanIds.length
    ? await supabase
        .from('loan_installments')
        .select('*')
        .in('loan_id', loanIds)
        .order('installment_number', { ascending: true })
    : { data: [] as any[] }

  const { data: payments } = loanIds.length
    ? await supabase
        .from('payments')
        .select('*')
        .in('loan_id', loanIds)
    : { data: [] as any[] }

  const installmentsByLoan = new Map<string, any[]>()
  for (const inst of installments ?? []) {
    const list = installmentsByLoan.get(inst.loan_id) ?? []
    list.push(inst)
    installmentsByLoan.set(inst.loan_id, list)
  }

  const paidByLoan = new Map<string, number>()
  for (const p of payments ?? []) {
    paidByLoan.set(p.loan_id, (paidByLoan.get(p.loan_id) ?? 0) + Number(p.amount))
  }

  // Enrich each loan with the numbers the list actually needs to be useful:
  // outstanding balance, repayment progress, and the next unpaid installment.
  const enriched = allLoans.map(loan => {
    const insts = installmentsByLoan.get(loan.id) ?? []
    const totalPaid = paidByLoan.get(loan.id) ?? 0
    const outstanding = Math.max(0, Number(loan.total_repayable) - totalPaid)
    const paidCount = insts.filter(i => Number(i.amount_paid) >= Number(i.amount_due)).length
    const nextInstallment = insts.find(i => Number(i.amount_paid) < Number(i.amount_due)) ?? null
    return { loan, insts, totalPaid, outstanding, paidCount, nextInstallment }
  })

  // Portfolio-level summary: total owed across open loans, and the single
  // soonest upcoming payment across the whole borrower's book — the two
  // numbers someone actually wants at a glance before scrolling a list.
  const openLoans = enriched.filter(e =>
    ['approved', 'disbursed', 'active', 'overdue'].includes(e.loan.status)
  )
  const totalOutstanding = openLoans.reduce((s, e) => s + e.outstanding, 0)
  const overdueCount = openLoans.filter(e => e.loan.status === 'overdue').length

  const soonestDue = openLoans
    .map(e => e.nextInstallment)
    .filter((i): i is any => !!i && !!i.due_date)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0] ?? null

  const activeFilter = FILTERS.find(f => f.key === rawFilter) ?? FILTERS[0]
  const visibleLoans = activeFilter.key === 'all'
    ? enriched
    : enriched.filter(e => (activeFilter as any).statuses.includes(e.loan.status))

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
        body { font-family:'Inter',-apple-system,sans-serif; }
        .font-display { font-family:'Fraunces',Georgia,serif; }
        .font-mono  { font-family:'Space Mono',monospace; }
        .ledger-card { background:var(--card); border:1.5px solid var(--line-md); border-radius:6px; position:relative; }
        .punch-line { height:14px; background-image:radial-gradient(circle,var(--paper) 3.5px,transparent 4px);
          background-size:18px 14px; background-position:9px center; border-bottom:1.5px dashed var(--line-md); }
        .stamp { display:inline-flex; align-items:center; gap:5px; font-family:'Space Mono',monospace; font-size:11px;
          font-weight:700; text-transform:uppercase; letter-spacing:0.06em; padding:4px 10px; border-radius:3px;
          border:2px solid; transform:rotate(-3deg); mix-blend-mode:multiply; }
        .btn-primary { display:inline-flex; align-items:center; gap:8px; padding:12px 24px; border-radius:4px;
          background:var(--marigold); color:var(--teal-dark); font-size:14px; font-weight:700;
          text-decoration:none; border:1.5px solid var(--ink); box-shadow:3px 3px 0 var(--ink); transition:all 0.15s ease; }
        .btn-primary:hover { transform:translate(-1px,-1px); box-shadow:4px 4px 0 var(--ink); }
        .btn-ghost { display:inline-flex; align-items:center; gap:6px; padding:10px 18px; border-radius:4px;
          color:var(--ink-2); font-size:13px; font-weight:600; text-decoration:none;
          border:1.5px solid var(--line-md); background:var(--card); transition:all 0.15s ease; }
        .btn-ghost:hover { border-color:var(--teal); color:var(--teal); background:var(--teal-bg); }
        .loan-row { display:flex; align-items:center; justify-content:space-between; gap:16px;
          padding:20px 24px; border-bottom:1px dashed var(--line); text-decoration:none;
          transition:background 0.15s ease; }
        .loan-row:last-child { border-bottom:none; }
        .loan-row:hover { background:var(--paper-2); }
        .empty-state { text-align:center; padding:64px 24px; }
        .section-label { font-family:'Space Mono',monospace; font-size:10px; font-weight:700;
          letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-4); margin-bottom:12px; }
        .stat-card { background:var(--card); border:1.5px solid var(--line-md); border-radius:4px; padding:18px 20px; }
        .mini-progress-track { height:5px; border-radius:2px; background:var(--paper-2); overflow:hidden; border:1px solid var(--line-md); }
        .mini-progress-fill { height:100%; background:var(--teal); }
        .filter-tabs { display:flex; gap:6px; flex-wrap:wrap; }
        .filter-tab { font-family:'Space Mono',monospace; font-size:11px; font-weight:700; text-transform:uppercase;
          letter-spacing:0.05em; padding:7px 14px; border-radius:999px; border:1.5px solid var(--line-md);
          background:var(--card); color:var(--ink-3); text-decoration:none; transition:all 0.15s ease; }
        .filter-tab:hover { border-color:var(--teal); color:var(--teal-dark); }
        .filter-tab.active { background:var(--ink); border-color:var(--ink); color:var(--paper); }
        .next-due-pill { display:inline-flex; align-items:center; gap:5px; font-family:'Space Mono',monospace;
          font-size:11px; font-weight:600; padding:3px 9px; border-radius:999px; border:1px solid; }
      `}</style>

      <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
        <header className="flex items-center justify-between px-6 sm:px-10 py-5"
          style={{ borderBottom: '2px solid var(--ink)', background: 'var(--paper)' }}>
          <Link href="/dashboard" className="font-display text-2xl" style={{ color: 'var(--ink)', fontWeight: 600 }}>
            Lendit
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, borderRadius: '50%', background: 'var(--marigold)',
              color: 'var(--teal-dark)', fontSize: 13, fontWeight: 700, marginLeft: 2,
              border: '1.5px solid var(--ink)', verticalAlign: 'middle',
            }}>Be</span>
          </Link>
          <Link href="/dashboard" className="btn-ghost">← Dashboard</Link>
        </header>

        <main className="max-w-3xl mx-auto px-6 sm:px-10 py-10">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h1 className="font-display text-3xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              Your loans
            </h1>
            <Link href="/apply" className="btn-primary">
              Apply for a loan
            </Link>
          </div>

          {loansError && (
            <div className="ledger-card px-5 py-4 mb-6" style={{ background: 'var(--magenta-bg)', borderColor: 'var(--magenta-bdr)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--magenta)' }}>Couldn't load your loans</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Please refresh the page. If this keeps happening, contact support.</p>
            </div>
          )}

          {!loansError && allLoans.length === 0 && (
            <div className="ledger-card empty-state">
              <p className="font-display text-xl mb-2" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                No loans yet
              </p>
              <p className="text-sm mb-6" style={{ color: 'var(--ink-3)' }}>
                You haven't applied for a loan. Start your first application below.
              </p>
              <Link href="/apply" className="btn-primary">
                Apply now
              </Link>
            </div>
          )}

          {!loansError && allLoans.length > 0 && (
            <>
              {/* Portfolio summary — the two numbers worth seeing before scrolling */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <div className="stat-card">
                  <p className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ink-4)' }}>
                    Total outstanding
                  </p>
                  <p className="font-display text-lg" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                    {peso(totalOutstanding)}
                  </p>
                </div>
                <div className="stat-card">
                  <p className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ink-4)' }}>
                    Open loans
                  </p>
                  <p className="font-display text-lg" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                    {openLoans.length}
                    {overdueCount > 0 && (
                      <span className="font-mono text-xs ml-2" style={{ color: 'var(--magenta)' }}>
                        {overdueCount} overdue
                      </span>
                    )}
                  </p>
                </div>
                <div className="stat-card" style={{ gridColumn: 'span 2 / span 2' }}>
                  <p className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ink-4)' }}>
                    Next payment due
                  </p>
                  {soonestDue ? (
                    <p className="font-display text-lg" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                      {peso(Number(soonestDue.amount_due) - Number(soonestDue.amount_paid))}
                      <span className="font-mono text-xs ml-2" style={{ color: 'var(--ink-3)' }}>
                        due {formatDate(soonestDue.due_date)}
                      </span>
                    </p>
                  ) : (
                    <p className="font-display text-lg" style={{ color: 'var(--ink-4)', fontWeight: 500 }}>
                      Nothing scheduled
                    </p>
                  )}
                </div>
              </div>

              {/* Status filter tabs */}
              <div className="filter-tabs mb-6">
                {FILTERS.map(f => (
                  <Link
                    key={f.key}
                    href={f.key === 'all' ? '/loans' : `/loans?filter=${f.key}`}
                    className={`filter-tab ${activeFilter.key === f.key ? 'active' : ''}`}
                  >
                    {f.label}
                  </Link>
                ))}
              </div>

              <p className="section-label">
                {visibleLoans.length} {visibleLoans.length === 1 ? 'loan' : 'loans'}
              </p>

              {visibleLoans.length === 0 ? (
                <div className="ledger-card empty-state">
                  <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
                    No loans match this filter.
                  </p>
                </div>
              ) : (
                <div className="ledger-card overflow-hidden">
                  <div className="punch-line" />
                  {visibleLoans.map(({ loan, insts, outstanding, paidCount, nextInstallment }) => {
                    const meta = STATUS_META[loan.status] ?? STATUS_META.rejected
                    const isOpen = ['approved', 'disbursed', 'active', 'overdue'].includes(loan.status)
                    const dLeft = nextInstallment ? daysUntil(nextInstallment.due_date) : null

                    return (
                      <Link key={loan.id} href={`/loans/${loan.id}`} className="loan-row">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <p className="font-display text-lg" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                              {peso(loan.principal_amount)}
                            </p>
                            <span className="stamp" style={{ color: meta.color, borderColor: meta.border }}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="font-mono text-xs mb-2" style={{ color: 'var(--ink-3)' }}>
                            Applied {formatDate(loan.applied_at)}
                            {loan.due_date && ` · Due ${formatDate(loan.due_date)}`}
                          </p>

                          {isOpen && insts.length > 0 && (
                            <div style={{ maxWidth: 220 }}>
                              <div className="mini-progress-track mb-1.5">
                                <div
                                  className="mini-progress-fill"
                                  style={{ width: `${Math.round((paidCount / insts.length) * 100)}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs" style={{ color: 'var(--ink-4)' }}>
                                {paidCount}/{insts.length} installments
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-right" style={{ flexShrink: 0 }}>
                          {isOpen ? (
                            <>
                              <p className="font-mono text-xs mb-1" style={{ color: 'var(--ink-4)' }}>
                                Outstanding
                              </p>
                              <p className="font-mono text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                {peso(outstanding)}
                              </p>
                              {nextInstallment && (
                                <span
                                  className="next-due-pill"
                                  style={{
                                    color: loan.status === 'overdue' || (dLeft !== null && dLeft < 0)
                                      ? 'var(--magenta)' : 'var(--teal-dark)',
                                    borderColor: loan.status === 'overdue' || (dLeft !== null && dLeft < 0)
                                      ? 'var(--magenta)' : 'var(--teal)',
                                  }}
                                >
                                  {dLeft !== null && dLeft < 0
                                    ? `${Math.abs(dLeft)}d overdue`
                                    : dLeft === 0
                                    ? 'Due today'
                                    : dLeft !== null
                                    ? `Due in ${dLeft}d`
                                    : 'Payment due'}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="font-mono text-xs mb-1" style={{ color: 'var(--ink-4)' }}>
                                Total
                              </p>
                              <p className="font-mono text-sm font-medium" style={{ color: 'var(--ink)' }}>
                                {peso(loan.total_repayable)}
                              </p>
                            </>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  )
}