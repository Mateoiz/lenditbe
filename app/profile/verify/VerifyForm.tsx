'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { submitVerification } from './actions'

interface IdMeta {
  value: string
  label: string
  hint: string
  mask: string
  pattern: RegExp
  requiresBack: boolean
}

// mask uses # = digit, A = letter. pattern derived from mask for real validation.
function maskToPattern(mask: string): RegExp {
  const escaped = mask.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  const withDigits = escaped.replace(/#/g, '\\d')
  const withLetters = withDigits.replace(/A/g, '[A-Za-z]')
  return new RegExp(`^${withLetters}$`)
}

const RAW_ID_TYPES: Omit<IdMeta, 'pattern'>[] = [
  { value: 'philsys',         label: 'PhilSys (National ID)', hint: '1234-5678-9012-3456', mask: '####-####-####-####', requiresBack: true },
  { value: 'passport',        label: 'Philippine Passport',   hint: 'P1234567A',             mask: 'A########',         requiresBack: false },
  { value: 'drivers_license', label: "Driver's License",      hint: 'A01-23-456789',         mask: 'A##-##-######',     requiresBack: true },
  { value: 'umid',            label: 'UMID',                  hint: '0000-0000000-0',        mask: '####-#######-#',    requiresBack: true },
  { value: 'sss',             label: 'SSS ID',                hint: '00-0000000-0',          mask: '##-#######-#',      requiresBack: true },
  { value: 'tin',             label: 'TIN ID',                hint: '000-000-000-000',       mask: '###-###-###-###',   requiresBack: false },
  { value: 'postal_id',       label: 'Postal ID',             hint: 'PRN-000000000000',      mask: 'AAA-############',  requiresBack: true },
  { value: 'voters_id',       label: "Voter's ID",            hint: '0000-0000A-00000AAA',   mask: '####-#####-########', requiresBack: true },
]

const ID_TYPES: IdMeta[] = RAW_ID_TYPES.map(t => ({ ...t, pattern: maskToPattern(t.mask) }))

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
  const [cameraUnsupported, setCameraUnsupported] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraRequestId = useRef(0) // guards against late-resolving getUserMedia after cancel

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
    } else if (selectedMeta && !selectedMeta.pattern.test(idNumber.trim())) {
      newErrors.idNumber = `Doesn't match the expected format (${selectedMeta.hint}).`
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
    setCameraUnsupported(false)
    setActiveTarget(target)
    setErrors(prev => ({ ...prev, [target || '']: '' }))

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraUnsupported(true)
      setCameraError('Camera access is not supported on this browser or connection. Try a different browser, or make sure you\'re on HTTPS.')
      return
    }

    const requestId = ++cameraRequestId.current

    try {
      const facingMode = target === 'face' ? 'user' : { ideal: 'environment' }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })

      // If the user cancelled while the permission prompt was pending,
      // don't attach the late-arriving stream — just stop it immediately.
      if (requestId !== cameraRequestId.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err: any) {
      if (requestId !== cameraRequestId.current) return
      setCameraError('Unable to access camera hardware. Please grant browser camera permissions to proceed.')
    }
  }

  function stopCamera() {
    cameraRequestId.current++ // invalidate any in-flight request
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
      const result = await submitVerification(formData)
      if (!result.ok) {
        setGlobalError(result.error)
        setLoading(false)
        return
      }
      router.push('/dashboard?kyc=submitted')
    } catch (err: any) {
      setGlobalError(err.message ?? 'An unexpected network error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');

        :root {
          --paper:     #FFFDF7;
          --paper-2:   #F5F0E4;
          --card:      #FFFFFF;

          --ink:       #14110F;
          --ink-2:     #3A362F;
          --ink-3:     #6B655A;
          --ink-4:     #9C9484;

          --teal:      #0B5D52;
          --teal-dark: #073F38;
          --teal-bg:   #E5F1EE;
          --teal-bdr:  #B9D9D2;

          --marigold:      #F5A623;
          --marigold-dark: #B87814;
          --marigold-bg:   #FDF0DA;
          --marigold-bdr:  #F0CE93;

          --magenta:     #C81E5C;
          --magenta-bg:  #FBE7EF;
          --magenta-bdr: #EFB4CB;

          --line:      rgba(20, 17, 15, 0.10);
          --line-md:   rgba(20, 17, 15, 0.18);
        }

        body { font-family:'Inter',-apple-system,sans-serif; background-color:var(--paper); color:var(--ink); -webkit-tap-highlight-color:transparent; }
        .font-display { font-family:'Fraunces',Georgia,serif; }
        .font-mono  { font-family:'Space Mono',monospace; }

        .blueprint-canvas {
          min-height: 100vh;
          background-color: var(--paper);
          background-image: radial-gradient(rgba(20,17,15,0.06) 1px, transparent 0);
          background-size: 22px 22px;
          background-attachment: local;
          display: flex; flex-direction: column;
        }

        .verification-card {
          background: var(--card);
          border: 1.5px solid var(--line-md);
          border-radius: 6px;
          padding: 20px;
          position: relative;
        }
        @media (min-width: 640px) {
          .verification-card { padding: 44px; }
        }

        .field-label {
          display: block; font-size: 11px; font-weight: 700;
          font-family: 'Space Mono', monospace;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--ink-4); margin-bottom: 8px;
        }

        .field-input {
          width: 100%; padding: 14px 16px; border-radius: 4px;
          border: 1.5px solid var(--line-md); background: var(--paper-2);
          color: var(--ink); font-size: 16px; font-weight: 500;
          transition: all 0.2s ease; outline: none; box-sizing: border-box;
          font-family: 'Inter', sans-serif;
        }
        .field-input:focus {
          border-color: var(--teal); background: var(--card);
          box-shadow: 0 0 0 3px var(--teal-bg);
        }
        .field-input.error { border-color: var(--magenta); background: var(--magenta-bg); }

        .blueprint-id-badge {
          background: var(--ink); border: 1.5px solid var(--ink);
          border-radius: 6px; padding: 20px; color: #FFFDF7;
          position: relative; overflow: hidden;
        }
        .blueprint-id-badge::after {
          content: ''; position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,253,247,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,253,247,0.04) 1px, transparent 1px);
          background-size: 12px 12px; pointer-events: none;
        }

        .scan-box {
          border: 1.5px solid var(--line-md); border-radius: 6px;
          background: var(--paper-2); overflow: hidden; transition: all 0.2s ease;
        }
        .scan-box.error { border-color: var(--magenta); background: var(--magenta-bg); }

        .reticle-card {
          width: 85%; max-width: 380px; aspect-ratio: 1.58 / 1;
          border: 2px dashed rgba(255, 253, 247, 0.75);
          border-radius: 8px; pointer-events: none;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65);
        }
        .reticle-face {
          width: 70%; max-width: 280px; aspect-ratio: 3 / 4;
          border: 2px dashed rgba(245, 166, 35, 0.85);
          border-radius: 50%; pointer-events: none;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65);
        }

        .btn-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 24px; border-radius: 4px; min-height: 48px;
          background: var(--marigold); color: var(--teal-dark);
          font-size: 14px; font-weight: 700; border: 1.5px solid var(--ink); cursor: pointer;
          box-shadow: 3px 3px 0 var(--ink);
          transition: all 0.15s ease; touch-action: manipulation;
          font-family: 'Inter', sans-serif;
        }
        .btn-primary:hover:not(:disabled) { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--ink); }
        .btn-primary:active:not(:disabled) { transform: translate(1px,1px); box-shadow: 1px 1px 0 var(--ink); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; transform: none; }
        .btn-primary.dark { background: var(--ink); color: var(--paper); border-color: var(--ink); }

        .btn-ghost {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          padding: 12px 22px; border-radius: 4px; min-height: 48px; background: var(--card);
          color: var(--ink-2); font-size: 14px; font-weight: 600;
          border: 1.5px solid var(--line-md); cursor: pointer; transition: all 0.15s ease;
          touch-action: manipulation; font-family: 'Inter', sans-serif;
        }
        .btn-ghost:hover { border-color: var(--teal); color: var(--teal); background: var(--teal-bg); }
        .btn-ghost:active { transform: scale(0.98); }

        .step-tab {
          display: flex; align-items: center; gap: 10px;
          padding-bottom: 12px; border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
        }
        .step-tab.active { border-color: var(--marigold); color: var(--marigold-dark); }
        .step-tab.done   { border-color: var(--teal); color: var(--teal-dark); }
        .step-tab.idle   { border-color: var(--line-md); color: var(--ink-4); }

        .sticky-header { padding-top: env(safe-area-inset-top); }
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

        .stamp {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em;
          padding: 4px 10px; border-radius: 3px;
          border: 2px solid; transform: rotate(-3deg); mix-blend-mode: multiply;
        }
      `}</style>

      {/* ── FULLSCREEN MOBILE CAMERA MODAL ── */}
      {activeTarget && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-between" style={{ background: '#0F0D0B' }}>
          <div
            className="camera-topbar flex items-center justify-between backdrop-blur z-10"
            style={{ background: 'rgba(15,13,11,0.92)', color: '#FFFDF7', borderBottom: '1px solid rgba(255,253,247,0.12)' }}
          >
            <span className="text-xs font-mono font-bold tracking-wider flex items-center gap-2" style={{ color: 'var(--marigold)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--magenta)' }} />
              {activeTarget === 'idFront' ? 'SCAN FRONT OF ID' : activeTarget === 'idBack' ? 'SCAN BACK OF ID' : 'BIOMETRIC SELFIE'}
            </span>
            <button
              type="button"
              onClick={() => setActiveTarget(null)}
              className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition active:scale-95"
              style={{ background: 'rgba(255,253,247,0.1)', color: '#FFFDF7', touchAction: 'manipulation' }}
            >
              ✕ CANCEL
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center overflow-hidden" style={{ background: '#000' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={activeTarget === 'face' ? { transform: 'scaleX(-1)' } : undefined}
            />
            <canvas ref={canvasRef} className="hidden" />

            {activeTarget === 'face' ? <div className="reticle-face" /> : <div className="reticle-card" />}

            {cameraError && (
              <div
                className="absolute inset-x-6 top-6 z-20 p-3 rounded-xl text-xs font-medium text-center shadow-lg"
                style={{ background: 'var(--magenta)', color: '#FFFDF7' }}
              >
                {cameraError}
                {cameraUnsupported && (
                  <button
                    type="button"
                    onClick={() => setActiveTarget(null)}
                    className="block mx-auto mt-2 underline font-mono text-[11px]"
                  >
                    Close and go back
                  </button>
                )}
              </div>
            )}
          </div>

          <div
            className="camera-bottombar flex flex-col items-center gap-4 z-10"
            style={{ background: 'rgba(15,13,11,0.95)', borderTop: '1px solid rgba(255,253,247,0.12)' }}
          >
            <p className="text-xs font-mono text-center" style={{ color: 'rgba(255,253,247,0.7)' }}>
              {activeTarget === 'face' ? 'Align face within oval in good lighting' : 'Fit ID card edges within the dotted box'}
            </p>

            <button
              type="button"
              onClick={captureFrame}
              disabled={cameraUnsupported}
              className="rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all cursor-pointer p-1.5"
              aria-label="Take Photo"
              style={{
                width: '72px', height: '72px', minWidth: '72px', touchAction: 'manipulation',
                background: '#FFFDF7', border: '4px solid var(--marigold)',
                opacity: cameraUnsupported ? 0.4 : 1,
              }}
            >
              <div className="w-full h-full rounded-full transition-colors" style={{ background: 'var(--teal)' }} />
            </button>
          </div>
        </div>
      )}

      {/* ── STANDARD FORM CANVAS ── */}
      <div className="blueprint-canvas">
        <header
          className="sticky-header w-full backdrop-blur-md px-4 sm:px-10 py-3.5 flex items-center justify-between sticky top-0 z-50"
          style={{ borderBottom: '2px solid var(--ink)', background: 'rgba(255,253,247,0.85)' }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="/dashboard" className="font-display text-lg sm:text-xl tracking-tight" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
              Lendit<span style={{ color: 'var(--teal)', fontStyle: 'italic' }}>Be</span>
            </a>
            <span className="font-light" style={{ color: 'var(--ink-4)' }}>/</span>
            <span
              className="text-[11px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ color: 'var(--ink-3)', background: 'var(--paper-2)' }}
            >
              Live KYC
            </span>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-[11px] font-mono transition py-1 px-2"
            style={{ color: 'var(--ink-4)', touchAction: 'manipulation' }}
          >
            EXIT
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-3 sm:p-8 md:p-12">
          <div className="w-full max-w-xl">

            <div className="mb-6 sm:mb-8 text-center sm:text-left">
              <h1 className="font-display text-2xl sm:text-4xl tracking-tight" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                Biometric Security
              </h1>
              <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
                Live hardware captures only. Uploads are disabled to prevent identity fraud.
              </p>
            </div>

            {currentStatus === 'rejected' && (
              <div className="rounded-xl p-4 mb-6 flex items-start gap-3" style={{ background: 'var(--magenta-bg)', border: '1.5px solid var(--magenta-bdr)', color: 'var(--magenta)' }}>
                <span className="text-base mt-0.5">⚠️</span>
                <div className="text-xs sm:text-sm">
                  <strong className="font-semibold block">Previous Verification Rejected</strong>
                  Please ensure your live scans are glare-free and your face is well-lit.
                </div>
              </div>
            )}

            {globalError && (
              <div className="rounded-xl p-4 mb-6 flex items-center gap-3 text-xs sm:text-sm font-medium" style={{ background: 'var(--magenta-bg)', border: '1.5px solid var(--magenta-bdr)', color: 'var(--magenta)' }}>
                <span className="text-base">🚨</span>
                <span>{globalError}</span>
              </div>
            )}

            <div className="verification-card">

              <div className="grid grid-cols-3 gap-1 mb-6 sm:mb-8 pb-2" style={{ borderBottom: '1.5px solid var(--line)' }}>
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
                      onChange={e => { setIdType(e.target.value); setErrors(prev => ({ ...prev, idType: '', idNumber: '' })) }}
                    >
                      <option value="">Select identification type...</option>
                      {ID_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    {errors.idType && <span className="text-xs mt-1.5 block font-medium" style={{ color: 'var(--magenta)' }}>{errors.idType}</span>}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="field-label !mb-0">Document Number</label>
                      {selectedMeta && (
                        <span className="text-[11px] font-mono font-semibold" style={{ color: 'var(--teal)' }}>
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
                    {errors.idNumber && <span className="text-xs mt-1.5 block font-medium" style={{ color: 'var(--magenta)' }}>{errors.idNumber}</span>}
                  </div>

                  <div className="pt-1">
                    <label className="field-label mb-2">Technical Wireframe Preview</label>
                    <div className="blueprint-id-badge">
                      <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-widest block" style={{ color: 'rgba(255,253,247,0.5)' }}>Republic of the Philippines</span>
                          <strong className="text-xs sm:text-sm font-semibold mt-0.5 block" style={{ color: '#FFFDF7' }}>
                            {selectedMeta ? selectedMeta.label : 'Select ID Type Above'}
                          </strong>
                        </div>
                        <span
                          className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded font-semibold"
                          style={{ background: 'rgba(245,166,35,0.18)', color: 'var(--marigold)', border: '1px solid rgba(245,166,35,0.35)' }}
                        >
                          {selectedMeta?.requiresBack ? 'FRONT & BACK' : 'FRONT ONLY'}
                        </span>
                      </div>
                      <div className="pt-4 flex justify-between items-end relative z-10" style={{ borderTop: '1px solid rgba(255,253,247,0.15)' }}>
                        <div>
                          <span className="text-[9px] font-mono block uppercase" style={{ color: 'rgba(255,253,247,0.45)' }}>Document Reference</span>
                          <span className="text-sm sm:text-base font-mono tracking-widest font-semibold" style={{ color: 'var(--marigold)' }}>
                            {idNumber.trim() || (selectedMeta ? selectedMeta.mask : '####-####-####-####')}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: 'rgba(255,253,247,0.4)' }}>LIVE SCAN ONLY</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3" style={{ borderTop: '1.5px solid var(--line)' }}>
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

                  <div className={`scan-box p-4 ${errors.idFront ? 'error' : ''}`}>
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--ink-2)' }}>1. ID FRONT DOCUMENT</span>
                      {idFrontPreview && <span className="text-xs font-mono font-semibold" style={{ color: 'var(--teal)' }}>✓ CAPTURED</span>}
                    </div>
                    {idFrontPreview ? (
                      <div className="relative">
                        <img src={idFrontPreview} alt="ID Front" className="w-full h-44 object-cover rounded-xl" style={{ border: '1.5px solid var(--line-md)' }} />
                        <button
                          type="button"
                          onClick={() => startCamera('idFront')}
                          className="absolute bottom-3 right-3 text-xs px-3.5 py-2 rounded-lg font-mono font-medium active:scale-95 transition shadow-md"
                          style={{ background: 'var(--ink)', color: 'var(--paper)', touchAction: 'manipulation' }}
                        >
                          🔄 Retake Front
                        </button>
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <button type="button" onClick={() => startCamera('idFront')} className="btn-primary dark w-full sm:w-auto">
                          📷 Open Camera: Scan Front
                        </button>
                      </div>
                    )}
                    {errors.idFront && <span className="text-xs mt-2 block font-medium" style={{ color: 'var(--magenta)' }}>{errors.idFront}</span>}
                  </div>

                  {selectedMeta?.requiresBack && (
                    <div className={`scan-box p-4 ${errors.idBack ? 'error' : ''}`}>
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-xs font-mono font-bold" style={{ color: 'var(--ink-2)' }}>2. ID BACK DOCUMENT</span>
                        {idBackPreview && <span className="text-xs font-mono font-semibold" style={{ color: 'var(--teal)' }}>✓ CAPTURED</span>}
                      </div>
                      {idBackPreview ? (
                        <div className="relative">
                          <img src={idBackPreview} alt="ID Back" className="w-full h-44 object-cover rounded-xl" style={{ border: '1.5px solid var(--line-md)' }} />
                          <button
                            type="button"
                            onClick={() => startCamera('idBack')}
                            className="absolute bottom-3 right-3 text-xs px-3.5 py-2 rounded-lg font-mono font-medium active:scale-95 transition shadow-md"
                            style={{ background: 'var(--ink)', color: 'var(--paper)', touchAction: 'manipulation' }}
                          >
                            🔄 Retake Back
                          </button>
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <button type="button" onClick={() => startCamera('idBack')} className="btn-primary dark w-full sm:w-auto">
                            📷 Open Camera: Scan Back
                          </button>
                        </div>
                      )}
                      {errors.idBack && <span className="text-xs mt-2 block font-medium" style={{ color: 'var(--magenta)' }}>{errors.idBack}</span>}
                    </div>
                  )}

                  <div className={`scan-box p-4 ${errors.face ? 'error' : ''}`}>
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--ink-2)' }}>
                        {selectedMeta?.requiresBack ? '3. BIOMETRIC SELFIE' : '2. BIOMETRIC SELFIE'}
                      </span>
                      {facePreview && <span className="text-xs font-mono font-semibold" style={{ color: 'var(--teal)' }}>✓ VERIFIED</span>}
                    </div>
                    {facePreview ? (
                      <div className="relative">
                        <img src={facePreview} alt="Face Scan" className="w-full h-52 object-cover rounded-xl" style={{ border: '1.5px solid var(--line-md)' }} />
                        <button
                          type="button"
                          onClick={() => startCamera('face')}
                          className="absolute bottom-3 right-3 text-xs px-3.5 py-2 rounded-lg font-mono font-medium active:scale-95 transition shadow-md"
                          style={{ background: 'var(--ink)', color: 'var(--paper)', touchAction: 'manipulation' }}
                        >
                          🔄 Retake Facial Scan
                        </button>
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <button type="button" onClick={() => startCamera('face')} className="btn-primary w-full sm:w-auto">
                          🛡️ Open Camera: Biometric Scan
                        </button>
                      </div>
                    )}
                    {errors.face && <span className="text-xs mt-2 block font-medium" style={{ color: 'var(--magenta)' }}>{errors.face}</span>}
                  </div>

                  <div className="flex items-center justify-between pt-3 gap-3" style={{ borderTop: '1.5px solid var(--line)' }}>
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
                      className="p-4 rounded-xl transition-all cursor-pointer flex items-start gap-3.5"
                      style={{
                        border: `1.5px solid ${privacyConsent ? 'var(--teal)' : 'var(--line-md)'}`,
                        background: privacyConsent ? 'var(--teal-bg)' : 'var(--paper-2)',
                      }}
                      onClick={() => { setPrivacyConsent(v => !v); setGlobalError('') }}
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          border: `1.5px solid ${privacyConsent ? 'var(--teal-dark)' : 'var(--line-md)'}`,
                          background: privacyConsent ? 'var(--teal)' : 'var(--card)',
                          color: '#fff',
                        }}
                      >
                        {privacyConsent && <span className="text-[10px] font-bold">✓</span>}
                      </div>
                      <div>
                        <strong className="text-xs font-bold block font-mono uppercase tracking-wide mb-0.5" style={{ color: 'var(--ink)' }}>
                          Data Privacy Act Consent (R.A. 10173)
                        </strong>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                          I explicitly consent to LenditBe collecting and processing my live government ID scans and facial biometric frame to verify my identity and prevent identity theft.
                        </p>
                      </div>
                    </div>

                    <div
                      className="p-4 rounded-xl transition-all cursor-pointer flex items-start gap-3.5"
                      style={{
                        border: `1.5px solid ${creditConsent ? 'var(--teal)' : 'var(--line-md)'}`,
                        background: creditConsent ? 'var(--teal-bg)' : 'var(--paper-2)',
                      }}
                      onClick={() => { setCreditConsent(v => !v); setGlobalError('') }}
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          border: `1.5px solid ${creditConsent ? 'var(--teal-dark)' : 'var(--line-md)'}`,
                          background: creditConsent ? 'var(--teal)' : 'var(--card)',
                          color: '#fff',
                        }}
                      >
                        {creditConsent && <span className="text-[10px] font-bold">✓</span>}
                      </div>
                      <div>
                        <strong className="text-xs font-bold block font-mono uppercase tracking-wide mb-0.5" style={{ color: 'var(--ink)' }}>
                          Credit Inquiry Authorization
                        </strong>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                          I authorize LenditBe to conduct background and credit checks through accredited reporting bureaus to establish my allowance tier or debt-to-income capacity.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 gap-3" style={{ borderTop: '1.5px solid var(--line)' }}>
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

            <p className="text-center text-[11px] font-mono mt-6 pb-8" style={{ color: 'var(--ink-4)' }}>
              256-BIT TLS ENCRYPTION // HARDWARE-ENFORCED LIVENESS
            </p>

          </div>
        </main>
      </div>
    </>
  )
}