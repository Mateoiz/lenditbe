// app/terms/page.tsx
import Link from 'next/link'

export default function TermsPage() {
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
            Terms and Conditions
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--ink-3)' }}>
            Last updated: July 2026. Please read these terms carefully before using LenditBe.
          </p>

          <div className="ledger-card p-6 sm:p-8">
            <div className="tos-section">
              <p className="tos-heading">1. Acceptance of Terms</p>
              <p className="tos-body">
                By creating an account, applying for a loan, or otherwise using LenditBe, you agree to be
                bound by these Terms and Conditions and our Privacy Policy. If you do not agree, do not
                use the platform.
              </p>
            </div>

            <div className="tos-section">
              <p className="tos-heading">2. Eligibility</p>
              <p className="tos-body">
                You must be at least 18 years old and capable of entering into a legally binding contract
                under Philippine law. You must provide accurate, current, and complete information during
                registration and identity verification (KYC).
              </p>
            </div>

            <div className="tos-section">
              <p className="tos-heading">3. Accuracy of Information &amp; Fraud</p>
              <p className="tos-body">
                By submitting a loan application, you certify that all information provided — including
                your identity, income, address, and payout details — is true and accurate. Submitting
                false, misleading, or fraudulent information, or using another person's identity to obtain
                a loan, constitutes loan fraud and may expose you to civil liability and criminal
                prosecution under applicable Philippine laws, including but not limited to the Revised
                Penal Code provisions on estafa (swindling), the Access Devices Regulation Act (RA 8484),
                and the Cybercrime Prevention Act (RA 10175). LenditBe reserves the right to report
                suspected fraud to the NBI, PNP, SEC, and other relevant authorities, and to pursue
                collection and legal remedies for any resulting losses.
              </p>
            </div>

            <div className="tos-section">
              <p className="tos-heading">4. Loan Approval &amp; Pricing</p>
              <p className="tos-body">
                Loan approval, credit limits, interest rates, and service fees are determined automatically
                based on your verified profile, declared income, and repayment history. LenditBe does not
                guarantee approval of any application.
              </p>
            </div>

            <div className="tos-section">
              <p className="tos-heading">5. Repayment Obligations</p>
              <p className="tos-body">
                You agree to repay your loan according to the installment schedule shown at the time of
                approval. Late or missed payments may result in additional fees, restricted access to
                future credit, and referral to collections.
              </p>
            </div>

            <div className="tos-section">
              <p className="tos-heading">6. Account Termination</p>
              <p className="tos-body">
                LenditBe may suspend or terminate your account at its discretion, including for suspected
                fraud, misuse of the platform, or violation of these Terms.
              </p>
            </div>

            <div className="tos-section">
              <p className="tos-heading">7. Changes to These Terms</p>
              <p className="tos-body">
                We may update these Terms from time to time. Continued use of LenditBe after changes take
                effect constitutes acceptance of the revised Terms.
              </p>
            </div>

            <div className="tos-section">
              <p className="tos-heading">8. Contact</p>
              <p className="tos-body">
                Questions about these Terms can be directed to our support channels listed on the LenditBe
                homepage.
              </p>
            </div>
          </div>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--ink-3)' }}>
            See also our <Link href="/privacy" className="text-link">Privacy Policy</Link>.
          </p>
        </main>
      </div>
    </>
  )
}