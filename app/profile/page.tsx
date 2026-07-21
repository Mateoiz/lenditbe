// app/profile/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from './ProfileForm'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

const { data: borrower } = await supabase
    .from('borrowers')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!borrower) redirect('/profile/verify')

  async function signedUrl(path: string | null): Promise<string | null> {
    if (!path) return null
    const { data } = await supabase.storage
      .from('kyc-documents')
      .createSignedUrl(path, 60 * 60)
    return data?.signedUrl ?? null
  }

  const [idFrontUrl, idSelfieUrl] = await Promise.all([
    signedUrl(borrower.id_front_image_url),
    signedUrl(borrower.id_selfie_url),
  ])

  const { data: loans } = await supabase
    .from('loans')
    .select('status')
    .eq('borrower_id', user.id)

  const isStudent = borrower.employment_type === 'student'
  const completedCount = loans?.filter(l => l.status === 'completed').length || 0
  const creditLimitValue = isStudent
    ? (completedCount === 0 ? 500 : completedCount === 1 ? 1000 : 1500)
    : (borrower.credit_limit || (borrower.monthly_income ? borrower.monthly_income * 0.15 : 2500))

  const kycStatus = borrower.kyc_status ?? 'pending'

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

          /* Aliases so unedited ProfileForm.tsx (old token names) still renders correctly */
          --bg: var(--paper);
          --bg-2: var(--paper-2);
          --bg-card: var(--card);
          --blue: var(--teal-dark);
          --blue-mid: var(--teal);
          --blue-bg: var(--teal-bg);
          --blue-bdr: var(--teal-bdr);
          --amber: var(--marigold-dark);
          --amber-bg: var(--marigold-bg);
          --amber-bdr: var(--marigold-bdr);
          --green: var(--teal-dark);
          --green-bg: var(--teal-bg);
          --green-bdr: var(--teal-bdr);
          --red: var(--magenta);
          --red-bg: var(--magenta-bg);
          --red-bdr: var(--magenta-bdr);
        }
        body { font-family: 'Inter', -apple-system, sans-serif; }
        .font-serif { font-family: 'Fraunces', Georgia, serif; }
        .font-mono  { font-family: 'Space Mono', monospace; }
        .card {
          background: var(--card); border: 1.5px solid var(--line-md); border-radius: 6px;
        }
        .btn-ghost {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 18px; border-radius: 4px;
          color: var(--ink-2); font-size: 13px; font-weight: 600;
          text-decoration: none; border: 1.5px solid var(--line-md);
          background: var(--card); transition: all 0.15s ease;
        }
        .btn-ghost:hover { border-color: var(--teal); color: var(--teal); background: var(--teal-bg); }
        .stat-label {
          font-size: 10px; font-family: 'Space Mono', monospace; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--ink-4); margin-bottom: 4px;
        }
        .lock-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10px; font-family: 'Space Mono', monospace; text-transform: uppercase;
          letter-spacing: 0.05em; padding: 3px 8px; border-radius: 3px;
          background: var(--paper-2); color: var(--ink-4); border: 1.5px solid var(--line-md);
        }
        .section-title {
          font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--ink-3); font-family: 'Space Mono', monospace;
        }
        .field-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px dashed var(--line); gap: 16px; }
        .field-row:last-child { border-bottom: none; }
        .field-label { font-size: 13px; color: var(--ink-3); flex-shrink: 0; }
        .field-value { font-size: 14px; color: var(--ink); font-weight: 500; text-align: right; }
        .field-input {
          width: 100%; max-width: 220px; background: var(--paper); border: 1.5px solid var(--line-md);
          border-radius: 4px; padding: 8px 10px; font-size: 13px; color: var(--ink);
          font-family: 'Inter', -apple-system, sans-serif; text-align: right;
        }
        .field-input:focus { outline: none; border-color: var(--teal); }
        .edit-btn {
          font-size: 12px; font-weight: 700; color: var(--teal); background: none;
          border: none; cursor: pointer; padding: 4px 8px; border-radius: 3px;
          font-family: 'Space Mono', monospace; text-transform: uppercase; letter-spacing: 0.04em;
        }
        .edit-btn:hover { background: var(--teal-bg); }
        .save-btn {
          font-size: 12px; font-weight: 700; color: #fff; background: var(--teal);
          border: 1.5px solid var(--teal-dark); cursor: pointer; padding: 6px 12px; border-radius: 3px;
          font-family: 'Space Mono', monospace; text-transform: uppercase; letter-spacing: 0.04em;
        }
        .save-btn:hover { background: var(--teal-dark); }
        .cancel-btn {
          font-size: 12px; font-weight: 600; color: var(--ink-3); background: none;
          border: none; cursor: pointer; padding: 6px 10px;
        }
      `}</style>

      <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
        <header
          className="flex items-center justify-between px-6 sm:px-10 py-5"
          style={{ borderBottom: '2px solid var(--ink)', background: 'var(--paper)' }}
        >
          <Link href="/dashboard" className="font-serif text-2xl" style={{ color: 'var(--ink)', fontWeight: 600 }}>
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
          <h1 className="font-serif text-3xl mb-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            Your profile
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--ink-3)' }}>
            Manage your contact, employment, and payout details.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="card p-5">
              <p className="stat-label">Credit limit</p>
              <p className="font-serif text-xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                ₱{creditLimitValue.toLocaleString('en-PH')}
              </p>
            </div>
            <div className="card p-5">
              <p className="stat-label">Loans completed</p>
              <p className="font-serif text-xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>{completedCount}</p>
            </div>
            <div className="card p-5">
              <p className="stat-label">Member since</p>
              <p className="font-serif text-xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {formatDate(borrower.created_at).split(' ').slice(1).join(' ')}
              </p>
            </div>
            <div className="card p-5">
              <p className="stat-label">KYC status</p>
              <p
                className="font-mono text-sm font-semibold capitalize mt-1 inline-block px-2 py-0.5 rounded"
                style={{
                  background: kycStatus === 'verified' ? 'var(--teal-bg)' : kycStatus === 'rejected' ? 'var(--magenta-bg)' : 'var(--marigold-bg)',
                  color: kycStatus === 'verified' ? 'var(--teal-dark)' : kycStatus === 'rejected' ? 'var(--magenta)' : 'var(--marigold-dark)',
                }}
              >
                {kycStatus}
              </p>
            </div>
          </div>

<ProfileForm
            borrower={borrower}
            userEmail={user.email ?? ''}
            idFrontUrl={idFrontUrl}
            idSelfieUrl={idSelfieUrl}
          />        </main>
      </div>
    </>
  )
}