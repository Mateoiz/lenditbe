'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { submitVerification } from './actions'

interface IdMeta {
  value: string
  label: string
  hint: string
  mask: string
  requiresBack: boolean
}

const ID_TYPES: IdMeta[] = [
  { value: 'philsys',         label: 'PhilSys (National ID)', hint: '1234-5678-9012-3456', mask: '####-####-####-####', requiresBack: true },
  { value: 'passport',        label: 'Philippine Passport',   hint: 'P1234567A',             mask: 'A########',         requiresBack: false },
  { value: 'drivers_license', label: "Driver's License",      hint: 'A01-23-456789',         mask: 'A##-##-######',     requiresBack: true },
  { value: 'umid',            label: 'UMID',                  hint: '0000-0000000-0',        mask: '####-#######-#',    requiresBack: true },
  { value: 'sss',             label: 'SSS ID',                hint: '00-0000000-0',          mask: '##-#######-#',      requiresBack: true },
  { value: 'tin',             label: 'TIN ID',                hint: '000-000-000-000',       mask: '###-###-###-###',   requiresBack: false },
  { value: 'postal_id',       label: 'Postal ID',             hint: 'PRN-000000000000',      mask: 'AAA-############',  requiresBack: true },
  { value: 'voters_id',       label: "Voter's ID",            hint: '0000-0000A-00000AAA',   mask: '####-#####-########', requiresBack: true },
]

type CameraTarget = 'idFront' | 'idBack' | 'face' | null

