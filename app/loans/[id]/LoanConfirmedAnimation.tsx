'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function LoanConfirmedAnimation({ amount }: { amount: string }) {
  const [visible, setVisible] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Strip ?applied=1 from the URL so a refresh doesn't replay the animation
    router.replace(pathname)
    const timer = setTimeout(() => setVisible(false), 2600)
    return () => clearTimeout(timer)
  }, [pathname, router])

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes confirmFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes confirmFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes checkPop {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes checkDraw {
          from { stroke-dashoffset: 48; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes ringPulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .confirm-overlay {
          position: fixed; inset: 0; z-index: 100;
          display: flex; align-items: center; justify-content: center;
          background: rgba(20, 17, 15, 0.45);
          animation: confirmFadeIn 0.25s ease forwards;
        }
        .confirm-overlay.leaving { animation: confirmFadeOut 0.35s ease forwards; }
        .confirm-card {
          background: var(--card, #fff);
          border: 2px solid var(--ink, #14110F);
          border-radius: 10px;
          box-shadow: 6px 6px 0 var(--ink, #14110F);
          padding: 40px 36px;
          text-align: center;
          max-width: 320px;
          animation: checkPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .confirm-ring-wrap { position: relative; width: 72px; height: 72px; margin: 0 auto 18px; }
        .confirm-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 3px solid var(--teal, #0B5D52);
          animation: ringPulse 1.4s ease-out infinite;
        }
        .confirm-check-circle {
          width: 72px; height: 72px; border-radius: 50%;
          background: var(--teal-bg, #E5F1EE);
          border: 2px solid var(--teal, #0B5D52);
          display: flex; align-items: center; justify-content: center;
          position: relative; z-index: 1;
        }
        .confirm-check-path {
          stroke-dasharray: 48; stroke-dashoffset: 48;
          animation: checkDraw 0.5s ease 0.3s forwards;
        }
      `}</style>

      <div className={`confirm-overlay`} onClick={() => setVisible(false)}>
        <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
          <div className="confirm-ring-wrap">
            <div className="confirm-ring" />
            <div className="confirm-check-circle">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  className="confirm-check-path"
                  d="M5 13l4 4L19 7"
                  stroke="#0B5D52"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <p className="font-display text-xl mb-1" style={{ color: 'var(--ink, #14110F)', fontWeight: 500 }}>
            Loan confirmed!
          </p>
          <p className="text-sm" style={{ color: 'var(--ink-3, #6B655A)' }}>
            {amount} has been sent your way.
          </p>
        </div>
      </div>
    </>
  )
}