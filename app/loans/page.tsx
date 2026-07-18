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

export default async function LoansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: loans } = await supabase
    .from('loans')
    .select('*')
    .eq('borrower_id', user.id)
    .order('applied_at', { ascending: false })

  const allLoans = loans ?? []

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
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <h1 className="font-display text-3xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              Your loans
            </h1>
            <Link href="/apply" className="btn-primary">
              Apply for a loan
            </Link>
          </div>

          {allLoans.length === 0 ? (
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
          ) : (
            <div>
              <p className="section-label">
                {allLoans.length} {allLoans.length === 1 ? 'loan' : 'loans'}
              </p>
              <div className="ledger-card overflow-hidden">
                <div className="punch-line" />
                {allLoans.map(loan => {
                  const meta = STATUS_META[loan.status] ?? STATUS_META.rejected
                  return (
                    <Link key={loan.id} href={`/loans/${loan.id}`} className="loan-row">
                      <div>
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <p className="font-display text-lg" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                            {peso(loan.principal_amount)}
                          </p>
                          <span className="stamp" style={{ color: meta.color, borderColor: meta.border }}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="font-mono text-xs" style={{ color: 'var(--ink-3)' }}>
                          Applied {formatDate(loan.applied_at)}
                          {loan.due_date && ` · Due ${formatDate(loan.due_date)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm" style={{ color: 'var(--ink-4)' }}>
                          Total
                        </p>
                        <p className="font-mono text-sm font-medium" style={{ color: 'var(--ink)' }}>
                          {peso(loan.total_repayable)}
                        </p>
                      </div>
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