export default function VerifyForm({ currentStatus }: { currentStatus: string }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [idType, setIdType] = useState('')
  const [idNumber, setIdNumber] = useState('')

  const [idFrontFile, setIdFrontFile] = useState<File | null>(null)
  const [idBackFile, setIdBackFile]   = useState<File | null>(null)
  const [faceFile, setFaceFile]       = useState<File | null>(null)

  const [idFrontPreview, setIdFrontPreview] = useState('')
  const [idBackPreview, setIdBackPreview]   = useState('')
  const [facePreview, setFacePreview]       = useState('')

  const [activeTarget, setActiveTarget] = useState<CameraTarget>(null)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [creditConsent, setCreditConsent]   = useState(false)

  const selectedMeta = ID_TYPES.find(t => t.value === idType)

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (idFrontFile || idBackFile || faceFile) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [idFrontFile, idBackFile, faceFile])

  useEffect(() => {
    return () => {
      if (idFrontPreview) URL.revokeObjectURL(idFrontPreview)
      if (idBackPreview)  URL.revokeObjectURL(idBackPreview)
      if (facePreview)    URL.revokeObjectURL(facePreview)
      stopCamera()
    }
  }, [idFrontPreview, idBackPreview, facePreview])

  useEffect(() => {
    if (activeTarget) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      stopCamera()
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [activeTarget])

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}
    if (!idType) newErrors.idType = 'Please select a government ID type.'
    if (!idNumber.trim()) {
      newErrors.idNumber = 'ID number is required.'
    } else if (idNumber.trim().length < 5) {
      newErrors.idNumber = 'Please enter a valid, complete ID number.'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {}
    if (!idFrontFile) newErrors.idFront = 'ID Front live scan is required.'
    if (selectedMeta?.requiresBack && !idBackFile) newErrors.idBack = 'ID Back live scan is required for this document type.'
    if (!faceFile) newErrors.face = 'Live face verification scan is required.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function startCamera(target: CameraTarget) {
    stopCamera()
    setCameraError('')
    setActiveTarget(target)
    setErrors(prev => ({ ...prev, [target || '']: '' }))

    try {
      const facingMode = target === 'face' ? 'user' : { ideal: 'environment' }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err: any) {
      setCameraError('Unable to access camera hardware. Please grant browser camera permissions to proceed.')
    }
  }

  function stopCamera() {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }

  function captureFrame() {
    if (!videoRef.current || !canvasRef.current || !activeTarget) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    if (context) {
      if (activeTarget === 'face') {
        context.translate(canvas.width, 0)
        context.scale(-1, 1)
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `live_${activeTarget}_${Date.now()}.jpg`
          const file = new File([blob], fileName, { type: 'image/jpeg' })
          const previewUrl = URL.createObjectURL(blob)

          if (activeTarget === 'idFront') {
            if (idFrontPreview) URL.revokeObjectURL(idFrontPreview)
            setIdFrontFile(file)
            setIdFrontPreview(previewUrl)
          } else if (activeTarget === 'idBack') {
            if (idBackPreview) URL.revokeObjectURL(idBackPreview)
            setIdBackFile(file)
            setIdBackPreview(previewUrl)
          } else if (activeTarget === 'face') {
            if (facePreview) URL.revokeObjectURL(facePreview)
            setFaceFile(file)
            setFacePreview(previewUrl)
          }

          setActiveTarget(null)
        }
      }, 'image/jpeg', 0.92)
    }
  }

  async function handleSubmit() {
    setGlobalError('')
    if (!privacyConsent || !creditConsent) {
      setGlobalError('You must check both legal disclosures to authorize verification.')
      return
    }
    setLoading(true)

    const formData = new FormData()
    formData.set('id_type', idType)
    formData.set('id_number', idNumber.trim())
    if (idFrontFile) formData.set('id_front', idFrontFile)
    if (idBackFile)  formData.set('id_back', idBackFile)
    if (faceFile)    formData.set('selfie', faceFile)
    formData.set('data_privacy_consent', 'true')
    formData.set('credit_check_consent', 'true')

    try {
      await submitVerification(formData)
      router.push('/dashboard?kyc=submitted')
    } catch (err: any) {
      setGlobalError(err.message ?? 'An unexpected network error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        :root {
          --bg: #F8FAFC;
          --bg-card: #FFFFFF;
          --ink: #0F172A;
          --ink-2: #334155;
          --ink-3: #64748B;
          --ink-4: #94A3B8;
          --blue: #4F46E5;
          --blue-mid: #6366F1;
          --blue-bg: #EEF2FF;
          --blue-bdr: #C7D2FE;
          --line: #E2E8F0;
          --green: #059669;
          --green-bg: #ECFDF5;
          --red: #E11D48;
          --red-bg: #FFF1F2;
          --red-bdr: #FECDD3;
        }

        body {
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          background-color: var(--bg); color: var(--ink);
          -webkit-tap-highlight-color: transparent;
        }

        .font-serif { font-family: 'DM Serif Display', Georgia, serif; }
        .font-mono  { font-family: 'JetBrains Mono', monospace; }

        /* FIX 1: background-attachment:local stops the dot grid from repainting on scroll */
        .blueprint-canvas {
          min-height: 100vh;
          background-color: #F8FAFC;
          background-image: radial-gradient(rgba(99, 102, 241, 0.12) 1px, transparent 0);
          background-size: 24px 24px;
          background-attachment: local;
          display: flex; flex-direction: column;
        }

        /* FIX 2: valid padding with media query instead of invalid sm:padding-44px */
        .verification-card {
          background: var(--bg-card);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 20px;
          box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.05), 0 0 1px 1px rgba(15, 23, 42, 0.02);
          padding: 20px;
        }
        @media (min-width: 640px) {
          .verification-card { padding: 44px; }
        }

        .field-label {
          display: block; font-size: 11px; font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--ink-3); margin-bottom: 8px;
        }

        /* FIX 3: 16px prevents iOS Safari auto-zoom on input focus */
        .field-input {
          width: 100%; padding: 14px 16px; border-radius: 12px;
          border: 1px solid var(--line); background: #F8FAFC;
          color: var(--ink); font-size: 16px; font-weight: 500;
          transition: all 0.2s ease; outline: none; box-sizing: border-box;
        }
        .field-input:focus {
          border-color: var(--blue-mid); background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
        }
        .field-input.error { border-color: var(--red); background: var(--red-bg); }

        .blueprint-id-badge {
          background: #0F172A; border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px; padding: 20px; color: #FFFFFF;
          position: relative; overflow: hidden;
        }
        .blueprint-id-badge::after {
          content: ''; position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 12px 12px; pointer-events: none;
        }

        .scan-box {
          border: 1px solid var(--line); border-radius: 16px;
          background: #F8FAFC; overflow: hidden; transition: all 0.2s ease;
        }
        .scan-box.error { border-color: var(--red); background: var(--red-bg); }

        .reticle-card {
          width: 85%; max-width: 380px; aspect-ratio: 1.58 / 1;
          border: 2px dashed rgba(255, 255, 255, 0.7);
          border-radius: 12px; pointer-events: none;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65);
        }
        .reticle-face {
          width: 70%; max-width: 280px; aspect-ratio: 3 / 4;
          border: 2px dashed rgba(99, 102, 241, 0.8);
          border-radius: 50%; pointer-events: none;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65);
        }

        /* FIX 4: touch-action:manipulation removes 300ms tap delay on mobile */
        .btn-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 15px 28px; border-radius: 12px; min-height: 48px;
          background: var(--blue-mid); color: #fff;
          font-size: 15px; font-weight: 600; border: none; cursor: pointer;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
          transition: all 0.2s ease;
          touch-action: manipulation;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .btn-primary:hover:not(:disabled) {
          background: var(--blue); transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35);
        }
        .btn-primary:active:not(:disabled) { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; transform: none; }

        .btn-ghost {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          padding: 14px 22px; border-radius: 12px; min-height: 48px; background: transparent;
          color: var(--ink-3); font-size: 15px; font-weight: 600;
          border: 1px solid var(--line); cursor: pointer; transition: all 0.15s ease;
          touch-action: manipulation;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .btn-ghost:hover { background: #F1F5F9; color: var(--ink); }
        .btn-ghost:active { transform: scale(0.98); }

        .step-tab {
          display: flex; align-items: center; gap: 10px;
          padding-bottom: 12px; border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
        }
        .step-tab.active { border-color: var(--blue-mid); color: var(--blue-mid); }
        .step-tab.done   { border-color: var(--green); color: var(--green); }
        .step-tab.idle   { border-color: var(--line); color: var(--ink-4); }

        /* FIX 5: safe-area insets for notched iPhones */
        .sticky-header {
          padding-top: env(safe-area-inset-top);
        }
        .camera-topbar {
          padding-top: max(16px, env(safe-area-inset-top));
          padding-left: max(16px, env(safe-area-inset-left));
          padding-right: max(16px, env(safe-area-inset-right));
          padding-bottom: 16px;
        }
        .camera-bottombar {
          padding-bottom: max(40px, env(safe-area-inset-bottom));
          padding-left: max(24px, env(safe-area-inset-left));
          padding-right: max(24px, env(safe-area-inset-right));
          padding-top: 24px;
        }
      `}</style>

      {/* ── FULLSCREEN MOBILE CAMERA MODAL ── */}
      {activeTarget && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col justify-between">
          {/* FIX 5a: camera-topbar handles notch/status bar */}
          <div className="camera-topbar flex items-center justify-between bg-slate-900/90 backdrop-blur text-white z-10 border-b border-white/10">
            <span className="text-xs font-mono font-bold tracking-wider text-indigo-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              {activeTarget === 'idFront' ? 'SCAN FRONT OF ID' : activeTarget === 'idBack' ? 'SCAN BACK OF ID' : 'BIOMETRIC SELFIE'}
            </span>
            <button
              type="button"
              onClick={() => setActiveTarget(null)}
              className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white font-mono font-semibold transition active:scale-95"
              style={{ touchAction: 'manipulation' }}
            >
              ✕ CANCEL
            </button>
          </div>

          {/* Viewfinder */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={activeTarget === 'face' ? { transform: 'scaleX(-1)' } : undefined}
            />
            <canvas ref={canvasRef} className="hidden" />

            {activeTarget === 'face' ? (
              <div className="reticle-face" />
            ) : (
              <div className="reticle-card" />
            )}

            {cameraError && (
              <div className="absolute inset-x-6 top-6 z-20 bg-rose-600 text-white p-3 rounded-xl text-xs font-medium text-center shadow-lg">
                {cameraError}
              </div>
            )}
          </div>

          {/* FIX 5b: camera-bottombar clears home bar on iPhone */}
          <div className="camera-bottombar bg-slate-900/95 backdrop-blur flex flex-col items-center gap-4 z-10 border-t border-white/10">
            <p className="text-xs font-mono text-slate-300 text-center">
              {activeTarget === 'face' ? 'Align face within oval in good lighting' : 'Fit ID card edges within the dotted box'}
            </p>

            {/* FIX 6: removed invalid w-18 h-18 sm:w-20 sm:h-20 — use inline style only */}
            <button
              type="button"
              onClick={captureFrame}
              className="rounded-full bg-white border-4 border-indigo-500 flex items-center justify-center shadow-xl active:scale-90 transition-all cursor-pointer p-1.5"
              aria-label="Take Photo"
              style={{ width: '72px', height: '72px', minWidth: '72px', touchAction: 'manipulation' }}
            >
              <div className="w-full h-full rounded-full bg-indigo-600 hover:bg-indigo-500 transition-colors" />
            </button>
          </div>
        </div>
      )}

      {/* ── STANDARD FORM CANVAS ── */}
      <div className="blueprint-canvas">
        {/* FIX 5c: sticky-header adds safe-area-inset-top so content clears the notch */}
        <header className="sticky-header w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-4 sm:px-10 py-3.5 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="/dashboard" className="font-serif text-lg sm:text-xl tracking-tight text-slate-900" style={{ textDecoration: 'none' }}>
              Lendit<span className="text-indigo-600 italic">Be</span>
            </a>
            <span className="text-slate-300 font-light">/</span>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Live KYC
            </span>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-[11px] font-mono text-slate-400 hover:text-slate-600 transition py-1 px-2"
            style={{ touchAction: 'manipulation' }}
          >
            EXIT
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-3 sm:p-8 md:p-12">
          <div className="w-full max-w-xl">

            <div className="mb-6 sm:mb-8 text-center sm:text-left">
              <h1 className="font-serif text-2xl sm:text-4xl text-slate-900 tracking-tight">
                Biometric Security
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Live hardware captures only. Uploads are disabled to prevent identity fraud.
              </p>
            </div>

            {currentStatus === 'rejected' && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 flex items-start gap-3 text-rose-700">
                <span className="text-base mt-0.5">⚠️</span>
                <div className="text-xs sm:text-sm">
                  <strong className="font-semibold block">Previous Verification Rejected</strong>
                  Please ensure your live scans are glare-free and your face is well-lit.
                </div>
              </div>
            )}

            {globalError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 flex items-center gap-3 text-rose-700 text-xs sm:text-sm font-medium">
                <span className="text-base">🚨</span>
                <span>{globalError}</span>
              </div>
            )}

            <div className="verification-card">

              {/* FIX 7: shortened step labels so they don't overflow on 375px screens */}
              <div className="grid grid-cols-3 gap-1 mb-6 sm:mb-8 border-b border-slate-100 pb-2">
                {[
                  { num: 1, label: '01 / DOC' },
                  { num: 2, label: '02 / SCANS' },
                  { num: 3, label: '03 / LEGAL' },
                ].map((s) => {
                  const isDone   = step > s.num
                  const isActive = step === s.num
                  return (
                    <div
                      key={s.num}
                      className={`step-tab text-[11px] sm:text-xs font-mono font-bold tracking-wider justify-center sm:justify-start ${isDone ? 'done' : isActive ? 'active' : 'idle'}`}
                    >
                      <span>{s.label}</span>
                    </div>
                  )
                })}
              </div>

              {/* ── STEP 1: DOCUMENT DETAILS ── */}
              {step === 1 && (
                <div className="flex flex-col gap-5 sm:gap-6">
                  <div>
                    <label className="field-label">Government Document</label>
                    <select
                      className={`field-input ${errors.idType ? 'error' : ''}`}
                      value={idType}
                      onChange={e => { setIdType(e.target.value); setErrors(prev => ({ ...prev, idType: '' })) }}
                    >
                      <option value="">Select identification type...</option>
                      {ID_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    {errors.idType && <span className="text-xs text-rose-600 mt-1.5 block font-medium">{errors.idType}</span>}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="field-label !mb-0">Document Number</label>
                      {selectedMeta && (
                        <span className="text-[11px] font-mono text-indigo-600 font-semibold">
                          Format: {selectedMeta.hint}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      className={`field-input font-mono uppercase ${errors.idNumber ? 'error' : ''}`}
                      placeholder={selectedMeta ? selectedMeta.hint : 'Enter exact document number'}
                      value={idNumber}
                      onChange={e => { setIdNumber(e.target.value); setErrors(prev => ({ ...prev, idNumber: '' })) }}
                    />
                    {errors.idNumber && <span className="text-xs text-rose-600 mt-1.5 block font-medium">{errors.idNumber}</span>}
                  </div>

                  <div className="pt-1">
                    <label className="field-label mb-2">Technical Wireframe Preview</label>
                    <div className="blueprint-id-badge">
                      <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">Republic of the Philippines</span>
                          <strong className="text-xs sm:text-sm font-semibold text-white mt-0.5 block">
                            {selectedMeta ? selectedMeta.label : 'Select ID Type Above'}
                          </strong>
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 font-semibold">
                          {selectedMeta?.requiresBack ? 'FRONT & BACK' : 'FRONT ONLY'}
                        </span>
                      </div>
                      <div className="pt-4 border-t border-slate-800 flex justify-between items-end relative z-10">
                        <div>
                          <span className="text-[9px] font-mono text-slate-500 block uppercase">Document Reference</span>
                          <span className="text-sm sm:text-base font-mono tracking-widest text-indigo-200 font-semibold">
                            {idNumber.trim() || (selectedMeta ? selectedMeta.mask : '####-####-####-####')}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">LIVE SCAN ONLY</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                      className="btn-primary w-full sm:w-auto"
                      onClick={() => { if (validateStep1()) setStep(2) }}
                    >
                      Proceed to Live Scans →
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: LIVE CAMERA HARDWARE SCANS ── */}
              {step === 2 && (
                <div className="flex flex-col gap-5 sm:gap-6">

                  {/* ID FRONT */}
                  <div className={`scan-box p-4 ${errors.idFront ? 'error' : ''}`}>
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-xs font-mono font-bold text-slate-700">1. ID FRONT DOCUMENT</span>
                      {idFrontPreview && <span className="text-xs font-mono text-emerald-600 font-semibold">✓ CAPTURED</span>}
                    </div>
                    {idFrontPreview ? (
                      <div className="relative">
                        <img src={idFrontPreview} alt="ID Front" className="w-full h-44 object-cover rounded-xl border border-slate-200" />
                        <button
                          type="button"
                          onClick={() => startCamera('idFront')}
                          className="absolute bottom-3 right-3 bg-slate-900/90 text-white text-xs px-3.5 py-2 rounded-lg font-mono font-medium active:scale-95 transition shadow-md"
                          style={{ touchAction: 'manipulation' }}
                        >
                          🔄 Retake Front
                        </button>
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <button
                          type="button"
                          onClick={() => startCamera('idFront')}
                          className="btn-primary w-full sm:w-auto"
                          style={{ background: '#0F172A' }}
                        >
                          📷 Open Camera: Scan Front
                        </button>
                      </div>
                    )}
                    {errors.idFront && <span className="text-xs text-rose-600 mt-2 block font-medium">{errors.idFront}</span>}
                  </div>

                  {/* ID BACK (conditional) */}
                  {selectedMeta?.requiresBack && (
                    <div className={`scan-box p-4 ${errors.idBack ? 'error' : ''}`}>
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-xs font-mono font-bold text-slate-700">2. ID BACK DOCUMENT</span>
                        {idBackPreview && <span className="text-xs font-mono text-emerald-600 font-semibold">✓ CAPTURED</span>}
                      </div>
                      {idBackPreview ? (
                        <div className="relative">
                          <img src={idBackPreview} alt="ID Back" className="w-full h-44 object-cover rounded-xl border border-slate-200" />
                          <button
                            type="button"
                            onClick={() => startCamera('idBack')}
                            className="absolute bottom-3 right-3 bg-slate-900/90 text-white text-xs px-3.5 py-2 rounded-lg font-mono font-medium active:scale-95 transition shadow-md"
                            style={{ touchAction: 'manipulation' }}
                          >
                            🔄 Retake Back
                          </button>
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <button
                            type="button"
                            onClick={() => startCamera('idBack')}
                            className="btn-primary w-full sm:w-auto"
                            style={{ background: '#0F172A' }}
                          >
                            📷 Open Camera: Scan Back
                          </button>
                        </div>
                      )}
                      {errors.idBack && <span className="text-xs text-rose-600 mt-2 block font-medium">{errors.idBack}</span>}
                    </div>
                  )}

                  {/* FACE SCAN */}
                  <div className={`scan-box p-4 ${errors.face ? 'error' : ''}`}>
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-xs font-mono font-bold text-slate-700">
                        {selectedMeta?.requiresBack ? '3. BIOMETRIC SELFIE' : '2. BIOMETRIC SELFIE'}
                      </span>
                      {facePreview && <span className="text-xs font-mono text-emerald-600 font-semibold">✓ VERIFIED</span>}
                    </div>
                    {facePreview ? (
                      <div className="relative">
                        <img src={facePreview} alt="Face Scan" className="w-full h-52 object-cover rounded-xl border border-slate-200" />
                        <button
                          type="button"
                          onClick={() => startCamera('face')}
                          className="absolute bottom-3 right-3 bg-slate-900/90 text-white text-xs px-3.5 py-2 rounded-lg font-mono font-medium active:scale-95 transition shadow-md"
                          style={{ touchAction: 'manipulation' }}
                        >
                          🔄 Retake Facial Scan
                        </button>
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <button
                          type="button"
                          onClick={() => startCamera('face')}
                          className="btn-primary w-full sm:w-auto"
                        >
                          🛡️ Open Camera: Biometric Scan
                        </button>
                      </div>
                    )}
                    {errors.face && <span className="text-xs text-rose-600 mt-2 block font-medium">{errors.face}</span>}
                  </div>

                  {/* FIX 8: flex-2 → grow (flex-2 is not a Tailwind class) */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
                    <button className="btn-ghost flex-1 sm:flex-none" onClick={() => { setErrors({}); setStep(1) }}>← Back</button>
                    <button className="btn-primary grow sm:flex-none" onClick={() => { if (validateStep2()) setStep(3) }}>
                      Review Disclosures →
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: LEGAL CONSENT ── */}
              {step === 3 && (
                <div className="flex flex-col gap-5 sm:gap-6">
                  <div className="flex flex-col gap-3">
                    <div
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${privacyConsent ? 'border-indigo-600 bg-indigo-50/40' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
                      onClick={() => { setPrivacyConsent(v => !v); setGlobalError('') }}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border ${privacyConsent ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                        {privacyConsent && <span className="text-[10px] font-bold">✓</span>}
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-slate-900 block font-mono uppercase tracking-wide mb-0.5">
                          Data Privacy Act Consent (R.A. 10173)
                        </strong>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          I explicitly consent to LenditBe collecting and processing my live government ID scans and facial biometric frame to verify my identity and prevent identity theft.
                        </p>
                      </div>
                    </div>

                    <div
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${creditConsent ? 'border-indigo-600 bg-indigo-50/40' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
                      onClick={() => { setCreditConsent(v => !v); setGlobalError('') }}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border ${creditConsent ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                        {creditConsent && <span className="text-[10px] font-bold">✓</span>}
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-slate-900 block font-mono uppercase tracking-wide mb-0.5">
                          Credit Inquiry Authorization
                        </strong>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          I authorize LenditBe to conduct background and credit checks through accredited reporting bureaus to establish my allowance tier or debt-to-income capacity.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* FIX 8: flex-2 → grow */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
                    <button className="btn-ghost flex-1 sm:flex-none" disabled={loading} onClick={() => { setGlobalError(''); setStep(2) }}>← Back</button>
                    <button
                      className="btn-primary grow sm:flex-none"
                      disabled={loading || !privacyConsent || !creditConsent}
                      onClick={handleSubmit}
                    >
                      {loading ? 'Securing & Uploading...' : 'Submit Verification 🔒'}
                    </button>
                  </div>
                </div>
              )}

            </div>

            <p className="text-center text-[11px] font-mono text-slate-400 mt-6 pb-8">
              256-BIT TLS ENCRYPTION // HARDWARE-ENFORCED LIVENESS
            </p>

          </div>
        </main>
      </div>
    </>
  )
}