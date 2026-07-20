// app/payments/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function peso(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function pesoShort(n: number) {
  return `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
}
function formatDateTime(d: string | null) {
  if (!d) return '—'
  const date = new Date(d)
  return `${date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} · ${date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}`
}
function formatChannel(channel: string | null) {
  if (!channel) return 'Manual / Cash'
  const map: Record<string, string> = {
    gcash: 'GCash e-Wallet',
    maya: 'Maya e-Wallet',
    bank_transfer: 'Bank Transfer',
    '7eleven': '7-Eleven CLIQQ',
    cash_pickup: 'Over-the-Counter',
  }
  return map[channel] ?? channel.toUpperCase()
}

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: admin } = await supabase.from('admins').select('id').eq('id', user.id).maybeSingle()
  if (admin) redirect('/admin')

  // Fetch all payments for this borrower, including related loan and installment info
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      *,
      loans ( id, principal_amount, status ),
      loan_installments ( installment_number, due_date )
    `)
    .eq('borrower_id', user.id)
    .order('paid_at', { ascending: false })

  const paymentList = payments ?? []
  const totalPaid = paymentList.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalCount = paymentList.length
  const latestPayment = paymentList[0] ?? null

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

        .btn-secondary { display:inline-flex; align-items:center; justify-content:center; gap:8px;
          padding:10px 18px; border-radius:4px; background:var(--card); color:var(--ink);
          font-size:13px; font-weight:700; text-decoration:none; border:1.5px solid var(--ink);
          transition:all 0.15s ease; }
        .btn-secondary:hover { background:var(--paper-2); }

        .stamp { display:inline-flex; align-items:center; gap:5px; font-family:'Space Mono',monospace;
          font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em;
          padding:4px 10px; border-radius:3px; border:2px solid; transform:rotate(-3deg); mix-blend-mode:multiply; }
        .stamp.flat { transform:none; }

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

        @media (max-width: 768px) {
          .ledger-table-wrap { display:none; }
          .payment-cards { display:flex; flex-direction:column; }
        }
        .payment-cards { display:none; }

        .pay-card {
          display:flex; flex-direction:column; gap:10px;
          padding:16px 20px; border-bottom:1px dashed var(--line);
        }
        .pay-card:last-child { border-bottom:none; }
      `}</style>

      <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 sm:px-10 py-5" style={{ borderBottom: '2px solid var(--ink)', background: 'var(--paper)' }}>
          <Link href="/dashboard" className="font-display text-2xl" style={{ color: 'var(--ink)', fontWeight: 600 }}>
            Lendit
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30,
              borderRadius: '50%', background: 'var(--marigold)', color: 'var(--teal-dark)', fontSize: 15, fontWeight: 700,
              marginLeft: 2, border: '1.5px solid var(--ink)', verticalAlign: 'middle' }}>Be</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="btn-secondary">← Back to Dashboard</Link>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 sm:px-10 py-10 flex flex-col gap-8">
          
          {/* Masthead */}
          <div>
            <p className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--ink-4)' }}>
              Transaction Archive · All Channels
            </p>
            <h1 className="font-display text-4xl sm:text-5xl leading-tight" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              Payment History
            </h1>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="ledger-card p-6">
              <p className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>Total Amount Paid</p>
              <p className="font-display text-3xl mt-2" style={{ color: 'var(--teal-dark)', fontWeight: 500 }}>
                {peso(totalPaid)}
              </p>
              <p className="font-mono text-xs mt-1" style={{ color: 'var(--ink-3)' }}>Lifetime repayments</p>
            </div>

            <div className="ledger-card p-6">
              <p className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>Transactions Recorded</p>
              <p className="font-display text-3xl mt-2" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {totalCount}
              </p>
              <p className="font-mono text-xs mt-1" style={{ color: 'var(--ink-3)' }}>Successful postings</p>
            </div>

            <div className="ledger-card p-6">
              <p className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>Latest Transaction</p>
              <p className="font-display text-2xl mt-2" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {latestPayment ? pesoShort(Number(latestPayment.amount)) : '₱0'}
              </p>
              <p className="font-mono text-xs mt-1 truncate" style={{ color: 'var(--teal-dark)' }}>
                {latestPayment ? formatChannel(latestPayment.channel) : 'No payments yet'}
              </p>
            </div>
          </div>

          {/* Main Table Card */}
          <div className="ledger-card overflow-hidden">
            <div className="punch-line" />
            <div className="p-6 pb-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-display text-xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>Verified Ledger Entries</h2>
                <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                  Showing real-time posting timestamps and reference codes
                </p>
              </div>
              <span className="stamp flat" style={{ color: 'var(--teal-dark)', borderColor: 'var(--teal)', background: 'var(--teal-bg)' }}>
                ✓ Official Records
              </span>
            </div>

            {totalCount > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="ledger-table-wrap">
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: 24 }}>Date & Time</th>
                        <th>Amount Paid</th>
                        <th>Payment Channel</th>
                        <th>Reference Code</th>
                        <th>Loan / Installment</th>
                        <th style={{ paddingRight: 24, textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentList.map((p) => {
                        const instNum = p.loan_installments?.installment_number
                        const loanId = p.loan_id.slice(0, 8)
                        
                        return (
                          <tr key={p.id}>
                            <td className="font-mono text-xs" style={{ paddingLeft: 24, color: 'var(--ink)' }}>
                              {formatDateTime(p.paid_at)}
                            </td>
                            <td className="font-mono font-bold" style={{ color: 'var(--teal-dark)', fontSize: 15 }}>
                              {peso(Number(p.amount))}
                            </td>
                            <td>
                              <span className="font-medium" style={{ color: 'var(--ink-2)' }}>
                                {formatChannel(p.channel)}
                              </span>
                            </td>
                            <td className="font-mono text-xs" style={{ color: 'var(--ink-3)' }}>
                              {p.reference_number || '—'}
                            </td>
                            <td>
                              <Link href={`/loans/${p.loan_id}`} className="hover:underline">
                                <span className="font-mono text-xs font-bold" style={{ color: 'var(--ink)' }}>
                                  Loan #{loanId}
                                </span>
                                {instNum && (
                                  <span className="font-mono text-xs block" style={{ color: 'var(--ink-4)' }}>
                                    Installment #{String(instNum).padStart(2, '0')}
                                  </span>
                                )}
                              </Link>
                            </td>
                            <td style={{ paddingRight: 24, textAlign: 'right' }}>
                              <span className="stamp flat" style={{ fontSize: 10, padding: '2px 8px', color: 'var(--teal-dark)', borderColor: 'var(--teal)', background: 'var(--teal-bg)' }}>
                                Posted
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Stacked Cards View */}
                <div className="payment-cards">
                  {paymentList.map((p) => {
                    const instNum = p.loan_installments?.installment_number
                    const loanId = p.loan_id.slice(0, 8)

                    return (
                      <div key={p.id} className="pay-card">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-lg" style={{ color: 'var(--teal-dark)' }}>
                            {peso(Number(p.amount))}
                          </span>
                          <span className="stamp flat" style={{ fontSize: 10, padding: '2px 6px', color: 'var(--teal-dark)', borderColor: 'var(--teal)', background: 'var(--teal-bg)' }}>
                            Posted
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono" style={{ color: 'var(--ink-3)' }}>
                          <span>{formatDateTime(p.paid_at)}</span>
                          <span className="font-bold text-ink">{formatChannel(p.channel)}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2" style={{ borderTop: '1px dashed var(--line)' }}>
                          <span className="font-mono" style={{ color: 'var(--ink-4)' }}>
                            Ref: {p.reference_number || 'None'}
                          </span>
                          <Link href={`/loans/${p.loan_id}`} className="font-mono font-bold hover:underline" style={{ color: 'var(--ink)' }}>
                            Loan #{loanId} {instNum ? `(#${instNum})` : ''} →
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="px-6 py-16 text-center">
                <p className="font-display text-xl" style={{ color: 'var(--ink-2)' }}>No payment records found</p>
                <p className="text-sm mt-1 mb-6" style={{ color: 'var(--ink-4)' }}>
                  Once you make an installment payment, your verified receipts and timestamps will appear here.
                </p>
                <Link href="/dashboard" className="btn-secondary">
                  Return to Dashboard
                </Link>
              </div>
            )}
          </div>

        </main>
      </div>
    </>
  )
}