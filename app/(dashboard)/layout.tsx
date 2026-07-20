// app/(dashboard)/layout.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: borrower } = await supabase
    .from('borrowers')
    .select('employment_type')
    .eq('id', user.id)
    .maybeSingle()

  const isStudent = borrower?.employment_type === 'student'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
        
        :root {
          --paper:#FFFDF7; --paper-2:#F5F0E4; --card:#FFFFFF;
          --ink:#14110F; --ink-2:#3A362F; --ink-3:#6B655A; --ink-4:#9C9484;
          --line:rgba(20,17,15,0.10); --line-md:rgba(20,17,15,0.18);
          --teal:#0B5D52; --teal-dark:#073F38; --teal-bg:#E5F1EE; --teal-bdr:#B9D9D2;
          --marigold:#F5A623; --marigold-dark:#B87814; --marigold-bg:#FDF0DA; --marigold-bdr:#F0CE93;
          --magenta:#C81E5C; --magenta-bg:#FBE7EF; --magenta-bdr:#EFB4CB;
        }

        *, *::before, *::after { box-sizing: border-box; }
        body { 
          background-color: var(--paper); color: var(--ink); font-family: 'Inter', -apple-system, sans-serif;
          background-image: repeating-linear-gradient(transparent, transparent 34px, var(--line) 35px);
          margin: 0;
        }
        .font-display { font-family: 'Fraunces', Georgia, serif; }
        .font-mono    { font-family: 'Space Mono', monospace; }

        /* ── Global UI Components ── */
        .ledger-card {
          background: var(--card); border: 1.5px solid var(--ink); border-radius: 6px;
          position: relative; box-shadow: 3px 3px 0px var(--line-md);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .ledger-card:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0px var(--ink); }

        .punch-line { height: 14px; background-image: radial-gradient(circle, var(--paper) 3.5px, transparent 4px);
          background-size: 18px 14px; background-position: 9px center; border-bottom: 1.5px dashed var(--line-md); }

        .btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 24px; border-radius: 4px; background: var(--marigold); color: var(--teal-dark);
          font-size: 14px; font-weight: 700; text-decoration: none; border: 1.5px solid var(--ink);
          box-shadow: 3px 3px 0 var(--ink); transition: all 0.15s ease; cursor: pointer; }
        .btn-primary:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--ink); }
        .btn-primary:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 var(--ink); }
        .btn-primary.lg { padding: 16px 32px; font-size: 15px; }
        .btn-primary.sm { padding: 6px 14px; font-size: 12px; box-shadow: 2px 2px 0 var(--ink); }

        .btn-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 22px; border-radius: 4px; background: var(--card); color: var(--ink);
          font-size: 14px; font-weight: 700; text-decoration: none; border: 1.5px solid var(--ink);
          transition: all 0.15s ease; cursor: pointer; }
        .btn-secondary:hover { background: var(--paper-2); }

        .text-link { font-size: 13px; font-weight: 600; color: var(--ink-3); text-decoration: none;
          border-bottom: 1.5px solid var(--line-md); padding-bottom: 1px; transition: all 0.15s ease; }
        .text-link:hover { color: var(--teal-dark); border-color: var(--teal); }

        .stamp { display: inline-flex; align-items: center; gap: 5px; font-family: 'Space Mono', monospace;
          font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
          padding: 4px 10px; border-radius: 3px; border: 2px solid; transform: rotate(-3deg); mix-blend-mode: multiply; }
        .stamp.flat { transform: none; }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ background: 'var(--paper)' }}>
        <header className="flex items-center justify-between px-6 sm:px-10 py-5" style={{ borderBottom: '2px solid var(--ink)', background: 'var(--paper)' }}>
          <Link href="/dashboard" className="font-display text-2xl" style={{ color: 'var(--ink)', fontWeight: 600, textDecoration: 'none' }}>
            Lendit
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--marigold)', color: 'var(--teal-dark)',
              fontSize: 15, fontWeight: 700, marginLeft: 2,
              border: '1.5px solid var(--ink)', verticalAlign: 'middle',
            }}>Be</span>
          </Link>

          <div className="flex items-center gap-3">
            {isStudent && (
              <span className="stamp flat hidden sm:inline-flex" style={{ color: 'var(--teal-dark)', borderColor: 'var(--teal)' }}>
                Student
              </span>
            )}
            <span className="text-sm hidden sm:inline" style={{ color: 'var(--ink-3)' }}>
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-sm font-medium px-3 py-1.5 rounded" style={{ color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Sign out
              </button>
            </form>
          </div>
        </header>

        {/* Master container: centers content across all dashboard routes */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 sm:px-10 py-10 flex flex-col gap-8">
          {children}
        </main>
      </div>
    </>
  )
}