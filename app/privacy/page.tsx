// app/privacy/page.tsx
import Link from 'next/link'

export default function PrivacyPage() {
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

        .font-display { font-family: 'Fraunces', Georgia, serif; }
        .font-mono  { font-family: 'Space Mono', monospace; }
        body { font-family: 'Inter', -apple-system, sans-serif; }

        .ledger-card { background: var(--card); border: 1.5px solid var(--line-md); border-radius: 6px; }

        .text-link { font-size: 13px; font-weight: 600; color: var(--ink-3); text-decoration: none;
          border-bottom: 1.5px solid var(--line-md); padding-bottom: 1px; background: none; cursor: pointer; }
        .text-link:hover { color: var(--teal-dark); border-color: var(--teal); }

        .tos-section { padding: 24px 0; border-bottom: 1px dashed var(--line); }
        .tos-section:last-child { border-bottom: none; }
        .tos-heading {
          font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em; color: var(--teal-dark);
          margin-bottom: 10px;
        }
        .tos-body { font-size: 14px; line-height: 1.7; color: var(--ink-2); }
        .tos-body ul { margin-top: 8px; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
      `}</style>

      <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
        <header
          className="flex items-center justify-between px-6 sm:px-10 py-5"
          style={{ borderBottom: '2px solid var(--ink)' }}
        >
          <Link
            href="/"
            className="font-display text-2xl"
            style={{ color: 'var(--ink)', fontWeight: 600 }}
          >
            Lendit
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, borderRadius: '50%', background: 'var(--marigold)',
              color: 'var(--teal-dark)', fontSize: 13, fontWeight: 700, marginLeft: 2,
              border: '1.5px solid var(--ink)', verticalAlign: 'middle',
            }}>Be</span>
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium"
            style={{ color: 'var(--ink-3)' }}
          >
            ← Back
          </Link>
        </header>

        <main className="max-w-2xl mx-auto px-6 sm:px-10 py-10">
          <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--ink-4)' }}>
            Legal
          </p>
          <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            Privacy Policy
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--ink-3)' }}>
            Last updated: July 2026. This explains how LenditBe collects, uses, and protects your data.
          </p>

          <div className="ledger-card p-6 sm:p-8">
            <div className="tos-section">
              <p className="tos-heading">1. Information We Collect</p>
              <div className="tos-body">
                <p>We collect information you provide directly, including:</p>
                <ul>
                  <li>Identity details (name, birth date, government ID)</li>
                  <li>Contact information (email, mobile number, address)</li>
                  <li>Financial information (employment, income, payout account details)</li>
                  <li>KYC documents (ID photos, selfie for verification)</li>
                  <li>Loan and payment history within the platform</li>
                </ul>
              </div>
            </div>

            <div className="tos-section">
              <p className="tos-heading">2. How We Use Your Information</p>
              <div className="tos-body">
                <p>We use your information to:</p>
                <ul>
                  <li>Verify your identity and evaluate loan applications</li>
                  <li>Determine credit limits, pricing, and repayment schedules</li>
                  <li>Process disbursements and payments</li>
                  <li>Detect and prevent fraud</li>
                  <li>Comply with legal and regulatory obligations</li>
                </ul>
              </div>
            </div>

            <div className="tos-section">
              <p className="tos-heading">3. Data Sharing</p>
              <p className="tos-body">
                We do not sell your personal information. We may share information with payment
                processors, identity verification providers, and regulators or law enforcement when
                required by law or in connection with suspected fraud.
              </p>
            </div>

            <div className="tos-section">
              <p className="tos-heading">4. Data Storage &amp; Security</p>
              <p className="tos-body">
                Your data is stored using industry-standard encryption. KYC documents are accessible only
                to authorized personnel for verification purposes and are protected behind access controls.
              </p>
            </div>

            <div className="tos-section">
              <p className="tos-heading">5. Your Rights</p>
              <p className="tos-body">
                Under the Data Privacy Act of 2012 (RA 10173), you have the right to access, correct, and
                request deletion of your personal data, subject to our legal and regulatory retention
                obligations.
              </p>
            </div>

            <div className="tos-section">
              <p className="tos-heading">6. Data Retention</p>
              <p className="tos-body">
                We retain your information for as long as necessary to fulfill the purposes described in
                this policy, including legal, accounting, and regulatory requirements.
              </p>
            </div>

            <div className="tos-section">
              <p className="tos-heading">7. Contact</p>
              <p className="tos-body">
                Questions about this Privacy Policy or requests regarding your data can be directed to our
                support channels listed on the LenditBe homepage.
              </p>
            </div>
          </div>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--ink-3)' }}>
            See also our <Link href="/terms" className="text-link">Terms and Conditions</Link>.
          </p>
        </main>
      </div>
    </>
  )
}